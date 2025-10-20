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
    await db.collection('users').doc('fed').set({ role: 'FEDERATION_ADMIN' });
    await db.collection('users').doc('staffA').set({ role: 'CLUB_OWNER', clubId: 'clubA' });
    await db.collection('users').doc('staffB').set({ role: 'COACH', clubId: 'clubB' });
    await db.collection('users').doc('memberA').set({ role: 'MEMBER', clubId: 'clubA' });
  });
}

async function seedData() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.collection('payments').doc('payA1').set({ clubId: 'clubA', amount: 1000, createdAt: new Date().toISOString() });
    await db.collection('payments').doc('payB1').set({ clubId: 'clubB', amount: 2000, createdAt: new Date().toISOString() });
    await db.collection('announcements').doc('annA1').set({ clubId: 'clubA', title: 'Hello A' });
    await db.collection('announcements').doc('annB1').set({ clubId: 'clubB', title: 'Hello B' });
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'federation-security-tests',
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

function unauth() {
  return testEnv.unauthenticatedContext().firestore();
}

describe('Firestore security rules - club scoped access', () => {
  test('Admin can read any club payment', async () => {
    const db = authed('admin');
    await assertSucceeds(db.collection('payments').doc('payB1').get());
  });

  test('Club staff can read their own club payments, not others', async () => {
    const db = authed('staffA');
    await assertSucceeds(db.collection('payments').doc('payA1').get());
    await assertFails(db.collection('payments').doc('payB1').get());
  });

  test('Club staff can create payment for their club only', async () => {
    const db = authed('staffA');
    await assertSucceeds(db.collection('payments').doc('newA').set({ clubId: 'clubA', amount: 500 }));
    await assertFails(db.collection('payments').doc('newB').set({ clubId: 'clubB', amount: 500 }));
  });

  test('Member cannot read payments', async () => {
    const db = authed('memberA');
    await assertFails(db.collection('payments').doc('payA1').get());
  });

  test('Announcements are readable only within same club (or admin)', async () => {
    const dbStaffA = authed('staffA');
    await assertSucceeds(dbStaffA.collection('announcements').doc('annA1').get());
    await assertFails(dbStaffA.collection('announcements').doc('annB1').get());

    const dbAdmin = authed('admin');
    await assertSucceeds(dbAdmin.collection('announcements').doc('annB1').get());
  });
});

describe('Firestore security rules - request collections create constraints', () => {
  test('Unauthenticated can create memberRegistrationRequests without approval fields', async () => {
    const db = unauth();
    await assertSucceeds(
      db.collection('memberRegistrationRequests').doc('req1').set({ clubId: 'clubA', name: 'John Doe' })
    );
  });

  test('Create is rejected when approval fields are present', async () => {
    const db = unauth();
    await assertFails(
      db.collection('memberRegistrationRequests').doc('req2').set({ clubId: 'clubA', name: 'Jane', approvedBy: 'x' })
    );
    await assertFails(
      db.collection('memberRegistrationRequests').doc('req3').set({ clubId: 'clubA', name: 'Jane', approvedAt: 'now' })
    );
  });
});
