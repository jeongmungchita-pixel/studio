import type { Member, Club, Competition, LevelTest, Attendance } from '@/types';

export const members: Member[] = [
  { id: 'MEM001', name: '김민준', avatar: 'https://picsum.photos/seed/m1/40/40', email: 'minjun.kim@example.com', club: '서울 체조 클럽', level: '레벨 5', status: 'active', registrationDate: '2023-01-15' },
  { id: 'MEM002', name: '이서연', avatar: 'https://picsum.photos/seed/m2/40/40', email: 'seoyeon.lee@example.com', club: '부산 아크로', level: '레벨 4', status: 'active', registrationDate: '2023-02-20' },
  { id: 'MEM003', name: '박지훈', avatar: 'https://picsum.photos/seed/m3/40/40', email: 'jihoon.park@example.com', club: '인천 텀블러', level: '레벨 6', status: 'inactive', registrationDate: '2022-11-10' },
  { id: 'MEM004', name: '최수민', avatar: 'https://picsum.photos/seed/m4/40/40', email: 'soomin.choi@example.com', club: '서울 체조 클럽', level: '레벨 5', status: 'active', registrationDate: '2023-03-05' },
  { id: 'MEM005', name: '윤하은', avatar: 'https://picsum.photos/seed/m5/40/40', email: 'haeun.yoon@example.com', club: '대구 스타즈', level: '레벨 7', status: 'active', registrationDate: '2023-05-01' },
];

export const clubs: Club[] = [
  { id: 'CLUB01', name: '서울 체조 클럽', location: '서울', coach: '김영철', members: 120, logo: 'https://picsum.photos/seed/c1/80/80' },
  { id: 'CLUB02', name: '부산 아크로', location: '부산', coach: '이민호', members: 85, logo: 'https://picsum.photos/seed/c2/80/80' },
  { id: 'CLUB03', name: '인천 텀블러', location: '인천', coach: '박서준', members: 60, logo: 'https://picsum.photos/seed/c3/80/80' },
  { id: 'CLUB04', name: '대구 스타즈', location: '대구', coach: '최우식', members: 95, logo: 'https://picsum.photos/seed/c4/80/80' },
];

export const competitions: Competition[] = [
  { id: 'COMP01', name: '전국 유소년 선수권 대회', date: '2024-08-15', location: '서울 올림픽 공원', status: 'upcoming', participants: 250 },
  { id: 'COMP02', name: '여름 리듬체조 오픈', date: '2024-07-20', location: '부산 사직 아레나', status: 'upcoming', participants: 180 },
  { id: 'COMP03', name: '봄 아크로바틱 페스티벌', date: '2024-05-10', location: '인천 삼산월드체육관', status: 'completed', participants: 320 },
];

export const levelTests: LevelTest[] = [
  { id: 'LT01', name: '레벨 4-5 평가', date: '2024-09-01', status: 'scheduled', candidates: 75 },
  { id: 'LT02', name: '레벨 6-7 인증', date: '2024-09-15', status: 'scheduled', candidates: 40 },
  { id: 'LT03', name: '레벨 1-3 평가', date: '2024-06-25', status: 'completed', candidates: 120 },
];

export const attendanceRecords: Attendance[] = [
    { memberId: 'MEM001', memberName: '김민준', date: '2024-07-20', status: 'present'},
    { memberId: 'MEM004', memberName: '최수민', date: '2024-07-20', status: 'present'},
    { memberId: 'MEM002', memberName: '이서연', date: '2024-07-20', status: 'absent'},
];
