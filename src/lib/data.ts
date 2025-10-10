import type { Member, Club, Competition, LevelTest, Attendance } from '@/types';

export const members: Member[] = [
  { id: 'MEM001', name: 'Kim Min-jun', avatar: 'https://picsum.photos/seed/m1/40/40', email: 'minjun.kim@example.com', club: 'Seoul Gymnastics Club', level: 'Level 5', status: 'active', registrationDate: '2023-01-15' },
  { id: 'MEM002', name: 'Lee Seo-yeon', avatar: 'https://picsum.photos/seed/m2/40/40', email: 'seoyeon.lee@example.com', club: 'Busan Acro', level: 'Level 4', status: 'active', registrationDate: '2023-02-20' },
  { id: 'MEM003', name: 'Park Ji-hoon', avatar: 'https://picsum.photos/seed/m3/40/40', email: 'jihoon.park@example.com', club: 'Incheon Tumblers', level: 'Level 6', status: 'inactive', registrationDate: '2022-11-10' },
  { id: 'MEM004', name: 'Choi Soo-min', avatar: 'https://picsum.photos/seed/m4/40/40', email: 'soomin.choi@example.com', club: 'Seoul Gymnastics Club', level: 'Level 5', status: 'active', registrationDate: '2023-03-05' },
  { id: 'MEM005', name: 'Yoon Ha-eun', avatar: 'https://picsum.photos/seed/m5/40/40', email: 'haeun.yoon@example.com', club: 'Daegu Stars', level: 'Level 7', status: 'active', registrationDate: '2023-05-01' },
];

export const clubs: Club[] = [
  { id: 'CLUB01', name: 'Seoul Gymnastics Club', location: 'Seoul', coach: 'Kim Young-chul', members: 120, logo: 'https://picsum.photos/seed/c1/80/80' },
  { id: 'CLUB02', name: 'Busan Acro', location: 'Busan', coach: 'Lee Min-ho', members: 85, logo: 'https://picsum.photos/seed/c2/80/80' },
  { id: 'CLUB03', name: 'Incheon Tumblers', location: 'Incheon', coach: 'Park Seo-joon', members: 60, logo: 'https://picsum.photos/seed/c3/80/80' },
  { id: 'CLUB04', name: 'Daegu Stars', location: 'Daegu', coach: 'Choi Woo-shik', members: 95, logo: 'https://picsum.photos/seed/c4/80/80' },
];

export const competitions: Competition[] = [
  { id: 'COMP01', name: 'National Youth Championship', date: '2024-08-15', location: 'Seoul Olympic Park', status: 'upcoming', participants: 250 },
  { id: 'COMP02', name: 'Summer Rhythmic Open', date: '2024-07-20', location: 'Busan Sajik Arena', status: 'upcoming', participants: 180 },
  { id: 'COMP03', name: 'Spring Acrobatic Festival', date: '2024-05-10', location: 'Incheon Samsan World Gymnasium', status: 'completed', participants: 320 },
];

export const levelTests: LevelTest[] = [
  { id: 'LT01', name: 'Level 4-5 Assessment', date: '2024-09-01', status: 'scheduled', candidates: 75 },
  { id: 'LT02', name: 'Level 6-7 Certification', date: '2024-09-15', status: 'scheduled', candidates: 40 },
  { id: 'LT03', name: 'Level 1-3 Evaluation', date: '2024-06-25', status: 'completed', candidates: 120 },
];

export const attendanceRecords: Attendance[] = [
    { memberId: 'MEM001', memberName: 'Kim Min-jun', date: '2024-07-20', status: 'present'},
    { memberId: 'MEM004', memberName: 'Choi Soo-min', date: '2024-07-20', status: 'present'},
    { memberId: 'MEM002', memberName: 'Lee Seo-yeon', date: '2024-07-20', status: 'absent'},
];
