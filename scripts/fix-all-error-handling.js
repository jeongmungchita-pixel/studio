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

  // Pattern 1: error.message in catch blocks
  // Match: } catch (error: unknown) { ... error.message
  const catchBlockPattern = /catch\s*\(error:\s*unknown\)[^}]*?error\.message/gs;
  
  // Find all catch blocks with error.message
  const matches = content.match(catchBlockPattern);
  if (matches) {
    matches.forEach(match => {
      // Replace error.message with proper type checking
      const fixed = match.replace(/\berror\.message\b/g, 'error instanceof Error ? error.message : String(error)');
      modifiedContent = modifiedContent.replace(match, fixed);
      fixCount++;
    });
  }

  // Pattern 2: Standalone error.message references (less common)
  // This pattern is for cases where error is used outside obvious catch blocks
  const standalonePattern = /(\s+)error\.message(\s*[|&,;}\)])/g;
  
  // Only apply if we haven't already fixed it
  if (!fixCount && standalonePattern.test(content)) {
    modifiedContent = modifiedContent.replace(standalonePattern, '$1(error as any).message$2');
    fixCount++;
  }

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
  console.log('🔧 Fixing all error handling in TypeScript/TSX files...\n');

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
  console.log(`Error handling issues fixed: ${totalFixes}`);
  console.log('\n✨ Error handling fix complete!');
  
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
