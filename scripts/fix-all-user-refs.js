#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 통계
let totalFiles = 0;
let modifiedFiles = 0;
let totalFixes = 0;

function fixUserReferences(content) {
  let modifiedContent = content;
  let fixCount = 0;

  // Fix patterns where user should be _user
  // Pattern 1: !user?.clubId
  const pattern1 = /\b(!user\?\.)/g;
  if (pattern1.test(content)) {
    modifiedContent = modifiedContent.replace(pattern1, '!_user?.');
    fixCount++;
  }

  // Pattern 2: user.clubId (without _)
  const pattern2 = /\b(where\('clubId', '==', )user\.(clubId)/g;
  if (pattern2.test(content)) {
    modifiedContent = modifiedContent.replace(pattern2, '$1_user.$2');
    fixCount++;
  }

  // Pattern 3: user?.clubId in conditions
  const pattern3 = /\bif\s*\(\s*!firestore\s*\|\|\s*!user\?\.clubId/g;
  if (pattern3.test(content)) {
    modifiedContent = modifiedContent.replace(pattern3, 'if (!firestore || !_user?.clubId');
    fixCount++;
  }

  // Pattern 4: standalone user.clubId references
  const pattern4 = /([^_])user\.clubId/g;
  const matches = content.match(pattern4);
  if (matches) {
    modifiedContent = modifiedContent.replace(pattern4, '$1_user.clubId');
    fixCount += matches.length;
  }

  // Pattern 5: user?.role
  const pattern5 = /([^_])user\?\.role/g;
  const matches2 = content.match(pattern5);
  if (matches2) {
    modifiedContent = modifiedContent.replace(pattern5, '$1_user?.role');
    fixCount += matches2.length;
  }

  // Pattern 6: user?.uid
  const pattern6 = /([^_])user\?\.uid/g;
  const matches3 = content.match(pattern6);
  if (matches3) {
    modifiedContent = modifiedContent.replace(pattern6, '$1_user?.uid');
    fixCount += matches3.length;
  }

  return { content: modifiedContent, count: fixCount };
}

// 파일 처리
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: modifiedContent, count } = fixUserReferences(content);
    
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
  console.log('🔧 Fixing all user references...\n');

  const patterns = [
    'src/app/**/*.{ts,tsx}',
    'src/components/**/*.{ts,tsx}',
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
  console.log(`User reference issues fixed: ${totalFixes}`);
  console.log('\n✨ User reference fix complete!');
  
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
