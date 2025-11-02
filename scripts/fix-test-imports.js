#!/usr/bin/env node

/**
 * Phase 3: 테스트 파일 import 경로 수정 스크립트
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 테스트 파일 찾기
const testFiles = glob.sync('src/**/*.{test,spec}.{ts,tsx}', {
  ignore: ['**/node_modules/**', '**/.next/**']
});

console.log(`🔍 Found ${testFiles.length} test files to fix\n`);

let totalFixed = 0;
const fixes = [
  // Phase 1/2에서 변경된 경로들
  { from: /from ['"]\.\.\/api-client['"]/g, to: "from '@/lib/api/unified-api-client'" },
  { from: /from ['"]\.\.\/error-handler['"]/g, to: "from '@/lib/error/error-manager'" },
  { from: /from ['"]\.\.\/loading-manager['"]/g, to: "from '@/services/loading-manager'" },
  { from: /from ['"]@\/utils\/error\/api-error['"]/g, to: "from '@/lib/error/error-manager'" },
  { from: /from ['"]@\/services\/api-client['"]/g, to: "from '@/lib/api/unified-api-client'" },
  { from: /from ['"]@\/services\/error-handler['"]/g, to: "from '@/lib/error/error-manager'" },
  
  // apiClient import 수정
  { from: /import \{ apiClient \} from ['"]\.\.\/api-client['"]/g, to: "import { apiClient } from '@/lib/api/unified-api-client'" },
  { from: /import \{ APIClient \} from ['"]\.\.\/api-client['"]/g, to: "import { UnifiedAPIClient } from '@/lib/api/unified-api-client'" },
  
  // ErrorManager import 수정
  { from: /import \{ ErrorHandler \} from ['"]\.\.\/error-handler['"]/g, to: "import { ErrorManager } from '@/lib/error/error-manager'" },
  
  // Store 경로 수정
  { from: /from ['"]@\/store\//g, to: "from '@/stores/" },
];

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let fileFixed = 0;
  
  fixes.forEach(fix => {
    const beforeLength = content.length;
    content = content.replace(fix.from, fix.to);
    if (content.length !== beforeLength) {
      fileFixed++;
      totalFixed++;
    }
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`  ✓ Fixed ${fileFixed} imports in: ${path.relative(process.cwd(), file)}`);
  }
});

console.log(`\n✅ Fixed ${totalFixed} imports across ${testFiles.length} test files`);

// 추가로 확인이 필요한 파일들 찾기
console.log('\n🔍 Checking for files that might still have issues...\n');

testFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // 아직 문제가 있을 수 있는 패턴들
  const problematicPatterns = [
    /from ['"]\.\.\/services\//,
    /from ['"]\.\.\/utils\//,
    /from ['"]\.\.\/lib\//,
    /apiClient\./,
    /ErrorHandler\./,
  ];
  
  const issues = [];
  problematicPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      issues.push(pattern.source);
    }
  });
  
  if (issues.length > 0) {
    console.log(`  ⚠️  ${path.relative(process.cwd(), file)}`);
    console.log(`      Patterns found: ${issues.join(', ')}`);
  }
});

console.log('\n📝 Next steps:');
console.log('  1. Run: npm test to see remaining issues');
console.log('  2. Fix mock initialization in src/test/mocks/index.ts');
console.log('  3. Update test expectations for new API structure');
