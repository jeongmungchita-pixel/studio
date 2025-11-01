#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 통계
let totalFiles = 0;
let modifiedFiles = 0;
let totalFixes = 0;

function fixErrorHandling(content) {
  let modifiedContent = content;
  let fixCount = 0;

  // Fix pattern: error.message -> error instanceof Error ? error.message : String(error)
  // Match patterns like: details: error.message or originalError: error.message
  const pattern1 = /(\w+:\s*)error\.message(\s*[,}])/g;
  
  modifiedContent = modifiedContent.replace(pattern1, (match, prefix, suffix) => {
    fixCount++;
    return `${prefix}error instanceof Error ? error.message : String(error)${suffix}`;
  });

  return { content: modifiedContent, count: fixCount };
}

// 파일 처리
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: modifiedContent, count } = fixErrorHandling(content);
    
    if (content !== modifiedContent) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      modifiedFiles++;
      totalFixes += count;
      const relativePath = filePath.replace(process.cwd() + '/', '');
      console.log(`✅ Fixed: ${relativePath} (${count} changes)`);
    }
    
    totalFiles++;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// 메인 실행
function main() {
  console.log('🔧 Fixing API error handling...\n');

  const patterns = [
    'src/app/api/**/*.ts',
  ];

  let allFiles = [];
  patterns.forEach(pattern => {
    const files = glob.sync(pattern, { 
      ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
      nodir: true 
    });
    allFiles = allFiles.concat(files);
  });

  // 중복 제거
  allFiles = [...new Set(allFiles)];

  console.log(`📁 Found ${allFiles.length} files to check\n`);

  // 각 파일 처리
  allFiles.forEach(processFile);

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log('📊 FIX SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files scanned: ${totalFiles}`);
  console.log(`Files modified: ${modifiedFiles}`);
  console.log(`Error handling issues fixed: ${totalFixes}`);
  console.log('\n✨ API error handling fix complete!');
  
  if (modifiedFiles === 0) {
    console.log('\nℹ️  No files needed fixing.');
  } else {
    console.log('\n💡 Next steps:');
    console.log('1. Run "npm run typecheck" to verify');
    console.log('2. Run "npm run build" to test build');
  }
}

// 실행
main();
