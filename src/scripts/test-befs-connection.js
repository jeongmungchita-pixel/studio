#!/usr/bin/env node

// ============================================
// 🧪 BEFS Hybrid Agent 연결 테스트
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_BEFS_API_URL || 'http://127.0.0.1:8765';

async function testConnection() {
  console.log('🤖 Testing BEFS Hybrid Agent Connection...\n');
  console.log(`📍 Server: ${API_BASE_URL}\n`);

  const tests = [
    {
      name: 'Health Check',
      endpoint: '/health',
      method: 'GET',
    },
    {
      name: 'Summary',
      endpoint: '/summary',
      method: 'GET',
    },
    {
      name: 'Get Tasks',
      endpoint: '/tasks',
      method: 'GET',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const response = await fetch(`${API_BASE_URL}${test.endpoint}`, {
        method: test.method,
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${test.name}: PASSED`);
        console.log(`   Response:`, JSON.stringify(data, null, 2));
        passed++;
      } else {
        console.log(`❌ ${test.name}: FAILED (Status: ${response.status})`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 All tests passed! BEFS Agent is ready to use.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the server connection.');
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  testConnection().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { testConnection };
