import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
/**
 * POST /api/admin/registrations/family
 * Create family registration request
 * This is a public endpoint but requires authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      uid,
      clubId,
      clubName,
      parents,
      children,
      externalGuardian
    } = body;
    // Validate required fields
    if (!uid || !clubId || !Array.isArray(parents) || !Array.isArray(children)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    // Validate at least one parent or external guardian
    if (parents.length === 0 && !externalGuardian) {
      return NextResponse.json(
        { error: 'At least one parent or external guardian is required' },
        { status: 400 }
      );
    }
    // Validate children exist
    if (children.length === 0) {
      return NextResponse.json(
        { error: 'At least one child is required for family registration' },
        { status: 400 }
      );
    }
    const db = getAdminFirestore();
    // Check if user already has a pending request
    const existingRequests = await db.collection('familyRegistrationRequests')
      .where('requestedBy', '==', uid)
      .where('status', '==', 'pending')
      .get();
    if (!existingRequests.empty) {
      return NextResponse.json(
        { error: 'You already have a pending registration request' },
        { status: 400 }
      );
    }
    // Create registration request
    const requestRef = db.collection('familyRegistrationRequests').doc();
    const requestData = {
      id: requestRef.id,
      requestedBy: uid,
      clubId,
      clubName: clubName || null,
      parents: parents.map((parent: any) => ({
        name: parent.name,
        birthDate: parent.birthDate,
        gender: parent.gender,
        phoneNumber: parent.phoneNumber,
        email: parent.email || null,
        emergencyContact: parent.emergencyContact || null,
        emergencyContactPhone: parent.emergencyContactPhone || null,
        medicalConditions: parent.medicalConditions || null,
        medications: parent.medications || null,
      })),
      children: children.map((child: any) => ({
        name: child.name,
        birthDate: child.birthDate,
        gender: child.gender,
        grade: child.grade || null,
        medicalConditions: child.medicalConditions || null,
        medications: child.medications || null,
      })),
      externalGuardian: externalGuardian ? {
        name: externalGuardian.name,
        phoneNumber: externalGuardian.phoneNumber,
        relation: externalGuardian.relation || null,
      } : null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await requestRef.set(requestData);
    // Update user document to reflect pending status
    const userRef = db.collection('users').doc(uid);
    await userRef.update({
      status: 'pending',
      role: 'PARENT', // Set role as PARENT for family registration
      requestedClubId: clubId,
      requestedClubName: clubName || null,
      registrationRequestId: requestRef.id,
      registrationRequestType: 'family',
      updatedAt: new Date().toISOString(),
    });
    // Create audit log
    await db.collection('audit_logs').add({
      action: 'CREATE_FAMILY_REGISTRATION',
      performedBy: uid,
      targetType: 'familyRegistrationRequests',
      targetId: requestRef.id,
      metadata: {
        parentCount: parents.length,
        childCount: children.length,
        hasExternalGuardian: !!externalGuardian,
        clubId,
      },
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({
      success: true,
      message: '가족 회원가입 신청이 제출되었습니다.',
      requestId: requestRef.id,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { 
        error: 'Failed to create registration',
        details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) 
      },
      { status: 500 }
    );
  }
}
