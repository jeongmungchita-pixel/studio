/**
 * Base API client with authentication
 */
import { RequestBody } from '@/types/common';

async function apiRequest(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: RequestBody
) {
  // Get auth instance from firebase
  const { getAuth } = await import('firebase/auth');
  const auth = getAuth();
  // Get the current user's ID token
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated');
  }
  const token = await currentUser.getIdToken();
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.details || 'Request failed');
  }
  return data;
}
/**
 * Admin API client
 */
export const adminAPI = {
  approvals: {
    /**
     * Approve adult registration
     */
    approveAdult: async (requestId: string) => {
      return apiRequest('/api/admin/approvals/adult', 'POST', { requestId });
    },
    /**
     * Approve family registration
     */
    approveFamily: async (requestId: string) => {
      return apiRequest('/api/admin/approvals/family', 'POST', { requestId });
    },
    /**
     * Approve member registration
     */
    approveMember: async (requestId: string) => {
      return apiRequest('/api/admin/approvals/member', 'POST', { requestId });
    },
    /**
     * Reject any registration request
     */
    reject: async (requestId: string, type: 'adult' | 'family' | 'member', reason?: string) => {
      return apiRequest('/api/admin/approvals/reject', 'POST', { requestId, type, reason });
    },
  },
  registrations: {
    /**
     * Submit adult registration (future implementation)
     */
    submitAdult: async (data: RequestBody) => {
      return apiRequest('/api/admin/registrations/adult', 'POST', data);
    },
    /**
     * Submit family registration (future implementation)
     */
    submitFamily: async (data: RequestBody) => {
      return apiRequest('/api/admin/registrations/family', 'POST', data);
    },
  },
  users: {
    /**
     * Update user status (future implementation)
     */
    updateStatus: async (userId: string, status: string) => {
      return apiRequest('/api/admin/users/update-status', 'POST', { userId, status });
    },
    /**
     * Link user to member (future implementation)
     */
    linkMember: async (userId: string, memberId: string) => {
      return apiRequest('/api/admin/users/link-member', 'POST', { userId, memberId });
    },
  },
  passes: {
    /**
     * Request a new pass or renewal
     */
    requestPass: async (data: {
      type: 'new' | 'renewal';
      templateId: string;
      memberId: string;
      paymentMethod: string;
      notes?: string;
      currentPassId?: string;
    }) => {
      return apiRequest('/api/admin/passes/request', 'POST', data);
    },
    /**
     * Approve a pass request
     */
    approve: async (requestId: string) => {
      return apiRequest('/api/admin/passes/approve', 'POST', { requestId });
    },
    /**
     * Reject a pass request
     */
    reject: async (requestId: string, reason: string) => {
      return apiRequest('/api/admin/passes/reject', 'POST', { requestId, reason });
    },
    /**
     * Cancel an active pass
     */
    cancel: async (passId: string, reason: string) => {
      return apiRequest('/api/admin/passes/cancel', 'POST', { passId, reason });
    },
  },
  utils: {
    /**
     * Backfill requested club fields (future implementation)
     */
    backfillRequestedClub: async (dryRun: boolean = true) => {
      return apiRequest('/api/admin/utils/backfill-requested-club', 'POST', { dryRun });
    },
    /**
     * Fix family guardian-child links
     */
    fixFamilyLinks: async (parentUserId: string, dryRun: boolean = true) => {
      return apiRequest('/api/admin/utils/fix-family-links', 'POST', { parentUserId, dryRun });
    },
  },
};
