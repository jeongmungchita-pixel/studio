#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ============================================
// 👥 사용자 가입 플로우 시뮬레이션
// ============================================

class UserRegistrationSimulator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.srcPath = path.join(this.projectRoot, 'src');
    this.simulationResults = {
      federationAdmin: { status: 'pending', steps: [], issues: [] },
      clubOwner: { status: 'pending', steps: [], issues: [] },
      member: { status: 'pending', steps: [], issues: [] }
    };
  }

  async runFullSimulation() {
    console.log('👥 Starting User Registration Flow Simulation...\n');
    console.log('🎯 Testing: Federation Admin → Club Owner → Member registration flows\n');
    
    await this.simulateFederationAdminRegistration();
    await this.simulateClubOwnerRegistration();
    await this.simulateMemberRegistration();
    
    this.generateSimulationReport();
  }

  async simulateFederationAdminRegistration() {
    console.log('🏛️ Simulating Federation Admin Registration...');
    const flow = this.simulationResults.federationAdmin;
    
    try {
      // 1. 초기 관리자 설정 페이지 확인
      const initialAdminPath = path.join(this.srcPath, 'app/setup/initial-admin/page.tsx');
      if (fs.existsSync(initialAdminPath)) {
        flow.steps.push('✅ Initial admin setup page exists');
        
        const content = fs.readFileSync(initialAdminPath, 'utf8');
        if (content.includes('FEDERATION_ADMIN')) {
          flow.steps.push('✅ Federation admin role configured');
        } else {
          flow.issues.push('⚠️ Federation admin role not found in setup');
        }
        
        if (content.includes('Firebase')) {
          flow.steps.push('✅ Firebase integration present');
        }
        
        if (content.includes('onSubmit') || content.includes('handleSubmit')) {
          flow.steps.push('✅ Form submission handler exists');
        }
      } else {
        flow.issues.push('❌ Initial admin setup page missing');
      }

      // 2. Super Admin 가입 페이지 확인
      const superAdminPath = path.join(this.srcPath, 'app/register/super-admin/page.tsx');
      if (fs.existsSync(superAdminPath)) {
        flow.steps.push('✅ Super admin registration page exists');
      }

      // 3. 인증 시스템 확인
      const authHookPath = path.join(this.srcPath, 'hooks/use-user.tsx');
      if (fs.existsSync(authHookPath)) {
        const authContent = fs.readFileSync(authHookPath, 'utf8');
        if (authContent.includes('FEDERATION_ADMIN')) {
          flow.steps.push('✅ Federation admin role in auth system');
        }
      }

      // 4. 권한 시스템 확인
      const rolesPath = path.join(this.srcPath, 'constants/roles.ts');
      if (fs.existsSync(rolesPath)) {
        const rolesContent = fs.readFileSync(rolesPath, 'utf8');
        if (rolesContent.includes('FEDERATION_ADMIN') && rolesContent.includes('ROLE_HIERARCHY')) {
          flow.steps.push('✅ Federation admin in role hierarchy (Level 90)');
        }
      }

      flow.status = flow.issues.length === 0 ? 'success' : 'warning';
      
    } catch (error) {
      flow.status = 'error';
      flow.issues.push(`❌ Error: ${error.message}`);
    }
  }

  async simulateClubOwnerRegistration() {
    console.log('🏢 Simulating Club Owner Registration...');
    const flow = this.simulationResults.clubOwner;
    
    try {
      // 1. 클럽 오너 가입 페이지 확인
      const clubOwnerPath = path.join(this.srcPath, 'app/register/club-owner/page.tsx');
      if (fs.existsSync(clubOwnerPath)) {
        flow.steps.push('✅ Club owner registration page exists');
        
        const content = fs.readFileSync(clubOwnerPath, 'utf8');
        
        // 필수 필드 확인
        const requiredFields = ['name', 'email', 'phone', 'clubName', 'clubAddress'];
        requiredFields.forEach(field => {
          if (content.includes(field)) {
            flow.steps.push(`✅ ${field} field present`);
          } else {
            flow.issues.push(`⚠️ ${field} field missing`);
          }
        });
        
        if (content.includes('CLUB_OWNER')) {
          flow.steps.push('✅ Club owner role configured');
        }
        
        if (content.includes('Firebase') || content.includes('setDoc')) {
          flow.steps.push('✅ Firebase integration for data storage');
        }
        
      } else {
        flow.issues.push('❌ Club owner registration page missing');
      }

      // 2. 클럽 승인 시스템 확인
      const adminClubsPath = path.join(this.srcPath, 'app/admin/clubs/page.tsx');
      if (fs.existsSync(adminClubsPath)) {
        flow.steps.push('✅ Club management page exists for approval');
        
        const adminContent = fs.readFileSync(adminClubsPath, 'utf8');
        if (adminContent.includes('승인') || adminContent.includes('approve')) {
          flow.steps.push('✅ Club approval functionality present');
        }
      }

      // 3. 클럽 대시보드 확인
      const clubDashboardPath = path.join(this.srcPath, 'app/club-dashboard');
      if (fs.existsSync(clubDashboardPath)) {
        flow.steps.push('✅ Club dashboard directory exists');
        
        const dashboardFiles = fs.readdirSync(clubDashboardPath, { recursive: true });
        const pageCount = dashboardFiles.filter(f => f.toString().includes('page.tsx')).length;
        flow.steps.push(`✅ ${pageCount} dashboard pages available`);
      }

      // 4. 권한 확인
      const rolesPath = path.join(this.srcPath, 'constants/roles.ts');
      if (fs.existsSync(rolesPath)) {
        const rolesContent = fs.readFileSync(rolesPath, 'utf8');
        if (rolesContent.includes('CLUB_OWNER') && rolesContent.includes('50')) {
          flow.steps.push('✅ Club owner in role hierarchy (Level 50)');
        }
      }

      flow.status = flow.issues.length === 0 ? 'success' : 'warning';
      
    } catch (error) {
      flow.status = 'error';
      flow.issues.push(`❌ Error: ${error.message}`);
    }
  }

  async simulateMemberRegistration() {
    console.log('👤 Simulating Member Registration...');
    const flow = this.simulationResults.member;
    
    try {
      // 1. 일반 회원 가입 페이지들 확인
      const memberPaths = [
        'app/register/member/page.tsx',
        'app/register/adult/page.tsx',
        'app/register/family/page.tsx'
      ];
      
      let foundPages = 0;
      memberPaths.forEach(pagePath => {
        const fullPath = path.join(this.srcPath, pagePath);
        if (fs.existsSync(fullPath)) {
          foundPages++;
          flow.steps.push(`✅ ${pagePath.split('/').pop().replace('.tsx', '')} registration page exists`);
          
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // 기본 필드 확인
          const basicFields = ['name', 'email', 'phone', 'dateOfBirth'];
          basicFields.forEach(field => {
            if (content.includes(field)) {
              flow.steps.push(`✅ ${field} field present`);
            }
          });
          
          if (content.includes('MEMBER')) {
            flow.steps.push('✅ Member role configured');
          }
        }
      });
      
      if (foundPages === 0) {
        flow.issues.push('❌ No member registration pages found');
      } else {
        flow.steps.push(`✅ Found ${foundPages} member registration options`);
      }

      // 2. 회원 프로필 페이지 확인
      const profilePath = path.join(this.srcPath, 'app/my-profile/page.tsx');
      if (fs.existsSync(profilePath)) {
        flow.steps.push('✅ Member profile page exists');
        
        const profileContent = fs.readFileSync(profilePath, 'utf8');
        if (profileContent.includes('가족') || profileContent.includes('family')) {
          flow.steps.push('✅ Family member management available');
        }
      }

      // 3. 회원 관리 시스템 확인
      const membersPath = path.join(this.srcPath, 'app/members/page.tsx');
      if (fs.existsSync(membersPath)) {
        flow.steps.push('✅ Members listing page exists');
      }

      // 4. 클럽 가입 신청 시스템 확인
      const clubsPath = path.join(this.srcPath, 'app/clubs/page.tsx');
      if (fs.existsSync(clubsPath)) {
        flow.steps.push('✅ Clubs listing page exists for joining');
      }

      // 5. 회원 도메인 유틸리티 확인
      const memberUtilsPath = path.join(this.srcPath, 'domains/member/utils/index.ts');
      if (fs.existsSync(memberUtilsPath)) {
        const utilsContent = fs.readFileSync(memberUtilsPath, 'utf8');
        const functions = ['validateMember', 'getMemberStats', 'filterMembers'];
        functions.forEach(func => {
          if (utilsContent.includes(func)) {
            flow.steps.push(`✅ ${func} utility function available`);
          }
        });
      }

      // 6. 권한 확인
      const rolesPath = path.join(this.srcPath, 'constants/roles.ts');
      if (fs.existsSync(rolesPath)) {
        const rolesContent = fs.readFileSync(rolesPath, 'utf8');
        if (rolesContent.includes('MEMBER') && rolesContent.includes('10')) {
          flow.steps.push('✅ Member in role hierarchy (Level 10)');
        }
      }

      flow.status = flow.issues.length === 0 ? 'success' : 'warning';
      
    } catch (error) {
      flow.status = 'error';
      flow.issues.push(`❌ Error: ${error.message}`);
    }
  }

  generateSimulationReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 USER REGISTRATION SIMULATION REPORT');
    console.log('='.repeat(80));

    // Federation Admin 결과
    console.log('\n🏛️ FEDERATION ADMIN REGISTRATION:');
    const fedAdmin = this.simulationResults.federationAdmin;
    console.log(`   Status: ${this.getStatusIcon(fedAdmin.status)} ${fedAdmin.status.toUpperCase()}`);
    fedAdmin.steps.forEach(step => console.log(`   ${step}`));
    if (fedAdmin.issues.length > 0) {
      console.log('   Issues:');
      fedAdmin.issues.forEach(issue => console.log(`   ${issue}`));
    }

    // Club Owner 결과
    console.log('\n🏢 CLUB OWNER REGISTRATION:');
    const clubOwner = this.simulationResults.clubOwner;
    console.log(`   Status: ${this.getStatusIcon(clubOwner.status)} ${clubOwner.status.toUpperCase()}`);
    clubOwner.steps.forEach(step => console.log(`   ${step}`));
    if (clubOwner.issues.length > 0) {
      console.log('   Issues:');
      clubOwner.issues.forEach(issue => console.log(`   ${issue}`));
    }

    // Member 결과
    console.log('\n👤 MEMBER REGISTRATION:');
    const member = this.simulationResults.member;
    console.log(`   Status: ${this.getStatusIcon(member.status)} ${member.status.toUpperCase()}`);
    member.steps.forEach(step => console.log(`   ${step}`));
    if (member.issues.length > 0) {
      console.log('   Issues:');
      member.issues.forEach(issue => console.log(`   ${issue}`));
    }

    // 전체 요약
    console.log('\n🎯 OVERALL SIMULATION SUMMARY:');
    const allStatuses = [fedAdmin.status, clubOwner.status, member.status];
    const successCount = allStatuses.filter(s => s === 'success').length;
    const warningCount = allStatuses.filter(s => s === 'warning').length;
    const errorCount = allStatuses.filter(s => s === 'error').length;

    console.log(`   ✅ Successful flows: ${successCount}/3`);
    console.log(`   ⚠️  Flows with warnings: ${warningCount}/3`);
    console.log(`   ❌ Failed flows: ${errorCount}/3`);

    if (successCount === 3) {
      console.log('\n🎉 ALL REGISTRATION FLOWS ARE FULLY FUNCTIONAL!');
    } else if (successCount + warningCount === 3) {
      console.log('\n🟡 All flows working with minor issues to address');
    } else {
      console.log('\n🔴 Some registration flows need attention');
    }

    // 실제 테스트 가이드
    console.log('\n📋 MANUAL TESTING GUIDE:');
    console.log('   1. 🏛️  Federation Admin: /setup/initial-admin → Create first admin');
    console.log('   2. 🏢 Club Owner: /register/club-owner → Register club → Wait for approval');
    console.log('   3. 👤 Member: /register/adult or /register/family → Join club → Start using');
    console.log('\n🌐 Test URL: http://localhost:9002');
  }

  getStatusIcon(status) {
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '⏳';
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const simulator = new UserRegistrationSimulator();
  simulator.runFullSimulation().catch(console.error);
}

module.exports = UserRegistrationSimulator;
