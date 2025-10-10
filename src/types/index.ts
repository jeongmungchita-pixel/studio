export type Member = {
  id: string;
  name: string;
  avatar: string;
  email: string;
  club: string;
  level: string;
  status: 'active' | 'inactive';
  registrationDate: string;
};

export type Club = {
  id: string;
  name: string;
  location: string;
  coach: string;
  members: number;
  logo: string;
};

export type Competition = {
  id: string;
  name: string;
  date: string;
  location: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  participants: number;
};

export type LevelTest = {
  id: string;
  name: string;
  date: string;
  status: 'scheduled' | 'completed';
  candidates: number;
};

export type Attendance = {
  memberId: string;
  memberName: string;
  date: string;
  status: 'present' | 'absent' | 'excused';
};
