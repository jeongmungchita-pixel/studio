'use client';

// ============================================
// 📢 공지사항 & 커뮤니케이션 시스템
// ============================================

export type AnnouncementType = 'general' | 'important' | 'event' | 'emergency';

export type AnnouncementAudience = 'all' | 'members' | 'parents' | 'staff';

export interface Announcement {
  id: string;
  clubId: string;
  title: string;
  content: string;
  type: AnnouncementType;
  targetAudience: AnnouncementAudience;
  isPinned: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  createdByName?: string;
  author?: string;
  attachments?: string[];
  publishedAt?: string;
}
