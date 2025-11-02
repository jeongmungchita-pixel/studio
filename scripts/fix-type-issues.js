#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 통계
let totalFiles = 0;
let modifiedFiles = 0;
let totalFixes = 0;
const fileStats = {};

// any 타입을 더 구체적인 타입으로 변경
const anyTypeReplacements = {
  'e: any': 'e: unknown',
  'error: any': 'error: unknown',
  'data: any': 'data: unknown',
  'value: any': 'value: unknown',
  'item: any': 'item: unknown',
  'obj: any': 'obj: unknown',
  'params: any': 'params: unknown',
  'args: any[]': 'args: unknown[]',
  'metadata?: Record<string, any>': 'metadata?: Record<string, unknown>',
  'Record<string, any>': 'Record<string, unknown>',
  ': any)': ': unknown)',
  ': any =>': ': unknown =>',
  'catch (e)': 'catch (e: unknown)',
  'catch(e)': 'catch(e: unknown)',
};

// 사용되지 않는 변수 처리 (underscore prefix 추가)
function fixUnusedVariables(content) {
  let modifiedContent = content;
  let fixCount = 0;

  // 사용되지 않는 함수 파라미터 처리
  const unusedParamPattern = /(\w+)(?=\s*[:,)])/g;
  const importPattern = /import\s+{[^}]+}\s+from/g;

  // TypeScript 컴파일러가 지적한 특정 변수들
  const unusedVars = [
    'req', 'eventIndex', 'classMembers', 'today', 
    'collection', 'query', 'where', 'getDocs', 'event',
    'CardHeader', 'CardTitle', 'setSelectedDate', 'user', 'hasRole'
  ];

  unusedVars.forEach(varName => {
    // 파라미터나 변수 선언에서 _ prefix 추가
    const patterns = [
      new RegExp(`\\b${varName}\\b(?=\\s*[:,)])`, 'g'),
      new RegExp(`const\\s+${varName}\\b`, 'g'),
      new RegExp(`let\\s+${varName}\\b`, 'g'),
      new RegExp(`var\\s+${varName}\\b`, 'g'),
    ];

    patterns.forEach(pattern => {
      const matches = modifiedContent.match(pattern);
      if (matches) {
        fixCount += matches.length;
        if (varName === 'req') {
          modifiedContent = modifiedContent.replace(/\breq\b(?=\s*[:,)])/g, '_req');
        } else if (!varName.startsWith('_')) {
          modifiedContent = modifiedContent.replace(pattern, (match) => {
            return match.replace(varName, `_${varName}`);
          });
        }
      }
    });
  });

  return { content: modifiedContent, count: fixCount };
}

// any 타입 수정
function fixAnyTypes(content) {
  let modifiedContent = content;
  let fixCount = 0;

  Object.entries(anyTypeReplacements).forEach(([search, replace]) => {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = modifiedContent.match(regex);
    if (matches) {
      fixCount += matches.length;
      modifiedContent = modifiedContent.replace(regex, replace);
    }
  });

  // catch 블록 특별 처리
  modifiedContent = modifiedContent.replace(/catch\s*\(\s*(\w+)\s*\)/g, 'catch ($1: unknown)');

  return { content: modifiedContent, count: fixCount };
}

// Optional chaining 추가 (possibly undefined 해결)
function addOptionalChaining(content) {
  let modifiedContent = content;
  let fixCount = 0;

  // .data나 .exists() 같은 패턴에 optional chaining 추가
  const patterns = [
    { search: /(\w+Doc)\.data\(\)/g, replace: '$1?.data()' },
    { search: /(\w+Doc)\.exists/g, replace: '$1?.exists' },
    { search: /(\w+Data)\.(\w+)/g, checkUndefined: true },
  ];

  patterns.forEach(({ search, replace, checkUndefined }) => {
    if (checkUndefined) {
      // 변수가 undefined일 수 있는 경우 처리
      modifiedContent = modifiedContent.replace(search, (match, varName, prop) => {
        // 이미 optional chaining이 있으면 skip
        if (match.includes('?.')) return match;
        // 특정 케이스만 처리
        if (['memberData', 'result', 'passDoc', 'userDoc', 'parentMember'].includes(varName)) {
          fixCount++;
          return `${varName}?.${prop}`;
        }
        return match;
      });
    } else if (replace) {
      const matches = modifiedContent.match(search);
      if (matches) {
        fixCount += matches.length;
        modifiedContent = modifiedContent.replace(search, replace);
      }
    }
  });

  return { content: modifiedContent, count: fixCount };
}

// 파일 처리
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modifiedContent = content;
    let totalFixCount = 0;

    // 1. any 타입 수정
    const anyFix = fixAnyTypes(modifiedContent);
    modifiedContent = anyFix.content;
    totalFixCount += anyFix.count;

    // 2. 사용되지 않는 변수 수정
    const unusedFix = fixUnusedVariables(modifiedContent);
    modifiedContent = unusedFix.content;
    totalFixCount += unusedFix.count;

    // 3. Optional chaining 추가
    const optionalFix = addOptionalChaining(modifiedContent);
    modifiedContent = optionalFix.content;
    totalFixCount += optionalFix.count;

    if (content !== modifiedContent) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      modifiedFiles++;
      fileStats[filePath] = totalFixCount;
      totalFixes += totalFixCount;
      console.log(`✅ Fixed: ${filePath} (${totalFixCount} issues)`);
    }
    
    totalFiles++;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// 메인 실행
function main() {
  console.log('🔧 Starting TypeScript type fixes...\n');

  const patterns = [
    'src/**/*.{ts,tsx}',
    'scripts/*.ts',
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

  console.log(`📁 Found ${allFiles.length} TypeScript files to process\n`);

  // 각 파일 처리
  allFiles.forEach(processFile);

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log('📊 TYPE FIX SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files scanned: ${totalFiles}`);
  console.log(`Files modified: ${modifiedFiles}`);
  console.log(`Type issues fixed: ${totalFixes}`);
  
  if (modifiedFiles > 0) {
    console.log('\n📝 Modified files:');
    Object.entries(fileStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([file, count]) => {
        const relativePath = file.replace(process.cwd() + '/', '');
        console.log(`  - ${relativePath}: ${count} fixes`);
      });
    
    if (Object.keys(fileStats).length > 10) {
      console.log(`  ... and ${Object.keys(fileStats).length - 10} more files`);
    }
  }

  console.log('\n✨ Type fixes complete!');
  console.log('💡 Tip: Run "npm run typecheck" to verify remaining issues');
}

// 실행
main();
