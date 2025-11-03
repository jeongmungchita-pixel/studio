#!/usr/bin/env node

/**
 * DI Container 마이그레이션 스크립트
 * - 모든 diContainer 참조를 제거하고 composition-root로 마이그레이션
 */

const fs = require('fs');
const path = require('path');

// 마이그레이션할 파일 목록
const filesToMigrate = [
  // Hooks
  'src/hooks/use-session-manager.tsx',
  'src/hooks/use-onboarding.tsx',
  
  // API
  'src/api/factory.ts',
  'src/api/user/user-api.ts',
  'src/api/club/club-api.ts',
  
  // Lib
  'src/lib/validation/server-validator.ts',
  'src/lib/performance-monitor.ts',
  
  // App routes
  'src/app/api/health/route.ts',
];

// 마이그레이션 함수
function migrateFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    
    // diContainer import 제거
    content = content.replace(
      /import\s*{\s*diContainer\s*}\s*from\s*['"@].*global-di['"];\s*/g,
      '// Removed diContainer import - migrating to composition-root\n'
    );
    
    content = content.replace(
      /import\s*{\s*diContainer\s*}\s*from\s*['"@].*di-container['"];\s*/g,
      '// Removed diContainer import - migrating to composition-root\n'
    );
    
    // diContainer 사용 제거 (단순한 경우)
    content = content.replace(
      /diContainer\./g,
      '// diContainer. (removed) '
    );
    
    // ServiceContainer import 제거 (필요한 경우만)
    if (filePath.includes('test') || filePath.includes('mock')) {
      // 테스트 파일은 유지
      console.log(`🧪 Keeping ServiceContainer in test file: ${filePath}`);
      return;
    }
    
    content = content.replace(
      /import\s*{\s*ServiceContainer\s*}\s*from\s*['"@].*container['"];\s*/g,
      '// Removed ServiceContainer import - migrating to composition-root\n'
    );
    
    // ServiceContainer.getInstance() 제거
    content = content.replace(
      /ServiceContainer\.getInstance\(\)/g,
      '// ServiceContainer.getInstance() (removed)'
    );
    
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Migrated: ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error migrating ${filePath}:`, error.message);
  }
}

// 실행
console.log('🚀 Starting DI Container migration...\n');

filesToMigrate.forEach(migrateFile);

console.log('\n✨ Migration completed!');
console.log('\n📋 Next steps:');
console.log('1. Review the migrated files');
console.log('2. Replace diContainer usage with composition-root');
console.log('3. Update imports to use new services');
console.log('4. Run tests to verify functionality');
