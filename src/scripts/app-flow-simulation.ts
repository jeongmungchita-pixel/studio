/**
 * 앱 데이터 흐름 시뮬레이션
 * 실제 사용자 시나리오를 기반으로 데이터 흐름을 테스트합니다.
 */

import { UserRole } from '@/types/auth';

interface SimulationUser {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  clubId?: string;
  status: 'active' | 'pending' | 'suspended';
}

interface SimulationStep {
  step: number;
  action: string;
  user: string;
  expected: string;
  result?: 'success' | 'fail' | 'pending';
  details?: string;
  timing?: number;
}

interface SimulationScenario {
  name: string;
  description: string;
  users: SimulationUser[];
  steps: SimulationStep[];
}

class AppFlowSimulator {
  private scenarios: SimulationScenario[] = [];
  private results: { [scenarioName: string]: SimulationStep[] } = {};

  constructor() {
    this.initializeScenarios();
  }

  private initializeScenarios() {
    // 시나리오 1: 신규 사용자 온보딩
    this.scenarios.push({
      name: '신규 사용자 온보딩',
      description: '새로운 사용자가 가입부터 클럽 승인까지의 전체 흐름',
      users: [
        {
          uid: 'new-user-001',
          email: 'newuser@test.com',
          role: UserRole.MEMBER,
          displayName: '신규 사용자',
          status: 'pending'
        }
      ],
      steps: [
        { step: 1, action: '회원가입', user: 'new-user-001', expected: '계정 생성 및 이메일 인증' },
        { step: 2, action: '프로필 작성', user: 'new-user-001', expected: '기본 정보 입력 완료' },
        { step: 3, action: '클럽 선택', user: 'new-user-001', expected: '클럽 가입 신청' },
        { step: 4, action: '승인 대기', user: 'new-user-001', expected: '대기 상태로 전환' },
        { step: 5, action: '클럽 승인', user: 'club-owner', expected: '활성 회원으로 전환' }
      ]
    });

    // 시나리오 2: 실시간 데이터 동기화
    this.scenarios.push({
      name: '실시간 데이터 동기화',
      description: '여러 사용자 간 실시간 데이터 동기화 테스트',
      users: [
        {
          uid: 'coach-001',
          email: 'coach@test.com',
          role: UserRole.HEAD_COACH,
          displayName: '수석 코치',
          clubId: 'club-001',
          status: 'active'
        },
        {
          uid: 'member-001',
          email: 'member@test.com',
          role: UserRole.MEMBER,
          displayName: '회원',
          clubId: 'club-001',
          status: 'active'
        }
      ],
      steps: [
        { step: 1, action: '출석 체크', user: 'coach-001', expected: '출석 데이터 생성' },
        { step: 2, action: '실시간 동기화', user: 'member-001', expected: '출석 상태 즉시 반영' },
        { step: 3, action: '공지사항 작성', user: 'coach-001', expected: '공지사항 발행' },
        { step: 4, action: '알림 수신', user: 'member-001', expected: '푸시 알림 수신' }
      ]
    });

    // 시나리오 3: 권한 기반 접근 제어
    this.scenarios.push({
      name: '권한 기반 접근 제어',
      description: '역할별 권한 제어 및 보안 테스트',
      users: [
        {
          uid: 'super-admin',
          email: 'admin@test.com',
          role: UserRole.SUPER_ADMIN,
          displayName: '슈퍼 관리자',
          status: 'active'
        },
        {
          uid: 'club-owner',
          email: 'owner@test.com',
          role: UserRole.CLUB_OWNER,
          displayName: '클럽 오너',
          clubId: 'club-001',
          status: 'active'
        },
        {
          uid: 'member-002',
          email: 'member2@test.com',
          role: UserRole.MEMBER,
          displayName: '일반 회원',
          clubId: 'club-001',
          status: 'active'
        }
      ],
      steps: [
        { step: 1, action: '관리자 페이지 접근', user: 'super-admin', expected: '전체 접근 허용' },
        { step: 2, action: '클럽 관리 접근', user: 'club-owner', expected: '자신의 클럽만 접근' },
        { step: 3, action: '관리자 페이지 접근 시도', user: 'member-002', expected: '접근 거부' },
        { step: 4, action: '권한 상승 시도', user: 'member-002', expected: '보안 이벤트 로깅' }
      ]
    });

    // 시나리오 4: 성능 및 캐싱
    this.scenarios.push({
      name: '성능 및 캐싱',
      description: '캐싱 시스템 및 성능 최적화 테스트',
      users: [
        {
          uid: 'test-user',
          email: 'test@test.com',
          role: UserRole.MEMBER,
          displayName: '테스트 사용자',
          clubId: 'club-001',
          status: 'active'
        }
      ],
      steps: [
        { step: 1, action: '첫 번째 데이터 로드', user: 'test-user', expected: '서버에서 데이터 가져오기' },
        { step: 2, action: '두 번째 데이터 로드', user: 'test-user', expected: '캐시에서 즉시 로드' },
        { step: 3, action: '데이터 업데이트', user: 'test-user', expected: '낙관적 업데이트' },
        { step: 4, action: '캐시 무효화', user: 'test-user', expected: '최신 데이터 반영' }
      ]
    });
  }

  async runSimulation(scenarioName?: string): Promise<void> {
    console.log('🚀 앱 데이터 흐름 시뮬레이션 시작');
    console.log('=' .repeat(50));

    const scenariosToRun = scenarioName 
      ? this.scenarios.filter(s => s.name === scenarioName)
      : this.scenarios;

    for (const scenario of scenariosToRun) {
      await this.runScenario(scenario);
    }

    this.generateReport();
  }

  private async runScenario(scenario: SimulationScenario): Promise<void> {
    console.log(`\n📋 시나리오: ${scenario.name}`);
    console.log(`📝 설명: ${scenario.description}`);
    console.log(`👥 참여자: ${scenario.users.length}명`);
    console.log('-'.repeat(40));

    const results: SimulationStep[] = [];

    for (const step of scenario.steps) {
      const startTime = Date.now();
      
      console.log(`\n${step.step}. ${step.action} (${step.user})`);
      console.log(`   예상: ${step.expected}`);

      // 실제 시뮬레이션 로직
      const result = await this.simulateStep(step, scenario.users);
      
      const endTime = Date.now();
      const timing = endTime - startTime;

      const stepResult: SimulationStep = {
        ...step,
        result: result.success ? 'success' : 'fail',
        details: result.details,
        timing
      };

      results.push(stepResult);

      const status = result.success ? '✅' : '❌';
      console.log(`   결과: ${status} ${result.details} (${timing}ms)`);

      // 단계 간 지연
      await this.delay(100);
    }

    this.results[scenario.name] = results;
  }

  private async simulateStep(
    step: SimulationStep, 
    users: SimulationUser[]
  ): Promise<{ success: boolean; details: string }> {
    
    const user = users.find(u => u.uid === step.user || u.displayName.includes(step.user));
    
    // 실제 시뮬레이션 로직
    switch (step.action) {
      case '회원가입':
        return this.simulateSignup(user);
      
      case '프로필 작성':
        return this.simulateProfileUpdate(user);
      
      case '클럽 선택':
        return this.simulateClubSelection(user);
      
      case '출석 체크':
        return this.simulateAttendance(user);
      
      case '실시간 동기화':
        return this.simulateRealtimeSync(user);
      
      case '관리자 페이지 접근':
      case '클럽 관리 접근':
        return this.simulateAccessControl(user, step.action);
      
      case '관리자 페이지 접근 시도':
        return this.simulateUnauthorizedAccess(user);
      
      case '첫 번째 데이터 로드':
        return this.simulateDataLoad(user, false);
      
      case '두 번째 데이터 로드':
        return this.simulateDataLoad(user, true);
      
      case '데이터 업데이트':
        return this.simulateOptimisticUpdate(user);
      
      default:
        return { success: true, details: '시뮬레이션 완료' };
    }
  }

  private async simulateSignup(user?: SimulationUser): Promise<{ success: boolean; details: string }> {
    if (!user) return { success: false, details: '사용자 정보 없음' };
    
    // Firebase Auth 시뮬레이션
    await this.delay(200);
    return { success: true, details: `계정 생성 완료 (${user.email})` };
  }

  private async simulateProfileUpdate(user?: SimulationUser): Promise<{ success: boolean; details: string }> {
    if (!user) return { success: false, details: '사용자 정보 없음' };
    
    // Firestore 업데이트 시뮬레이션
    await this.delay(150);
    return { success: true, details: '프로필 업데이트 완료' };
  }

  private async simulateClubSelection(user?: SimulationUser): Promise<{ success: boolean; details: string }> {
    if (!user) return { success: false, details: '사용자 정보 없음' };
    
    await this.delay(100);
    return { success: true, details: '클럽 가입 신청 완료' };
  }

  private async simulateAttendance(user?: SimulationUser): Promise<{ success: boolean; details: string }> {
    if (!user) return { success: false, details: '사용자 정보 없음' };
    
    if (user.role !== UserRole.HEAD_COACH && user.role !== UserRole.ASSISTANT_COACH) {
      return { success: false, details: '권한 없음 - 코치만 출석 체크 가능' };
    }
    
    await this.delay(120);
    return { success: true, details: '출석 데이터 생성 완료' };
  }

  private async simulateRealtimeSync(user?: SimulationUser): Promise<{ success: boolean; details: string }> {
    if (!user) return { success: false, details: '사용자 정보 없음' };
    
    // 실시간 동기화 시뮬레이션 (매우 빠름)
    await this.delay(50);
    return { success: true, details: '실시간 데이터 동기화 완료' };
  }

  private async simulateAccessControl(
    user?: SimulationUser, 
    action?: string
  ): Promise<{ success: boolean; details: string }> {
    if (!user) return { success: false, details: '사용자 정보 없음' };
    
    await this.delay(80);
    
    if (action === '관리자 페이지 접근') {
      if (user.role === UserRole.SUPER_ADMIN) {
        return { success: true, details: '슈퍼 관리자 접근 허용' };
      }
      return { success: false, details: '권한 부족' };
    }
    
    if (action === '클럽 관리 접근') {
      if (user.role === UserRole.CLUB_OWNER || user.role === UserRole.CLUB_MANAGER) {
        return { success: true, details: '클럽 관리 접근 허용' };
      }
      return { success: false, details: '클럽 관리 권한 없음' };
    }
    
    return { success: false, details: '알 수 없는 접근 요청' };
  }

  private async simulateUnauthorizedAccess(user?: SimulationUser): Promise<{ success: boolean; details: string }> {
    if (!user) return { success: false, details: '사용자 정보 없음' };
    
    await this.delay(100);
    
    // 보안 이벤트 로깅 시뮬레이션
    console.log(`   🚨 보안 이벤트: ${user.displayName}이 관리자 페이지 접근 시도`);
    
    return { success: false, details: '접근 거부 - 보안 이벤트 기록됨' };
  }

  private async simulateDataLoad(
    user?: SimulationUser, 
    fromCache: boolean = false
  ): Promise<{ success: boolean; details: string }> {
    if (!user) return { success: false, details: '사용자 정보 없음' };
    
    if (fromCache) {
      await this.delay(20); // 캐시에서 매우 빠르게
      return { success: true, details: '캐시에서 즉시 로드 (20ms)' };
    } else {
      await this.delay(300); // 서버에서 상대적으로 느리게
      return { success: true, details: '서버에서 데이터 로드 (300ms)' };
    }
  }

  private async simulateOptimisticUpdate(user?: SimulationUser): Promise<{ success: boolean; details: string }> {
    if (!user) return { success: false, details: '사용자 정보 없음' };
    
    // 낙관적 업데이트 - UI 즉시 반영
    console.log(`   ⚡ UI 즉시 업데이트`);
    await this.delay(10);
    
    // 서버 동기화
    await this.delay(150);
    
    return { success: true, details: '낙관적 업데이트 완료 (UI: 10ms, 서버: 150ms)' };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 시뮬레이션 결과 보고서');
    console.log('='.repeat(50));

    let totalSteps = 0;
    let successSteps = 0;
    let totalTime = 0;

    for (const [scenarioName, steps] of Object.entries(this.results)) {
      console.log(`\n📋 ${scenarioName}`);
      console.log('-'.repeat(30));

      const scenarioSuccess = steps.filter(s => s.result === 'success').length;
      const scenarioTotal = steps.length;
      const scenarioTime = steps.reduce((sum, s) => sum + (s.timing || 0), 0);

      console.log(`✅ 성공: ${scenarioSuccess}/${scenarioTotal} (${Math.round(scenarioSuccess/scenarioTotal*100)}%)`);
      console.log(`⏱️  총 시간: ${scenarioTime}ms`);
      console.log(`⚡ 평균 응답: ${Math.round(scenarioTime/scenarioTotal)}ms`);

      // 실패한 단계들
      const failedSteps = steps.filter(s => s.result === 'fail');
      if (failedSteps.length > 0) {
        console.log(`❌ 실패한 단계:`);
        failedSteps.forEach(step => {
          console.log(`   ${step.step}. ${step.action}: ${step.details}`);
        });
      }

      totalSteps += scenarioTotal;
      successSteps += scenarioSuccess;
      totalTime += scenarioTime;
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎯 전체 요약');
    console.log('='.repeat(50));
    console.log(`📊 전체 성공률: ${successSteps}/${totalSteps} (${Math.round(successSteps/totalSteps*100)}%)`);
    console.log(`⏱️  전체 실행 시간: ${totalTime}ms`);
    console.log(`⚡ 전체 평균 응답: ${Math.round(totalTime/totalSteps)}ms`);
    console.log(`🚀 시나리오 수: ${Object.keys(this.results).length}개`);

    // 성능 분석
    console.log('\n📈 성능 분석');
    console.log('-'.repeat(20));
    
    const allSteps = Object.values(this.results).flat();
    const fastSteps = allSteps.filter(s => (s.timing || 0) < 100);
    const slowSteps = allSteps.filter(s => (s.timing || 0) > 200);
    
    console.log(`⚡ 빠른 응답 (< 100ms): ${fastSteps.length}개`);
    console.log(`🐌 느린 응답 (> 200ms): ${slowSteps.length}개`);
    
    if (slowSteps.length > 0) {
      console.log(`   느린 단계들:`);
      slowSteps.forEach(step => {
        console.log(`   - ${step.action}: ${step.timing}ms`);
      });
    }
  }

  // 특정 시나리오만 실행
  async runScenarioByName(name: string): Promise<void> {
    await this.runSimulation(name);
  }

  // 모든 시나리오 목록 조회
  getScenarios(): string[] {
    return this.scenarios.map(s => s.name);
  }
}

// 실행 함수
export async function runAppFlowSimulation(scenarioName?: string): Promise<void> {
  const simulator = new AppFlowSimulator();
  await simulator.runSimulation(scenarioName);
}

// 특정 시나리오 실행
export async function runSpecificScenario(scenarioName: string): Promise<void> {
  const simulator = new AppFlowSimulator();
  await simulator.runScenarioByName(scenarioName);
}

// 시나리오 목록 조회
export function getAvailableScenarios(): string[] {
  const simulator = new AppFlowSimulator();
  return simulator.getScenarios();
}

// 브라우저에서 실행 가능한 버전
if (typeof window !== 'undefined') {
  (window as any).runAppFlowSimulation = runAppFlowSimulation;
  (window as any).runSpecificScenario = runSpecificScenario;
  (window as any).getAvailableScenarios = getAvailableScenarios;
}
