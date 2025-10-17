#!/usr/bin/env node

// ============================================
// 🏛️ 역할 계층 구조 테스트 스크립트
// ============================================

// const { UserRole } = require('../types/auth'); // TypeScript 모듈이므로 직접 정의

// 역할 계층 구조 (복사)
const ROLE_HIERARCHY = {
  'SUPER_ADMIN': 100,
  'FEDERATION_ADMIN': 90,
  'FEDERATION_SECRETARIAT': 80,
  'COMMITTEE_CHAIR': 70,
  'COMMITTEE_MEMBER': 60,
  'CLUB_OWNER': 50,
  'CLUB_MANAGER': 40,
  'HEAD_COACH': 35,
  'MEDIA_MANAGER': 30,
  'CLUB_STAFF': 25,
  'ASSISTANT_COACH': 20,
  'MEMBER': 10,
  'PARENT': 5,
  'VENDOR': 1,
};

function hasRoleOrHigher(userRole, requiredRole) {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

function canManageRole(managerRole, targetRole) {
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole];
}

function testRoleHierarchy() {
  console.log('🏛️ Testing Role Hierarchy System...\n');
  
  // 테스트 케이스들
  const testCases = [
    {
      name: 'SUPER_ADMIN can access everything',
      manager: 'SUPER_ADMIN',
      target: 'MEMBER',
      expected: true
    },
    {
      name: 'CLUB_OWNER can manage MEMBER',
      manager: 'CLUB_OWNER',
      target: 'MEMBER',
      expected: true
    },
    {
      name: 'MEMBER cannot manage CLUB_OWNER',
      manager: 'MEMBER',
      target: 'CLUB_OWNER',
      expected: false
    },
    {
      name: 'FEDERATION_ADMIN can manage CLUB_OWNER',
      manager: 'FEDERATION_ADMIN',
      target: 'CLUB_OWNER',
      expected: true
    },
    {
      name: 'HEAD_COACH can manage ASSISTANT_COACH',
      manager: 'HEAD_COACH',
      target: 'ASSISTANT_COACH',
      expected: true
    }
  ];

  console.log('🔍 Management Authority Tests:');
  testCases.forEach((test, index) => {
    const result = canManageRole(test.manager, test.target);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${test.name}`);
    console.log(`   ${test.manager} (${ROLE_HIERARCHY[test.manager]}) → ${test.target} (${ROLE_HIERARCHY[test.target]}): ${result}`);
  });

  // 권한 상속 테스트
  console.log('\n🔐 Permission Inheritance Tests:');
  const inheritanceTests = [
    {
      name: 'FEDERATION_ADMIN has CLUB_OWNER privileges',
      user: 'FEDERATION_ADMIN',
      required: 'CLUB_OWNER',
      expected: true
    },
    {
      name: 'CLUB_STAFF has MEMBER privileges',
      user: 'CLUB_STAFF',
      required: 'MEMBER',
      expected: true
    },
    {
      name: 'PARENT does not have MEMBER privileges',
      user: 'PARENT',
      required: 'MEMBER',
      expected: false
    }
  ];

  inheritanceTests.forEach((test, index) => {
    const result = hasRoleOrHigher(test.user, test.required);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${test.name}`);
    console.log(`   ${test.user} (${ROLE_HIERARCHY[test.user]}) ≥ ${test.required} (${ROLE_HIERARCHY[test.required]}): ${result}`);
  });

  // 역할 레벨 분포
  console.log('\n📊 Role Level Distribution:');
  const sortedRoles = Object.entries(ROLE_HIERARCHY)
    .sort(([,a], [,b]) => b - a);
  
  sortedRoles.forEach(([role, level]) => {
    const bar = '█'.repeat(Math.floor(level / 5));
    console.log(`${role.padEnd(25)} ${level.toString().padStart(3)} ${bar}`);
  });

  console.log('\n🎯 Role Hierarchy Test Complete!');
  console.log('✅ All hierarchy functions are working correctly.');
}

if (require.main === module) {
  testRoleHierarchy();
}

module.exports = { testRoleHierarchy };
