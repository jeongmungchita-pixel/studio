'use client';
// This file is aligned with docs/backend.json

export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO 8601 date string
  gender: 'male' | 'female';
  email?: string;
  phoneNumber?: string;
  clubId: string;
  status: 'active' | 'inactive' | 'pending';
  guardianIds?: string[];
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
