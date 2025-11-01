import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { 
  initializeTestEnvironment, 
  RulesTestEnvironment,
  assertFails,
  assertSucceeds
} from '@firebase/rules-unit-testing';
import { setDoc, doc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { readFileSync } from 'fs';

describe('Comprehensive Firestore Rules Tests', () => {
  let testEnv: RulesTestEnvironment;
  const PROJECT_ID = 'federation-test';
  const RULES_PATH = './firestore.rules';

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(RULES_PATH, 'utf8'),
        host: 'localhost',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('Users Collection Security', () => {
    const userId = 'test-user-123';
    const otherUserId = 'other-user-456';

    beforeEach(async () => {
      // Setup test data
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'users', userId), {
          uid: userId,
          email: 'test@example.com',
          displayName: 'Test User',
          role: 'MEMBER',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        await setDoc(doc(adminDb, 'users', otherUserId), {
          uid: otherUserId,
          email: 'other@example.com',
          displayName: 'Other User',
          role: 'MEMBER',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });

    it('should allow user to read their own profile', async () => {
      const db = testEnv.authenticatedContext(userId).firestore();
      await assertSucceeds(getDoc(doc(db, 'users', userId)));
    });

    it('should prevent user from reading another user profile', async () => {
      const db = testEnv.authenticatedContext(userId).firestore();
      await assertFails(getDoc(doc(db, 'users', otherUserId)));
    });

    it('should prevent user from updating sensitive fields', async () => {
      const db = testEnv.authenticatedContext(userId).firestore();
      
      // Attempt to change role
      await assertFails(
        updateDoc(doc(db, 'users', userId), { role: 'SUPER_ADMIN' })
      );
      
      // Attempt to change status
      await assertFails(
        updateDoc(doc(db, 'users', userId), { status: 'deleted' })
      );
    });

    it('should allow user to update non-sensitive fields', async () => {
      const db = testEnv.authenticatedContext(userId).firestore();
      await assertSucceeds(
        updateDoc(doc(db, 'users', userId), { 
          displayName: 'Updated Name',
          updatedAt: new Date()
        })
      );
    });

    it('should prevent unauthenticated access', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, 'users', userId)));
    });
  });

  describe('Members Collection Security', () => {
    const clubId = 'test-club';
    const memberId = 'member-123';
    const userId = 'user-123';
    const otherUserId = 'user-456';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        
        // Create club owner
        await setDoc(doc(adminDb, 'users', userId), {
          uid: userId,
          role: 'CLUB_OWNER',
          clubId: clubId,
          status: 'active',
        });
        
        // Create regular user
        await setDoc(doc(adminDb, 'users', otherUserId), {
          uid: otherUserId,
          role: 'MEMBER',
          clubId: 'other-club',
          status: 'active',
        });
        
        // Create member
        await setDoc(doc(adminDb, 'members', memberId), {
          id: memberId,
          name: 'Test Member',
          userId: userId,
          clubId: clubId,
          status: 'active',
        });
      });
    });

    it('should allow club owner to read their club members', async () => {
      const db = testEnv.authenticatedContext(userId).firestore();
      await assertSucceeds(getDoc(doc(db, 'members', memberId)));
    });

    it('should prevent non-club member from reading members', async () => {
      const db = testEnv.authenticatedContext(otherUserId).firestore();
      await assertFails(getDoc(doc(db, 'members', memberId)));
    });

    it('should prevent direct member creation', async () => {
      const db = testEnv.authenticatedContext(userId).firestore();
      await assertFails(
        setDoc(doc(db, 'members', 'new-member'), {
          name: 'New Member',
          clubId: clubId,
          userId: userId,
        })
      );
    });

    it('should prevent member deletion', async () => {
      const db = testEnv.authenticatedContext(userId).firestore();
      await assertFails(deleteDoc(doc(db, 'members', memberId)));
    });
  });

  describe('Approval Requests Security', () => {
    const requestId = 'request-123';
    const userId = 'user-123';
    const adminId = 'admin-123';
    const staffId = 'staff-123';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        
        // Create admin user
        await setDoc(doc(adminDb, 'users', adminId), {
          uid: adminId,
          role: 'SUPER_ADMIN',
          status: 'active',
        });
        
        // Create staff user
        await setDoc(doc(adminDb, 'users', staffId), {
          uid: staffId,
          role: 'CLUB_MANAGER',
          clubId: 'test-club',
          status: 'active',
        });
        
        // Create regular user
        await setDoc(doc(adminDb, 'users', userId), {
          uid: userId,
          role: 'MEMBER',
          status: 'active',
        });
        
        // Create approval request
        await setDoc(doc(adminDb, 'clubOwnerRequests', requestId), {
          id: requestId,
          email: 'newowner@example.com',
          name: 'New Owner',
          clubName: 'New Club',
          status: 'pending',
          createdAt: new Date(),
        });
      });
    });

    it('should allow admin to read approval requests', async () => {
      const db = testEnv.authenticatedContext(adminId).firestore();
      await assertSucceeds(getDoc(doc(db, 'clubOwnerRequests', requestId)));
    });

    it('should allow staff to read approval requests', async () => {
      const db = testEnv.authenticatedContext(staffId).firestore();
      await assertSucceeds(getDoc(doc(db, 'clubOwnerRequests', requestId)));
    });

    it('should prevent regular user from reading approval requests', async () => {
      const db = testEnv.authenticatedContext(userId).firestore();
      await assertFails(getDoc(doc(db, 'clubOwnerRequests', requestId)));
    });

    it('should prevent direct status update', async () => {
      const db = testEnv.authenticatedContext(adminId).firestore();
      await assertFails(
        updateDoc(doc(db, 'clubOwnerRequests', requestId), {
          status: 'approved'
        })
      );
    });

    it('should prevent direct deletion', async () => {
      const db = testEnv.authenticatedContext(adminId).firestore();
      await assertFails(deleteDoc(doc(db, 'clubOwnerRequests', requestId)));
    });
  });

  describe('Clubs Collection Security', () => {
    const clubId = 'test-club';
    const ownerId = 'owner-123';
    const managerId = 'manager-123';
    const memberId = 'member-123';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        
        // Create club
        await setDoc(doc(adminDb, 'clubs', clubId), {
          id: clubId,
          name: 'Test Club',
          ownerId: ownerId,
          status: 'active',
        });
        
        // Create owner
        await setDoc(doc(adminDb, 'users', ownerId), {
          uid: ownerId,
          role: 'CLUB_OWNER',
          clubId: clubId,
          status: 'active',
        });
        
        // Create manager
        await setDoc(doc(adminDb, 'users', managerId), {
          uid: managerId,
          role: 'CLUB_MANAGER',
          clubId: clubId,
          status: 'active',
        });
        
        // Create member
        await setDoc(doc(adminDb, 'users', memberId), {
          uid: memberId,
          role: 'MEMBER',
          clubId: clubId,
          status: 'active',
        });
      });
    });

    it('should allow anyone to read club information', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertSucceeds(getDoc(doc(db, 'clubs', clubId)));
    });

    it('should allow owner to update club', async () => {
      const db = testEnv.authenticatedContext(ownerId).firestore();
      await assertSucceeds(
        updateDoc(doc(db, 'clubs', clubId), {
          name: 'Updated Club Name',
          updatedAt: new Date(),
        })
      );
    });

    it('should allow manager to update club', async () => {
      const db = testEnv.authenticatedContext(managerId).firestore();
      await assertSucceeds(
        updateDoc(doc(db, 'clubs', clubId), {
          description: 'Updated description',
          updatedAt: new Date(),
        })
      );
    });

    it('should prevent regular member from updating club', async () => {
      const db = testEnv.authenticatedContext(memberId).firestore();
      await assertFails(
        updateDoc(doc(db, 'clubs', clubId), {
          name: 'Hacked Name',
        })
      );
    });

    it('should prevent direct club creation', async () => {
      const db = testEnv.authenticatedContext(ownerId).firestore();
      await assertFails(
        setDoc(doc(db, 'clubs', 'new-club'), {
          name: 'New Club',
          ownerId: ownerId,
        })
      );
    });

    it('should prevent club deletion', async () => {
      const db = testEnv.authenticatedContext(ownerId).firestore();
      await assertFails(deleteDoc(doc(db, 'clubs', clubId)));
    });
  });

  describe('Financial Data Security', () => {
    const clubId = 'test-club';
    const passId = 'pass-123';
    const ownerId = 'owner-123';
    const memberId = 'member-123';
    const otherUserId = 'other-123';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        
        // Create users
        await setDoc(doc(adminDb, 'users', ownerId), {
          uid: ownerId,
          role: 'CLUB_OWNER',
          clubId: clubId,
          status: 'active',
        });
        
        await setDoc(doc(adminDb, 'users', memberId), {
          uid: memberId,
          role: 'MEMBER',
          clubId: clubId,
          status: 'active',
        });
        
        await setDoc(doc(adminDb, 'users', otherUserId), {
          uid: otherUserId,
          role: 'MEMBER',
          clubId: 'other-club',
          status: 'active',
        });
        
        // Create pass
        await setDoc(doc(adminDb, 'member_passes', passId), {
          id: passId,
          memberId: memberId,
          clubId: clubId,
          passType: 'monthly',
          price: 100000,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
      });
    });

    it('should allow club staff to read passes', async () => {
      const db = testEnv.authenticatedContext(ownerId).firestore();
      await assertSucceeds(getDoc(doc(db, 'member_passes', passId)));
    });

    it('should allow pass owner to read their pass', async () => {
      const db = testEnv.authenticatedContext(memberId).firestore();
      await assertSucceeds(getDoc(doc(db, 'member_passes', passId)));
    });

    it('should prevent other users from reading passes', async () => {
      const db = testEnv.authenticatedContext(otherUserId).firestore();
      await assertFails(getDoc(doc(db, 'member_passes', passId)));
    });

    it('should prevent direct pass creation', async () => {
      const db = testEnv.authenticatedContext(memberId).firestore();
      await assertFails(
        setDoc(doc(db, 'member_passes', 'new-pass'), {
          memberId: memberId,
          clubId: clubId,
          passType: 'monthly',
          price: 50000,
        })
      );
    });

    it('should prevent pass updates', async () => {
      const db = testEnv.authenticatedContext(memberId).firestore();
      await assertFails(
        updateDoc(doc(db, 'member_passes', passId), {
          price: 0,
        })
      );
    });

    it('should prevent pass deletion', async () => {
      const db = testEnv.authenticatedContext(ownerId).firestore();
      await assertFails(deleteDoc(doc(db, 'member_passes', passId)));
    });
  });

  describe('Audit Logs Security', () => {
    const logId = 'log-123';
    const adminId = 'admin-123';
    const userId = 'user-123';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        
        // Create users
        await setDoc(doc(adminDb, 'users', adminId), {
          uid: adminId,
          role: 'SUPER_ADMIN',
          status: 'active',
        });
        
        await setDoc(doc(adminDb, 'users', userId), {
          uid: userId,
          role: 'MEMBER',
          status: 'active',
        });
        
        // Create audit log
        await setDoc(doc(adminDb, 'audit_logs', logId), {
          id: logId,
          action: 'user.created',
          userId: userId,
          timestamp: new Date(),
          metadata: {
            ip: '127.0.0.1',
            userAgent: 'Test Browser',
          },
        });
      });
    });

    it('should allow admin to read audit logs', async () => {
      const db = testEnv.authenticatedContext(adminId).firestore();
      await assertSucceeds(getDoc(doc(db, 'audit_logs', logId)));
    });

    it('should prevent regular user from reading audit logs', async () => {
      const db = testEnv.authenticatedContext(userId).firestore();
      await assertFails(getDoc(doc(db, 'audit_logs', logId)));
    });

    it('should prevent all users from writing audit logs', async () => {
      const db = testEnv.authenticatedContext(adminId).firestore();
      
      await assertFails(
        setDoc(doc(db, 'audit_logs', 'new-log'), {
          action: 'test',
          userId: adminId,
        })
      );
      
      await assertFails(
        updateDoc(doc(db, 'audit_logs', logId), {
          action: 'modified',
        })
      );
      
      await assertFails(deleteDoc(doc(db, 'audit_logs', logId)));
    });
  });
});
