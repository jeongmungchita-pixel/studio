#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// ============================================
// 🔗 통합 연동 상태 체크 스크립트
// ============================================

class IntegrationTester {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.srcPath = path.join(this.projectRoot, 'src');
    this.results = {
      authentication: {},
      dataFlow: {},
      buttonFunctionality: {},
      roleBasedAccess: {},
      apiConnections: {}
    };
  }

  async runFullIntegrationTest() {
    console.log('🔗 Starting comprehensive integration test...\n');
    
    await this.checkAuthentication();
    await this.checkDataFlow();
    await this.checkButtonFunctionality();
    await this.checkRoleBasedAccess();
    await this.checkApiConnections();
    
    this.generateReport();
  }

  async checkAuthentication() {
    console.log('🔐 Checking authentication integration...');
    
    try {
      // Firebase 설정 확인
      const firebaseConfigPath = path.join(this.srcPath, 'firebase/config.ts');
      const configExists = fs.existsSync(firebaseConfigPath);
      this.results.authentication.configExists = configExists;
      
      if (configExists) {
        const configContent = fs.readFileSync(firebaseConfigPath, 'utf8');
        this.results.authentication.hasApiKey = configContent.includes('apiKey');
        this.results.authentication.hasAuthDomain = configContent.includes('authDomain');
        this.results.authentication.hasProjectId = configContent.includes('projectId');
      }

      // useUser 훅 확인
      const useUserPath = path.join(this.srcPath, 'hooks/use-user.tsx');
      const useUserExists = fs.existsSync(useUserPath);
      this.results.authentication.useUserHookExists = useUserExists;
      
      if (useUserExists) {
        const useUserContent = fs.readFileSync(useUserPath, 'utf8');
        this.results.authentication.hasAuthStateChanged = useUserContent.includes('onAuthStateChanged');
        this.results.authentication.hasUserProfile = useUserContent.includes('UserProfile');
        this.results.authentication.hasRoleCheck = useUserContent.includes('UserRole');
      }

      // 인증 관련 페이지들 확인
      const loginPagePath = path.join(this.srcPath, 'app/login/page.tsx');
      this.results.authentication.loginPageExists = fs.existsSync(loginPagePath);
      
      const registerPagePath = path.join(this.srcPath, 'app/register');
      this.results.authentication.registerPagesExist = fs.existsSync(registerPagePath);

    } catch (error) {
      this.results.authentication.error = error.message;
    }
  }

  async checkDataFlow() {
    console.log('📊 Checking data flow integration...');
    
    try {
      // Firestore 연결 확인
      const firestorePath = path.join(this.srcPath, 'firebase/index.ts');
      const firestoreContent = fs.readFileSync(firestorePath, 'utf8');
      
      this.results.dataFlow.hasFirestore = firestoreContent.includes('getFirestore');
      this.results.dataFlow.hasCollectionHooks = firestoreContent.includes('useCollection');
      
      // 데이터 타입 정의 확인
      const typesPath = path.join(this.srcPath, 'types');
      const typeFiles = fs.readdirSync(typesPath).filter(f => f.endsWith('.ts'));
      this.results.dataFlow.typeDefinitions = typeFiles.length;
      
      // 주요 컬렉션 사용 확인
      const collections = ['users', 'clubs', 'members', 'competitions'];
      this.results.dataFlow.collectionsUsed = [];
      
      for (const collection of collections) {
        const { stdout } = await execAsync(`grep -r "${collection}" ${this.srcPath} --include="*.tsx" --include="*.ts" | wc -l`);
        const count = parseInt(stdout.trim());
        if (count > 0) {
          this.results.dataFlow.collectionsUsed.push(collection);
        }
      }

    } catch (error) {
      this.results.dataFlow.error = error.message;
    }
  }

  async checkButtonFunctionality() {
    console.log('🔘 Checking button functionality...');
    
    try {
      // 버튼 컴포넌트 확인
      const buttonPath = path.join(this.srcPath, 'components/ui/button.tsx');
      const buttonExists = fs.existsSync(buttonPath);
      this.results.buttonFunctionality.buttonComponentExists = buttonExists;
      
      // onClick 핸들러 사용량 확인
      const { stdout: onClickCount } = await execAsync(`grep -r "onClick" ${this.srcPath} --include="*.tsx" | wc -l`);
      this.results.buttonFunctionality.onClickHandlers = parseInt(onClickCount.trim());
      
      // 폼 제출 핸들러 확인
      const { stdout: onSubmitCount } = await execAsync(`grep -r "onSubmit" ${this.srcPath} --include="*.tsx" | wc -l`);
      this.results.buttonFunctionality.onSubmitHandlers = parseInt(onSubmitCount.trim());
      
      // 주요 액션 버튼들 확인
      const actions = ['저장', '등록', '수정', '삭제', '승인', '거부'];
      this.results.buttonFunctionality.actionButtons = [];
      
      for (const action of actions) {
        const { stdout } = await execAsync(`grep -r "${action}" ${this.srcPath} --include="*.tsx" | wc -l`);
        const count = parseInt(stdout.trim());
        if (count > 0) {
          this.results.buttonFunctionality.actionButtons.push({ action, count });
        }
      }

    } catch (error) {
      this.results.buttonFunctionality.error = error.message;
    }
  }

  async checkRoleBasedAccess() {
    console.log('👥 Checking role-based access control...');
    
    try {
      // 역할 정의 확인
      const rolesPath = path.join(this.srcPath, 'constants/roles.ts');
      const rolesExists = fs.existsSync(rolesPath);
      this.results.roleBasedAccess.rolesConstantExists = rolesExists;
      
      if (rolesExists) {
        const rolesContent = fs.readFileSync(rolesPath, 'utf8');
        this.results.roleBasedAccess.hasUserRole = rolesContent.includes('UserRole');
        this.results.roleBasedAccess.hasRoleHierarchy = rolesContent.includes('ROLE_HIERARCHY');
        this.results.roleBasedAccess.hasPermissionCheck = rolesContent.includes('hasRole');
      }

      // 보호된 라우트 확인
      const protectedRoutes = ['/admin', '/club-dashboard', '/super-admin'];
      this.results.roleBasedAccess.protectedRoutes = [];
      
      for (const route of protectedRoutes) {
        const routePath = path.join(this.srcPath, 'app', route.slice(1));
        if (fs.existsSync(routePath)) {
          this.results.roleBasedAccess.protectedRoutes.push(route);
        }
      }

      // 미들웨어 확인
      const middlewarePath = path.join(this.projectRoot, 'src/middleware.ts');
      this.results.roleBasedAccess.middlewareExists = fs.existsSync(middlewarePath);

    } catch (error) {
      this.results.roleBasedAccess.error = error.message;
    }
  }

  async checkApiConnections() {
    console.log('🌐 Checking API connections...');
    
    try {
      // API 라우트 확인
      const apiPath = path.join(this.srcPath, 'app/api');
      const apiExists = fs.existsSync(apiPath);
      this.results.apiConnections.apiRoutesExist = apiExists;
      
      if (apiExists) {
        const apiFiles = fs.readdirSync(apiPath, { recursive: true })
          .filter(f => f.toString().endsWith('.ts') || f.toString().endsWith('.tsx'));
        this.results.apiConnections.apiEndpoints = apiFiles.length;
      }

      // 외부 API 호출 확인
      const { stdout: fetchCount } = await execAsync(`grep -r "fetch(" ${this.srcPath} --include="*.tsx" --include="*.ts" | wc -l`);
      this.results.apiConnections.fetchCalls = parseInt(fetchCount.trim());
      
      // Firebase 함수 사용 확인
      const firebaseFunctions = ['setDoc', 'getDoc', 'getDocs', 'addDoc', 'updateDoc', 'deleteDoc'];
      this.results.apiConnections.firebaseFunctions = [];
      
      for (const func of firebaseFunctions) {
        const { stdout } = await execAsync(`grep -r "${func}" ${this.srcPath} --include="*.tsx" --include="*.ts" | wc -l`);
        const count = parseInt(stdout.trim());
        if (count > 0) {
          this.results.apiConnections.firebaseFunctions.push({ function: func, count });
        }
      }

    } catch (error) {
      this.results.apiConnections.error = error.message;
    }
  }

  generateReport() {
    console.log('\n🔗 Integration Test Report');
    console.log('='.repeat(60));
    
    // 인증 상태
    console.log('\n🔐 Authentication Status:');
    const auth = this.results.authentication;
    console.log(`   Firebase Config: ${auth.configExists ? '✅' : '❌'}`);
    console.log(`   API Key: ${auth.hasApiKey ? '✅' : '❌'}`);
    console.log(`   Auth Hook: ${auth.useUserHookExists ? '✅' : '❌'}`);
    console.log(`   Login Page: ${auth.loginPageExists ? '✅' : '❌'}`);
    console.log(`   Register Pages: ${auth.registerPagesExist ? '✅' : '❌'}`);
    
    // 데이터 흐름
    console.log('\n📊 Data Flow Status:');
    const data = this.results.dataFlow;
    console.log(`   Firestore Integration: ${data.hasFirestore ? '✅' : '❌'}`);
    console.log(`   Type Definitions: ${data.typeDefinitions} files`);
    console.log(`   Collections Used: ${data.collectionsUsed?.join(', ') || 'None'}`);
    
    // 버튼 기능
    console.log('\n🔘 Button Functionality:');
    const buttons = this.results.buttonFunctionality;
    console.log(`   Button Component: ${buttons.buttonComponentExists ? '✅' : '❌'}`);
    console.log(`   onClick Handlers: ${buttons.onClickHandlers || 0}`);
    console.log(`   onSubmit Handlers: ${buttons.onSubmitHandlers || 0}`);
    if (buttons.actionButtons?.length) {
      console.log(`   Action Buttons:`);
      buttons.actionButtons.forEach(btn => {
        console.log(`     • ${btn.action}: ${btn.count} uses`);
      });
    }
    
    // 역할 기반 접근
    console.log('\n👥 Role-Based Access:');
    const roles = this.results.roleBasedAccess;
    console.log(`   Roles Definition: ${roles.rolesConstantExists ? '✅' : '❌'}`);
    console.log(`   Role Hierarchy: ${roles.hasRoleHierarchy ? '✅' : '❌'}`);
    console.log(`   Protected Routes: ${roles.protectedRoutes?.join(', ') || 'None'}`);
    console.log(`   Middleware: ${roles.middlewareExists ? '✅' : '❌'}`);
    
    // API 연결
    console.log('\n🌐 API Connections:');
    const api = this.results.apiConnections;
    console.log(`   API Routes: ${api.apiRoutesExist ? '✅' : '❌'} (${api.apiEndpoints || 0} endpoints)`);
    console.log(`   Fetch Calls: ${api.fetchCalls || 0}`);
    if (api.firebaseFunctions?.length) {
      console.log(`   Firebase Functions:`);
      api.firebaseFunctions.forEach(func => {
        console.log(`     • ${func.function}: ${func.count} uses`);
      });
    }

    // 전체 상태 평가
    this.evaluateOverallStatus();
  }

  evaluateOverallStatus() {
    console.log('\n🎯 Overall Integration Status:');
    
    const auth = this.results.authentication;
    const data = this.results.dataFlow;
    const buttons = this.results.buttonFunctionality;
    const roles = this.results.roleBasedAccess;
    const api = this.results.apiConnections;
    
    let score = 0;
    let maxScore = 0;
    
    // 인증 점수 (25점)
    maxScore += 25;
    if (auth.configExists) score += 5;
    if (auth.hasApiKey) score += 5;
    if (auth.useUserHookExists) score += 5;
    if (auth.loginPageExists) score += 5;
    if (auth.registerPagesExist) score += 5;
    
    // 데이터 흐름 점수 (25점)
    maxScore += 25;
    if (data.hasFirestore) score += 10;
    if (data.typeDefinitions > 3) score += 5;
    if (data.collectionsUsed?.length > 2) score += 10;
    
    // 기능성 점수 (25점)
    maxScore += 25;
    if (buttons.buttonComponentExists) score += 5;
    if (buttons.onClickHandlers > 10) score += 10;
    if (buttons.actionButtons?.length > 3) score += 10;
    
    // 보안 점수 (25점)
    maxScore += 25;
    if (roles.rolesConstantExists) score += 10;
    if (roles.hasRoleHierarchy) score += 5;
    if (roles.protectedRoutes?.length > 2) score += 5;
    if (roles.middlewareExists) score += 5;
    
    const percentage = Math.round((score / maxScore) * 100);
    
    console.log(`   Score: ${score}/${maxScore} (${percentage}%)`);
    
    if (percentage >= 90) {
      console.log('   Status: 🟢 Excellent - Full integration working');
    } else if (percentage >= 75) {
      console.log('   Status: 🟡 Good - Most features working');
    } else if (percentage >= 50) {
      console.log('   Status: 🟠 Fair - Basic functionality working');
    } else {
      console.log('   Status: 🔴 Poor - Major integration issues');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runFullIntegrationTest().catch(console.error);
}

module.exports = IntegrationTester;
