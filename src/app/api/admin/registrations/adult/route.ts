import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
/**
 * POST /api/admin/registrations/adult
 * Create adult registration request
 * This is a public endpoint but requires authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      uid,
      name, 
      birthDate, 
      gender, 
      phoneNumber, 
      email,
      clubId,
      clubName,
      emergencyContact,
      emergencyContactPhone,
      medicalConditions,
      medications
    } = body;
    // Validate required fields
    if (!uid || !name || !birthDate || !gender || !phoneNumber || !clubId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    const db = getAdminFirestore();
    // Check if user already has a pending request
    const existingRequests = await db.collection('adultRegistrationRequests')
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
    const requestRef = db.collection('adultRegistrationRequests').doc();
    const requestData = {
      id: requestRef.id,
      requestedBy: uid,
      name,
      birthDate,
      gender,
      phoneNumber,
      email: email || null,
      clubId,
      clubName: clubName || null,
      emergencyContact: emergencyContact || null,
      emergencyContactPhone: emergencyContactPhone || null,
      medicalConditions: medicalConditions || null,
      medications: medications || null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await requestRef.set(requestData);
    // Update user document to reflect pending status
    const userRef = db.collection('users').doc(uid);
    await userRef.update({
      status: 'pending',
      requestedClubId: clubId,
      requestedClubName: clubName || null,
      registrationRequestId: requestRef.id,
      registrationRequestType: 'adult',
      updatedAt: new Date().toISOString(),
    });
    // Create audit log
    await db.collection('audit_logs').add({
      action: 'CREATE_ADULT_REGISTRATION',
      performedBy: uid,
      targetType: 'adultRegistrationRequests',
      targetId: requestRef.id,
      metadata: {
        requestData,
      },
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({
      success: true,
      message: '성인 회원가입 신청이 제출되었습니다.',
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
