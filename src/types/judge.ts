// 심사위원 타입 정의
export interface Judge {
  id: string;
  name: string;
  email: string;
  phone?: string;
  // 자격 정보
  licenseNumber: string;
  licenseType: 'national' | 'international' | 'regional';
  licenseExpiryDate: string;
  // 전문 분야
  specializations: string[]; // 기구 종목 ID 배열
  level: 'junior' | 'senior' | 'master';
  // 소속
  organization: string;
  region: string;
  // 상태
  status: 'active' | 'inactive' | 'suspended';
  // 메타데이터
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// 심사위원 배정
export interface JudgeAssignment {
  id: string;
  competitionId: string;
  eventId: string;
  judgeId: string;
  role: 'difficulty' | 'execution' | 'superior' | 'line';
  // 배정 정보
  assignedAt: string;
  assignedBy: string;
  // 상태
  status: 'assigned' | 'confirmed' | 'declined' | 'completed';
  // 평가 정보
  maxAssignments: number; // 최대 배정 가능 수
  currentAssignments: number; // 현재 배정 수
}

// 심사위원 평가
export interface JudgeEvaluation {
  id: string;
  competitionId: string;
  eventId: string;
  judgeId: string;
  // 평가 항목
  accuracy: number; // 정확성 (1-5)
  consistency: number; // 일관성 (1-5)
  professionalism: number; // 전문성 (1-5)
  timeliness: number; // 시간 준수 (1-5)
  // 종합 평가
  overallScore: number;
  comments?: string;
  // 메타데이터
  evaluatedBy: string;
  evaluatedAt: string;
}
