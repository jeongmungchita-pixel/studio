import { mockUser } from '../mocks';

// User Builder
export class UserBuilder {
  private user: Partial<typeof mockUser> = {};

  constructor() {
    this.user = { ...mockUser };
  }

  withUid(uid: string): this {
    this.user.uid = uid;
    return this;
  }

  withEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  withDisplayName(displayName: string): this {
    this.user.displayName = displayName;
    return this;
  }

  withRole(role: string): this {
    this.user.role = role as any;
    return this;
  }

  withStatus(status: string): this {
    this.user.status = status as any;
    return this;
  }

  withClubId(clubId: string): this {
    (this.user as any).clubId = clubId;
    return this;
  }

  build(): typeof mockUser {
    return { ...mockUser, ...this.user };
  }
}

// Member Builder
export class MemberBuilder {
  private member: any = {};

  constructor() {
    this.member = {
      id: 'member-123',
      name: 'Test Member',
      dateOfBirth: '1990-01-01',
      gender: 'male',
      clubId: 'club-456',
      memberCategory: 'adult',
      memberType: 'individual',
      status: 'active',
    };
  }

  withId(id: string): this {
    this.member.id = id;
    return this;
  }

  withName(name: string): this {
    this.member.name = name;
    return this;
  }

  withDateOfBirth(dateOfBirth: string): this {
    this.member.dateOfBirth = dateOfBirth;
    return this;
  }

  withGender(gender: string): this {
    this.member.gender = gender;
    return this;
  }

  withClubId(clubId: string): this {
    this.member.clubId = clubId;
    return this;
  }

  withStatus(status: string): this {
    this.member.status = status;
    return this;
  }

  build(): any {
    return { ...this.member };
  }
}

// API Response Builder
export class APIResponseBuilder<T> {
  private response: {
    data?: T;
    success: boolean;
    error?: string;
  } = { success: true };

  withData(data: T): this {
    this.response.data = data;
    return this;
  }

  withSuccess(success: boolean): this {
    this.response.success = success;
    return this;
  }

  withError(error: string): this {
    this.response.error = error;
    this.response.success = false;
    return this;
  }

  build(): { data: T; success: boolean } | { success: boolean; error: string } {
    if (this.response.error) {
      return { success: false, error: this.response.error };
    }
    return { data: this.response.data!, success: this.response.success };
  }
}

// Registration Request Builder
export class RegistrationRequestBuilder {
  private request: any = {};

  constructor() {
    this.request = {
      id: 'request-123',
      requestedBy: 'user-123',
      clubId: 'club-456',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  withId(id: string): this {
    this.request.id = id;
    return this;
  }

  withRequestedBy(requestedBy: string): this {
    this.request.requestedBy = requestedBy;
    return this;
  }

  withClubId(clubId: string): this {
    this.request.clubId = clubId;
    return this;
  }

  withStatus(status: string): this {
    this.request.status = status;
    return this;
  }

  withAdultData(data: any): this {
    this.request = {
      ...this.request,
      name: data.name,
      birthDate: data.birthDate,
      gender: data.gender,
      phoneNumber: data.phoneNumber,
      email: data.email,
    };
    return this;
  }

  withFamilyData(data: { parents: any[]; children: any[] }): this {
    this.request = {
      ...this.request,
      parents: data.parents,
      children: data.children,
    };
    return this;
  }

  build(): any {
    return { ...this.request };
  }
}

// Export factory functions for easier usage
export const createTestUser = () => new UserBuilder();
export const createTestMember = () => new MemberBuilder();
export const createTestAPIResponse = <T>() => new APIResponseBuilder<T>();
export const createTestRegistrationRequest = () => new RegistrationRequestBuilder();
