import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { withAuthEnhanced, AuthenticatedRequest } from '@/middleware/auth-enhanced';
import { ApiError, validateRequiredFields } from '@/lib/api-error';
/**
 * POST /api/admin/passes/request
 * Create a new pass request (can be created by members/parents)
 * 
 * Required: Authenticated user
 * Rate limited: Standard (100 req/15min)
 * 
 * Body: {
 *   type: 'new' | 'renewal',
 *   templateId: string,
 *   memberId: string,
 *   paymentMethod: string,
 *   notes?: string,
 *   currentPassId?: string (for renewal)
 * }
 */
export async function POST(request: NextRequest) {
  return withAuthEnhanced(request, async (_req: AuthenticatedRequest) => {
    const { user } = _req;
    // Parse and validate request body
    const body = await _req.json();
    const { 
      type,
      templateId,
      memberId,
      paymentMethod,
      notes,
      currentPassId
    } = body;
    // Validate required fields
    validateRequiredFields(body, ['type', 'templateId', 'memberId', 'paymentMethod']);
    if (type === 'renewal' && !currentPassId) {
      throw ApiError.badRequest('currentPassId is required for renewal requests');
    }
    const db = getAdminFirestore();
    try {
      // Get member details
      const memberDoc = await db.collection('members').doc(memberId).get();
      if (!memberDoc?.exists) {
        throw ApiError.notFound('Member not found');
      }
      const memberData = memberDoc?.data()!;
      // Check if user can request for this member
      const canRequest = user!.uid === memberData?.userId || 
                        (memberData?.guardianUserIds && memberData?.guardianUserIds.includes(user!.uid));
      if (!canRequest) {
        throw ApiError.forbidden('You can only request passes for yourself or your children');
      }
      // Get template details
      const templateDoc = await db.collection('pass_templates').doc(templateId).get();
      if (!templateDoc?.exists) {
        throw ApiError.notFound('Pass template not found');
      }
      const templateData = templateDoc?.data()!;
      // Check for existing pending request
      const existingRequests = await db.collection('pass_requests')
        .where('memberId', '==', memberId)
        .where('status', '==', 'pending')
        .get();
      if (!existingRequests.empty) {
        throw ApiError.conflict('There is already a pending pass request for this member');
      }
      // Create pass request
      const now = new Date();
      const requestRef = db.collection('pass_requests').doc();
      await requestRef.set({
        id: requestRef.id,
        type,
        templateId,
        templateName: templateData.name,
        memberId,
        memberName: memberData?.name,
        clubId: memberData?.clubId,
        clubName: memberData?.clubName || null,
        // Request info
        requestedBy: user!.uid,
        requestedByName: user!.email || null,
        requestedStartDate: now.toISOString(),
        paymentMethod,
        notes: notes || null,
        // For renewal
        currentPassId: currentPassId || null,
        // Status
        status: 'pending',
        // Metadata
        requestedAt: now.toISOString(),
        createdAt: now.toISOString()
      });
      // Create audit log
      await db.collection('audit_logs').add({
        action: 'CREATE_PASS_REQUEST',
        performedBy: user!.uid,
        performedByRole: user!.role,
        targetType: 'pass_requests',
        targetId: requestRef.id,
        metadata: {
          type,
          templateId,
          memberId,
          memberName: memberData?.name
        },
        timestamp: now.toISOString()
      });
      return NextResponse.json({
        success: true,
        message: 'Pass request created successfully',
        requestId: requestRef.id
      });
    } catch (error: unknown) {
      // Re-throw ApiError instances to be handled by middleware
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal('Failed to create pass request', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
