#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 통계
let totalFiles = 0;
let modifiedFiles = 0;
let totalFixes = 0;

function fixCardImports(content) {
  let modifiedContent = content;
  let fixCount = 0;

  // Fix import statements
  const importPatterns = [
    { search: /_CardHeader/g, replace: 'CardHeader' },
    { search: /_CardTitle/g, replace: 'CardTitle' },
  ];

  importPatterns.forEach(({ search, replace }) => {
    const matches = modifiedContent.match(search);
    if (matches) {
      fixCount += matches.length;
      modifiedContent = modifiedContent.replace(search, replace);
    }
  });

  return { content: modifiedContent, count: fixCount };
}

// 파일 처리
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: modifiedContent, count } = fixCardImports(content);
    
    if (content !== modifiedContent) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      modifiedFiles++;
      totalFixes += count;
      console.log(`✅ Fixed: ${filePath} (${count} changes)`);
    }
    
    totalFiles++;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// 메인 실행
function main() {
  console.log('🔧 Fixing Card component imports...\n');

  const patterns = [
    'src/**/*.{ts,tsx}',
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
  console.log(`Import issues fixed: ${totalFixes}`);
  console.log('\n✨ Import fix complete!');
}

// 실행
main();
