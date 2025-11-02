import { describe, it, expect, vi } from 'vitest';
import { createTestUser, createTestMember, createTestAPIResponse, createTestRegistrationRequest } from '../index';

describe('Test Data Builders Examples', () => {
  it('should create test users with builder pattern', () => {
    const adminUser = createTestUser()
      .withUid('admin-123')
      .withEmail('admin@test.com')
      .withRole('SUPER_ADMIN')
      .withStatus('active')
      .build();

    expect(adminUser.uid).toBe('admin-123');
    expect(adminUser.email).toBe('admin@test.com');
    expect(adminUser.role).toBe('SUPER_ADMIN');
    expect(adminUser.status).toBe('active');
  });

  it('should create test members with builder pattern', () => {
    const childMember = createTestMember()
      .withId('child-456')
      .withName('Child Member')
      .withDateOfBirth('2010-05-15')
      .withGender('female')
      .withClubId('club-789')
      .build();

    expect(childMember.id).toBe('child-456');
    expect(childMember.name).toBe('Child Member');
    expect(childMember.dateOfBirth).toBe('2010-05-15');
    expect(childMember.gender).toBe('female');
    expect(childMember.clubId).toBe('club-789');
  });

  it('should create API responses with builder pattern', () => {
    const successResponse = createTestAPIResponse<{ id: number }>()
      .withData({ id: 123 })
      .withSuccess(true)
      .build();

    expect(successResponse).toEqual({
      data: { id: 123 },
      success: true,
    });

    const errorResponse = createTestAPIResponse()
      .withError('Not found')
      .build();

    expect(errorResponse).toEqual({
      success: false,
      error: 'Not found',
    });
  });

  it('should create registration requests with builder pattern', () => {
    const adultRequest = createTestRegistrationRequest()
      .withId('adult-request-123')
      .withRequestedBy('user-456')
      .withClubId('club-789')
      .withStatus('pending')
      .withAdultData({
        name: 'John Doe',
        birthDate: '1985-03-10',
        gender: 'male',
        phoneNumber: '+1234567890',
        email: 'john@example.com',
      })
      .build();

    expect(adultRequest.id).toBe('adult-request-123');
    expect(adultRequest.name).toBe('John Doe');
    expect(adultRequest.email).toBe('john@example.com');
    expect(adultRequest.status).toBe('pending');
  });
});
