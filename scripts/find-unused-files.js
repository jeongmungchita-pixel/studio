#!/usr/bin/env node

/**
 * 사용하지 않는 파일 찾기 스크립트
 * Phase 2: 코드 클린업을 위한 도구
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 프로젝트 루트
const ROOT = path.resolve(__dirname, '..');

// 제외할 디렉토리 및 파일 패턴
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/coverage/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/*.md',
  '**/*.json',
  '**/*.css',
  '**/*.scss',
  '**/public/**',
  '**/scripts/**',
  '**/docs/**'
];

// 엔트리 포인트 (항상 사용됨)
const ENTRY_POINTS = [
  'src/app',
  'src/pages/_app.tsx',
  'src/pages/_document.tsx',
  'src/middleware.ts',
  'next.config.js',
  'tailwind.config.ts',
  'vitest.config.ts'
];

// 파일별 import/export 분석
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = [];
  const exports = [];
  
  // import 문 찾기
  const importRegex = /import\s+(?:.*?\s+from\s+)?['"](\.\.?\/[^'"]+)['"]/g;
  const requireRegex = /require\s*\(['"](\.\.?\/[^'"]+)['"]\)/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // export 문 찾기
  const hasExport = /export\s+(?:default|{|function|class|const|let|var|type|interface)/m.test(content);
  
  return { imports, hasExport };
}

// 모든 TypeScript/JavaScript 파일 찾기
function findAllFiles() {
  const patterns = [
    'src/**/*.ts',
    'src/**/*.tsx',
    'src/**/*.js',
    'src/**/*.jsx'
  ];
  
  const files = [];
  patterns.forEach(pattern => {
    const found = glob.sync(path.join(ROOT, pattern), {
      ignore: EXCLUDE_PATTERNS.map(p => path.join(ROOT, p))
    });
    files.push(...found);
  });
  
  return files;
}

// 사용되는 파일 추적
function trackUsedFiles(files) {
  const usedFiles = new Set();
  const fileMap = new Map();
  
  // 파일 정보 수집
  files.forEach(file => {
    const relPath = path.relative(ROOT, file);
    fileMap.set(relPath, analyzeFile(file));
  });
  
  // 엔트리 포인트 추가
  ENTRY_POINTS.forEach(entry => {
    const entryPath = path.join(ROOT, entry);
    if (fs.existsSync(entryPath)) {
      if (fs.statSync(entryPath).isDirectory()) {
        // 디렉토리인 경우 모든 파일 추가
        const dirFiles = glob.sync(path.join(entryPath, '**/*.{ts,tsx,js,jsx}'));
        dirFiles.forEach(f => usedFiles.add(path.relative(ROOT, f)));
      } else {
        usedFiles.add(path.relative(ROOT, entryPath));
      }
    }
  });
  
  // import 체인 따라가기
  let changed = true;
  while (changed) {
    changed = false;
    const currentUsed = [...usedFiles];
    
    currentUsed.forEach(usedFile => {
      const fileInfo = fileMap.get(usedFile);
      if (!fileInfo) return;
      
      fileInfo.imports.forEach(importPath => {
        const dir = path.dirname(usedFile);
        let resolvedPath = path.join(dir, importPath);
        resolvedPath = path.relative(ROOT, path.join(ROOT, resolvedPath));
        
        // 파일 확장자 시도
        const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
        for (const ext of extensions) {
          const fullPath = resolvedPath + ext;
          if (fileMap.has(fullPath) && !usedFiles.has(fullPath)) {
            usedFiles.add(fullPath);
            changed = true;
          }
        }
      });
    });
  }
  
  return usedFiles;
}

// 메인 실행
function main() {
  console.log('🔍 사용하지 않는 파일 찾기 시작...\n');
  
  const allFiles = findAllFiles();
  console.log(`📁 전체 파일: ${allFiles.length}개`);
  
  const usedFiles = trackUsedFiles(allFiles);
  console.log(`✅ 사용 중인 파일: ${usedFiles.size}개`);
  
  // 사용하지 않는 파일 찾기
  const unusedFiles = allFiles.filter(file => {
    const relPath = path.relative(ROOT, file);
    return !usedFiles.has(relPath);
  });
  
  console.log(`❌ 사용하지 않는 파일: ${unusedFiles.length}개\n`);
  
  if (unusedFiles.length > 0) {
    console.log('📋 사용하지 않는 파일 목록:');
    console.log('=' .repeat(50));
    
    // 카테고리별로 분류
    const categories = {
      components: [],
      hooks: [],
      utils: [],
      services: [],
      types: [],
      api: [],
      other: []
    };
    
    unusedFiles.forEach(file => {
      const relPath = path.relative(ROOT, file);
      
      if (relPath.includes('/components/')) categories.components.push(relPath);
      else if (relPath.includes('/hooks/')) categories.hooks.push(relPath);
      else if (relPath.includes('/utils/')) categories.utils.push(relPath);
      else if (relPath.includes('/services/')) categories.services.push(relPath);
      else if (relPath.includes('/types/')) categories.types.push(relPath);
      else if (relPath.includes('/api/')) categories.api.push(relPath);
      else categories.other.push(relPath);
    });
    
    // 카테고리별 출력
    Object.entries(categories).forEach(([category, files]) => {
      if (files.length > 0) {
        console.log(`\n📂 ${category.toUpperCase()} (${files.length}개):`);
        files.forEach(file => console.log(`  - ${file}`));
      }
    });
    
    // 삭제 스크립트 생성
    const deleteScript = path.join(ROOT, 'scripts', 'delete-unused-files.sh');
    const deleteCommands = [
      '#!/bin/bash',
      '# 사용하지 않는 파일 삭제 스크립트',
      `# 생성일: ${new Date().toISOString()}`,
      `# 총 ${unusedFiles.length}개 파일`,
      '',
      'echo "🗑️  사용하지 않는 파일 삭제 시작..."',
      ''
    ];
    
    unusedFiles.forEach(file => {
      const relPath = path.relative(ROOT, file);
      deleteCommands.push(`rm -f "${relPath}"`);
    });
    
    deleteCommands.push('', 'echo "✅ 삭제 완료!"');
    
    fs.writeFileSync(deleteScript, deleteCommands.join('\n'));
    fs.chmodSync(deleteScript, '755');
    
    console.log('\n');
    console.log('=' .repeat(50));
    console.log(`\n💡 삭제 스크립트가 생성되었습니다:`);
    console.log(`   ${deleteScript}`);
    console.log('\n   실행: ./scripts/delete-unused-files.sh');
  }
}

// 실행
main();
