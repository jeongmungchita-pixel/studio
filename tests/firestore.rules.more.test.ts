import { beforeAll, afterAll, describe, it } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

let env: RulesTestEnvironment;
const shouldRun = !!process.env.FIRESTORE_EMULATOR_HOST;

if (shouldRun) {
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-test',
      firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });

    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      // Seed basic users and members
      await setDoc(doc(db, 'users', 'normal1'), {
        uid: 'normal1',
        email: 'n1@example.com',
        role: 'MEMBER',
        status: 'active',
      });
      await setDoc(doc(db, 'users', 'admin1'), {
        uid: 'admin1',
        email: 'admin@example.com',
        role: 'SUPER_ADMIN',
        status: 'active',
      });
      await setDoc(doc(db, 'members', 'm1'), {
        id: 'm1',
        name: '멤버1',
        clubId: 'clubA',
        memberCategory: 'adult',
        memberType: 'individual',
        status: 'active',
      });
      // Registration requests
      await setDoc(doc(db, 'adultRegistrationRequests', 'reqA1'), {
        id: 'reqA1',
        requestedBy: 'normal1',
        clubId: 'clubA',
        status: 'pending',
      });
    });
  });
}

if (shouldRun) {
  afterAll(async () => {
    if (env) await env.cleanup();
  });
}

(!shouldRun ? describe.skip : describe)('Firestore rules: sensitive fields', () => {
  it('denies normal user updating sensitive fields on own user doc', async () => {
    const userCtx = env.authenticatedContext('normal1');
    const db = userCtx.firestore();
    const ref = doc(db, 'users', 'normal1');
    // Attempt to update role/status/linkedMemberId should fail
    await assertFails(updateDoc(ref, { role: 'FEDERATION_ADMIN' } as any));
    await assertFails(updateDoc(ref, { status: 'inactive' } as any));
    await assertFails(updateDoc(ref, { linkedMemberId: 'm1' } as any));
  });
});

(!shouldRun ? describe.skip : describe)('Firestore rules: registration requests read', () => {
  it('allows requester to read own adult registration request', async () => {
    const requesterCtx = env.authenticatedContext('normal1');
    const db = requesterCtx.firestore();
    const ref = doc(db, 'adultRegistrationRequests', 'reqA1');
    await assertSucceeds(getDoc(ref));
  });

  it('denies other regular users from reading others\' requests', async () => {
    const otherCtx = env.authenticatedContext('otherUser');
    const db = otherCtx.firestore();
    const ref = doc(db, 'adultRegistrationRequests', 'reqA1');
    await assertFails(getDoc(ref));
  });

  it('allows admin to read any registration request', async () => {
    const adminCtx = env.authenticatedContext('admin1');
    const db = adminCtx.firestore();
    const ref = doc(db, 'adultRegistrationRequests', 'reqA1');
    await assertSucceeds(getDoc(ref));
  });
});
