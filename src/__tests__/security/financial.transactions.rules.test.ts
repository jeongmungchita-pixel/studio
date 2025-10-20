/** @jest-environment node */

import { initializeTestEnvironment, assertSucceeds, assertFails, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import fs from 'fs';
import path from 'path';

let testEnv: RulesTestEnvironment;

const readRules = () => fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');

async function seedUsers() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.collection('users').doc('admin').set({ role: 'SUPER_ADMIN' });
    await db.collection('users').doc('staffA').set({ role: 'CLUB_OWNER', clubId: 'clubA' });
    await db.collection('users').doc('staffB').set({ role: 'COACH', clubId: 'clubB' });
    await db.collection('users').doc('memberA').set({ role: 'MEMBER', clubId: 'clubA' });
  });
}

async function seedData() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.collection('financial_transactions').doc('ftA1').set({ clubId: 'clubA', amount: 100, date: '2024-01-01' });
    await db.collection('financial_transactions').doc('ftB1').set({ clubId: 'clubB', amount: 200, date: '2024-01-02' });
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'federation-security-tests-ft',
    firestore: { rules: readRules() },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedUsers();
  await seedData();
});

function authed(uid: string) {
  return testEnv.authenticatedContext(uid).firestore();
}

describe('financial_transactions access controls', () => {
  test('admin can read any financial transaction', async () => {
    const db = authed('admin');
    await assertSucceeds(db.collection('financial_transactions').doc('ftB1').get());
  });

  test('staff can read own club only', async () => {
    const db = authed('staffA');
    await assertSucceeds(db.collection('financial_transactions').doc('ftA1').get());
    await assertFails(db.collection('financial_transactions').doc('ftB1').get());
  });

  test('staff can create only for their own club', async () => {
    const db = authed('staffA');
    await assertSucceeds(db.collection('financial_transactions').doc('newA').set({ clubId: 'clubA', amount: 10, date: '2024-01-03' }));
    await assertFails(db.collection('financial_transactions').doc('newB').set({ clubId: 'clubB', amount: 10, date: '2024-01-03' }));
  });

  test('staff update: allowed on own doc without clubId change; forbidden to change clubId or update other club doc', async () => {
    const db = authed('staffA');
    await assertSucceeds(db.collection('financial_transactions').doc('ftA1').update({ amount: 150 }));
    await assertFails(db.collection('financial_transactions').doc('ftA1').update({ clubId: 'clubB' }));
    await assertFails(db.collection('financial_transactions').doc('ftB1').update({ amount: 250 }));
  });

  test('staff delete: allowed for own club; forbidden for other clubs; admin can delete any', async () => {
    const dbStaffA = authed('staffA');
    await assertSucceeds(dbStaffA.collection('financial_transactions').doc('ftA1').delete());
    await assertFails(dbStaffA.collection('financial_transactions').doc('ftB1').delete());

    // reset doc for admin delete test
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await db.collection('financial_transactions').doc('ftB1').set({ clubId: 'clubB', amount: 200, date: '2024-01-02' });
    });

    const dbAdmin = authed('admin');
    await assertSucceeds(dbAdmin.collection('financial_transactions').doc('ftB1').delete());
  });
});
