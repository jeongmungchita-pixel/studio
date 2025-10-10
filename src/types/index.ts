'use client';
// This file is aligned with docs/backend.json

export type Member = {
  id: string;
  name: string;
  dateOfBirth?: string; // ISO 8601 date string
  gender?: 'male' | 'female';
  email?: string;
  phoneNumber?: string;
  clubId: string;
  status: 'active' | 'inactive' | 'pending';
  guardianIds?: string[];
  photoURL?: string;
  activePassId?: string; // ID of the current MemberPass
  classId?: string; // ID of the class the member is enrolled in
};

export type Club = {
  id: string;
  name: string;
  contactName: string;
  contactEmail:string;
  contactPhoneNumber: string;
  location: string;
};

export type Competition = {
  id: string;
  name: string;
  startDate: string; // ISO 8601 date string
  endDate: string; // ISO 8601 date string
  location: string;
  status: 'upcoming' | 'ongoing' | 'completed'; // Not in backend.json, but can be derived
};

export type LevelTest = {
  id: string;
  name: string;
  date: string; // ISO 8601 date string
  location: string;
  status: 'scheduled' | 'completed';
};

export type Attendance = {
  id:string;
  memberId: string;
  clubId: string;
  date: string; // ISO 8601 date string
  status: 'present' | 'absent' | 'excused';
  passId: string;
};

export type MemberPass = {
  id: string;
  memberId: string;
  clubId: string;
  passType: string; // e.g., 'standard', 'premium'
  passName: string; // e.g. 'Standard 5-session pass'
  paymentMethod?: 'bank-transfer' | 'card';
  startDate?: string; // ISO 8601 date string
  endDate?: string; // ISO 8601 date string, optional
  totalSessions?: number; // e.g. 5
  attendableSessions?: number; // e.g. 4
  remainingSessions?: number;
  attendanceCount?: number;
  status: 'active' | 'expired' | 'pending';
};


export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'member' | 'club-admin';
  provider: 'email' | 'google';
  status: 'pending' | 'approved';
  isGuardian?: boolean;
  clubName?: string;
  phoneNumber?: string;
  clubId?: string; // Added for club-admin convenience
};

export type PassTemplate = {
    id: string;
    clubId: string;
    name: string;
    totalSessions?: number;
    attendableSessions?: number;
    durationDays?: number;
    price?: number;
    description?: string;
}

export type GymClass = {
  id: string;
  clubId: string;
  name: string;
  dayOfWeek: '월' | '화' | '수' | '목' | '금' | '토' | '일';
  time: string; // e.g., "14:00"
  capacity: number;
  memberIds: string[];
};

export type MediaItem = {
    id: string;
    memberId: string;
    clubId: string;
    mediaURL: string;
    mediaType: 'image' | 'video';
    caption?: string;
    uploadDate: string; // ISO 8601 date string
};
