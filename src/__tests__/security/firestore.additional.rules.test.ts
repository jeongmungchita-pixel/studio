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
    // message_history
    await db.collection('message_history').doc('mhA1').set({ clubId: 'clubA', content: 'hello A' });
    await db.collection('message_history').doc('mhB1').set({ clubId: 'clubB', content: 'hello B' });

    // media
    await db.collection('media').doc('mA1').set({ clubId: 'clubA', url: 'gs://bucket/path/a.jpg' });
    await db.collection('media').doc('mB1').set({ clubId: 'clubB', url: 'gs://bucket/path/b.jpg' });

    // classes/gym_classes/pass_templates
    await db.collection('classes').doc('classA1').set({ clubId: 'clubA', name: 'Class A' });
    await db.collection('classes').doc('classB1').set({ clubId: 'clubB', name: 'Class B' });
    await db.collection('gym_classes').doc('gclassA1').set({ clubId: 'clubA', name: 'GClass A' });
    await db.collection('pass_templates').doc('ptA1').set({ clubId: 'clubA', name: 'PT A' });

    // incomes/expenses/budgets
    await db.collection('incomes').doc('incA1').set({ clubId: 'clubA', amount: 100 });
    await db.collection('incomes').doc('incB1').set({ clubId: 'clubB', amount: 200 });
    await db.collection('expenses').doc('expA1').set({ clubId: 'clubA', amount: 50 });
    await db.collection('budgets').doc('budA1').set({ clubId: 'clubA', amount: 1000 });
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'federation-security-tests-2',
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

// message_history tests
describe('message_history access', () => {
  test('staff can read own club history, not others; admin can read all', async () => {
    const dbStaffA = authed('staffA');
    await assertSucceeds(dbStaffA.collection('message_history').doc('mhA1').get());
    await assertFails(dbStaffA.collection('message_history').doc('mhB1').get());

    const dbAdmin = authed('admin');
    await assertSucceeds(dbAdmin.collection('message_history').doc('mhB1').get());
  });

  test('staff can create history for own club only', async () => {
    const dbStaffA = authed('staffA');
    await assertSucceeds(dbStaffA.collection('message_history').doc('newA').set({ clubId: 'clubA', content: 'x' }));
    await assertFails(dbStaffA.collection('message_history').doc('newB').set({ clubId: 'clubB', content: 'y' }));
  });
});

// media tests
describe('media access', () => {
  test('staff can read own club media; admin can read any', async () => {
    const dbStaffA = authed('staffA');
    await assertSucceeds(dbStaffA.collection('media').doc('mA1').get());
    await assertFails(dbStaffA.collection('media').doc('mB1').get());

    const dbAdmin = authed('admin');
    await assertSucceeds(dbAdmin.collection('media').doc('mB1').get());
  });

  test('staff can create media for own club only', async () => {
    const dbStaffA = authed('staffA');
    await assertSucceeds(dbStaffA.collection('media').doc('newA').set({ clubId: 'clubA', url: 'gs://b/newA.jpg' }));
    await assertFails(dbStaffA.collection('media').doc('newB').set({ clubId: 'clubB', url: 'gs://b/newB.jpg' }));
  });
});

// classes/gym_classes/pass_templates tests
describe('classes/gym_classes/pass_templates access', () => {
  test('staff can create only with own clubId; update only same club', async () => {
    const dbStaffA = authed('staffA');
    // create
    await assertSucceeds(dbStaffA.collection('classes').doc('newClassA').set({ clubId: 'clubA', name: 'C-A' }));
    await assertFails(dbStaffA.collection('classes').doc('newClassB').set({ clubId: 'clubB', name: 'C-B' }));

    // update own club
    await assertSucceeds(dbStaffA.collection('classes').doc('classA1').update({ name: 'Class A updated' }));
    // update other club should fail
    await assertFails(dbStaffA.collection('classes').doc('classB1').update({ name: 'Class B updated' }));

    // gym_classes create guard
    await assertSucceeds(dbStaffA.collection('gym_classes').doc('newG').set({ clubId: 'clubA', name: 'G-A' }));
    await assertFails(dbStaffA.collection('gym_classes').doc('newGB').set({ clubId: 'clubB', name: 'G-B' }));

    // pass_templates create guard
    await assertSucceeds(dbStaffA.collection('pass_templates').doc('newPT').set({ clubId: 'clubA', name: 'PT-A' }));
    await assertFails(dbStaffA.collection('pass_templates').doc('newPTB').set({ clubId: 'clubB', name: 'PT-B' }));
  });
});

// incomes/expenses/budgets tests
describe('financial collections access (incomes/expenses/budgets)', () => {
  test('staff can read own club only', async () => {
    const dbStaffA = authed('staffA');
    await assertSucceeds(dbStaffA.collection('incomes').doc('incA1').get());
    await assertFails(dbStaffA.collection('incomes').doc('incB1').get());
  });

  test('staff can create/update their own club only', async () => {
    const dbStaffA = authed('staffA');
    // create
    await assertSucceeds(dbStaffA.collection('incomes').doc('incA2').set({ clubId: 'clubA', amount: 10 }));
    await assertFails(dbStaffA.collection('incomes').doc('incB2').set({ clubId: 'clubB', amount: 10 }));
    // update
    await assertSucceeds(dbStaffA.collection('incomes').doc('incA1').update({ amount: 150 }));
    await assertFails(dbStaffA.collection('expenses').doc('expA1').update({ amount: 60, clubId: 'clubB' }));
    await assertSucceeds(dbStaffA.collection('budgets').doc('budA1').update({ amount: 1100 }));
  });
});
