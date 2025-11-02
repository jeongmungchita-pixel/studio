#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 통계
let totalFiles = 0;
let modifiedFiles = 0;
let totalFixes = 0;

function fixApiRoutes(content) {
  let modifiedContent = content;
  let fixCount = 0;

  // Fix pattern: const { _user } = req -> const { _user } = _req
  const pattern1 = /const\s+\{\s*_user\s*\}\s*=\s*req;/g;
  if (pattern1.test(content)) {
    fixCount++;
    modifiedContent = modifiedContent.replace(pattern1, 'const { _user } = _req;');
  }

  // Fix pattern: const body = await req.json() -> const body = await _req.json()  
  const pattern2 = /const\s+body\s*=\s*await\s+req\.json\(\)/g;
  if (pattern2.test(content)) {
    fixCount++;
    modifiedContent = modifiedContent.replace(pattern2, 'const body = await _req.json()');
  }

  // Fix pattern: const { user } = req -> const { user } = _req
  const pattern3 = /const\s+\{\s*user\s*\}\s*=\s*req;/g;
  if (pattern3.test(content)) {
    fixCount++;
    modifiedContent = modifiedContent.replace(pattern3, 'const { user } = _req;');
  }

  return { content: modifiedContent, count: fixCount };
}

// 파일 처리
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: modifiedContent, count } = fixApiRoutes(content);
    
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
  console.log('🔧 Fixing API route req references...\n');

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
  console.log(`API route issues fixed: ${totalFixes}`);
  console.log('\n✨ API route fix complete!');
  
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
