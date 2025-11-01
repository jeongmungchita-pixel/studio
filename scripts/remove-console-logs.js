#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 제거할 콘솔 메서드들
const CONSOLE_METHODS = ['log', 'error', 'warn', 'info', 'debug'];

// 무시할 디렉터리/파일 패턴
const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/*.test.{ts,tsx,js,jsx}',
  '**/*.spec.{ts,tsx,js,jsx}',
  '**/scripts/**',
  '**/tests/**',
  '**/__tests__/**',
  '**/jest.setup.js',
  '**/vitest.config.ts',
  '**/*.config.{js,ts}',
];

// 안전하게 보존할 파일들 (디버깅/모니터링용)
const PRESERVE_FILES = [
  'src/lib/logger.ts',
  'src/lib/monitoring.ts',
  'src/lib/admin-debug.ts',
  'src/scripts/**',
  'scripts/**',
];

// 통계
let totalFiles = 0;
let modifiedFiles = 0;
let totalConsoleLogs = 0;
const fileStats = {};

// 파일이 보존 대상인지 확인
function shouldPreserveFile(filePath) {
  return PRESERVE_FILES.some(pattern => {
    if (pattern.includes('**')) {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

// console 문 제거 함수
function removeConsoleLogs(content, filePath) {
  if (shouldPreserveFile(filePath)) {
    console.log(`⏭️  Skipping preserved file: ${filePath}`);
    return content;
  }

  let modifiedContent = content;
  let removedCount = 0;

  // 각 console 메서드별로 제거
  CONSOLE_METHODS.forEach(method => {
    // 정규식 패턴들
    const patterns = [
      // 단순 console.log(...);
      new RegExp(`console\\.${method}\\([^;]*\\);`, 'g'),
      // 멀티라인 console.log
      new RegExp(`console\\.${method}\\([^)]*\\n[^)]*\\);`, 'gm'),
      // 조건부 console.log
      new RegExp(`\\s*&&\\s*console\\.${method}\\([^)]*\\)`, 'g'),
      // if 블록 안의 단일 console.log
      new RegExp(`if\\s*\\([^)]*\\)\\s*{?\\s*console\\.${method}\\([^)]*\\);?\\s*}?`, 'g'),
    ];

    patterns.forEach(pattern => {
      const matches = modifiedContent.match(pattern);
      if (matches) {
        removedCount += matches.length;
        modifiedContent = modifiedContent.replace(pattern, '');
      }
    });
  });

  // 빈 줄 정리
  modifiedContent = modifiedContent.replace(/^\s*[\r\n]/gm, '');
  modifiedContent = modifiedContent.replace(/\n{3,}/g, '\n\n');

  if (removedCount > 0) {
    fileStats[filePath] = removedCount;
    totalConsoleLogs += removedCount;
  }

  return modifiedContent;
}

// 파일 처리
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const modifiedContent = removeConsoleLogs(content, filePath);
    
    if (content !== modifiedContent) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      modifiedFiles++;
      console.log(`✅ Modified: ${filePath} (${fileStats[filePath]} console statements removed)`);
    }
    
    totalFiles++;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// 메인 실행 함수
function main() {
  console.log('🧹 Starting console.log cleanup...\n');

  // TypeScript/JavaScript 파일 찾기
  const patterns = [
    'src/**/*.{ts,tsx,js,jsx}',
    'app/**/*.{ts,tsx,js,jsx}',
    'pages/**/*.{ts,tsx,js,jsx}',
    'components/**/*.{ts,tsx,js,jsx}',
  ];

  let allFiles = [];
  patterns.forEach(pattern => {
    const files = glob.sync(pattern, { 
      ignore: IGNORE_PATTERNS,
      nodir: true 
    });
    allFiles = allFiles.concat(files);
  });

  // 중복 제거
  allFiles = [...new Set(allFiles)];

  console.log(`📁 Found ${allFiles.length} files to process\n`);

  // 각 파일 처리
  allFiles.forEach(processFile);

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log('📊 CLEANUP SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files scanned: ${totalFiles}`);
  console.log(`Files modified: ${modifiedFiles}`);
  console.log(`Console statements removed: ${totalConsoleLogs}`);
  
  if (modifiedFiles > 0) {
    console.log('\n📝 Modified files:');
    Object.entries(fileStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([file, count]) => {
        console.log(`  - ${file}: ${count} statements`);
      });
    
    if (Object.keys(fileStats).length > 10) {
      console.log(`  ... and ${Object.keys(fileStats).length - 10} more files`);
    }
  }

  console.log('\n✨ Cleanup complete!');
  console.log('💡 Tip: Run "npm run lint:fix" to fix any formatting issues');
}

// 실행
main();
