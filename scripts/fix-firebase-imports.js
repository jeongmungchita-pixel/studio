#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 통계
let totalFiles = 0;
let modifiedFiles = 0;
let totalFixes = 0;

// Firebase import 패턴 수정 맵
const importFixPatterns = [
  // Firestore imports
  { search: /_collection/g, replace: 'collection' },
  { search: /_query/g, replace: 'query' },
  { search: /_where/g, replace: 'where' },
  { search: /_getDocs/g, replace: 'getDocs' },
  { search: /_getDoc/g, replace: 'getDoc' },
  { search: /_doc/g, replace: 'doc' },
  { search: /_orderBy/g, replace: 'orderBy' },
  { search: /_limit/g, replace: 'limit' },
  { search: /_startAfter/g, replace: 'startAfter' },
  { search: /_writeBatch/g, replace: 'writeBatch' },
  { search: /_updateDoc/g, replace: 'updateDoc' },
  { search: /_setDoc/g, replace: 'setDoc' },
  { search: /_deleteDoc/g, replace: 'deleteDoc' },
  { search: /_onSnapshot/g, replace: 'onSnapshot' },
  { search: /_addDoc/g, replace: 'addDoc' },
];

// 파일 내용 수정
function fixFirebaseImports(content) {
  let modifiedContent = content;
  let fixCount = 0;

  // import 문에서만 수정 (from 'firebase/로 끝나는 라인들)
  const importLinePattern = /^import\s+.*from\s+['"]firebase\/.*/gm;
  const importLines = content.match(importLinePattern) || [];

  importLines.forEach(importLine => {
    let fixedLine = importLine;
    importFixPatterns.forEach(({ search, replace }) => {
      const matches = fixedLine.match(search);
      if (matches) {
        fixCount += matches.length;
        fixedLine = fixedLine.replace(search, replace);
      }
    });

    if (fixedLine !== importLine) {
      modifiedContent = modifiedContent.replace(importLine, fixedLine);
    }
  });

  return { content: modifiedContent, count: fixCount };
}

// 파일 처리
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: modifiedContent, count } = fixFirebaseImports(content);
    
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
  console.log('🔧 Fixing Firebase imports...\n');

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
  console.log('\n✨ Firebase import fix complete!');
  
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
