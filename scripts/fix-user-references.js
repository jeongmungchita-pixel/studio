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

  // Pattern 1: const { user } = useUser()
  const pattern1 = /const\s+\{\s*user\s*\}\s*=\s*useUser\(\)/g;
  if (pattern1.test(content)) {
    fixCount++;
    modifiedContent = modifiedContent.replace(pattern1, 'const { _user } = useUser()');
  }

  // Pattern 2: const { user } = useUserStore()
  const pattern2 = /const\s+\{\s*user\s*\}\s*=\s*useUserStore\(\)/g;
  if (pattern2.test(content)) {
    fixCount++;
    modifiedContent = modifiedContent.replace(pattern2, 'const { _user } = useUserStore()');
  }

  // Pattern 3: const { user } = req
  const pattern3 = /const\s+\{\s*user\s*\}\s*=\s*req/g;
  if (pattern3.test(content)) {
    fixCount++;
    modifiedContent = modifiedContent.replace(pattern3, 'const { _user } = req');
  }

  // If we made replacements, also replace subsequent references
  if (fixCount > 0) {
    // Replace user references that are likely from the destructured variable
    // But be careful not to replace things like 'user' in strings or other contexts
    
    // Common patterns where 'user' is used as a variable
    const userPatterns = [
      /\bif\s*\(\s*!user\b/g,
      /\bif\s*\(\s*user\b/g,
      /\buser\?\./g,
      /\buser\./g,
      /\buser\.uid\b/g,
      /\buser\.role\b/g,
      /\buser\.status\b/g,
      /\buser\.email\b/g,
      /\buser\.displayName\b/g,
      /\buser\.clubId\b/g,
      /\buser\s*&&\s*/g,
      /\s*&&\s*user\b/g,
      /\buser\s*\|\|\s*/g,
      /\s*\|\|\s*user\b/g,
      /\buser\s*\?\s*/g,
      /\buser!\./g,
      /\(!user\s+/g,
      /\(user\s+/g,
      /\s+user\)/g,
      /\[user\]/g,
      /\{user\}/g,
      /,\s*user\s*,/g,
      /,\s*user\s*\)/g,
      /\(\s*user\s*,/g,
    ];

    userPatterns.forEach(pattern => {
      const matches = modifiedContent.match(pattern);
      if (matches) {
        fixCount += matches.length;
        modifiedContent = modifiedContent.replace(pattern, (match) => {
          return match.replace(/\buser\b/g, '_user');
        });
      }
    });
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
  console.log('🔧 Fixing user references...\n');

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
