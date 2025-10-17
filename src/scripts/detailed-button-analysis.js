#!/usr/bin/env node

/**
 * 상세 버튼 연결 상태 분석 스크립트
 * 각 버튼의 기능과 연결 상태를 자세히 분석합니다.
 */

const fs = require('fs');
const path = require('path');

// 분석 결과
const analysis = {
  navigationButtons: [],
  actionButtons: [],
  formButtons: [],
  modalButtons: [],
  brokenConnections: [],
  workingConnections: [],
  summary: {
    total: 0,
    working: 0,
    broken: 0,
    byCategory: {}
  }
};

// 실제 라우트 파일들 확인
function getActualRoutes(appDir) {
  const routes = new Set();
  
  function scanForPages(dir, basePath = '') {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // API 라우트 제외
          if (item === 'api') continue;
          
          let routePath = basePath;
          if (item.startsWith('[') && item.endsWith(']')) {
            // 동적 라우트: [id] -> :id
            routePath += '/' + item.slice(1, -1);
          } else {
            routePath += '/' + item;
          }
          
          scanForPages(fullPath, routePath);
        } else if (item === 'page.tsx' || item === 'page.ts') {
          routes.add(basePath === '' ? '/' : basePath);
        }
      }
    } catch (error) {
      // 디렉토리 접근 실패 무시
    }
  }
  
  scanForPages(appDir);
  return Array.from(routes).sort();
}

// 파일에서 버튼 패턴 분석
function analyzeButtonsInFile(filePath, content) {
  const relativePath = path.relative(process.cwd(), filePath);
  const buttons = [];
  
  // 1. Link 컴포넌트 분석
  const linkPattern = /<Link[^>]+href\s*=\s*{?['"`]([^'"`}]+)['"`]}?[^>]*>/g;
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    buttons.push({
      type: 'Link',
      target: match[1],
      file: relativePath,
      line: getLineNumber(content, match.index),
      context: getContext(content, match.index)
    });
  }
  
  // 2. router.push 분석
  const routerPushPattern = /router\.push\(['"`]([^'"`]+)['"`]\)/g;
  while ((match = routerPushPattern.exec(content)) !== null) {
    buttons.push({
      type: 'router.push',
      target: match[1],
      file: relativePath,
      line: getLineNumber(content, match.index),
      context: getContext(content, match.index)
    });
  }
  
  // 3. onClick with router 분석
  const onClickRouterPattern = /onClick\s*=\s*{?\s*\(\s*\)\s*=>\s*router\.push\(['"`]([^'"`]+)['"`]\)/g;
  while ((match = onClickRouterPattern.exec(content)) !== null) {
    buttons.push({
      type: 'onClick->router',
      target: match[1],
      file: relativePath,
      line: getLineNumber(content, match.index),
      context: getContext(content, match.index)
    });
  }
  
  // 4. window.location 분석
  const windowLocationPattern = /window\.location\.href\s*=\s*['"`]([^'"`]+)['"`]/g;
  while ((match = windowLocationPattern.exec(content)) !== null) {
    buttons.push({
      type: 'window.location',
      target: match[1],
      file: relativePath,
      line: getLineNumber(content, match.index),
      context: getContext(content, match.index)
    });
  }
  
  // 5. 일반 onClick 핸들러 (함수 호출)
  const onClickFunctionPattern = /onClick\s*=\s*{?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*}?/g;
  while ((match = onClickFunctionPattern.exec(content)) !== null) {
    const functionName = match[1];
    // 일반적인 함수명들만 포함
    if (!['router', 'window', 'console', 'alert'].includes(functionName)) {
      buttons.push({
        type: 'onClick->function',
        target: functionName,
        file: relativePath,
        line: getLineNumber(content, match.index),
        context: getContext(content, match.index)
      });
    }
  }
  
  return buttons;
}

// 라인 번호 계산
function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

// 컨텍스트 추출 (버튼 주변 코드)
function getContext(content, index, contextLength = 50) {
  const start = Math.max(0, index - contextLength);
  const end = Math.min(content.length, index + contextLength);
  return content.substring(start, end).replace(/\s+/g, ' ').trim();
}

// 버튼 분류
function categorizeButton(button) {
  const { target, context, file } = button;
  
  // 네비게이션 버튼
  if (target && (target.startsWith('/') || target.includes('dashboard') || target.includes('admin'))) {
    return 'navigation';
  }
  
  // 폼 관련 버튼
  if (context.includes('submit') || context.includes('form') || target.includes('handle')) {
    return 'form';
  }
  
  // 모달 관련 버튼
  if (context.includes('modal') || context.includes('dialog') || target.includes('Modal') || target.includes('Dialog')) {
    return 'modal';
  }
  
  // 액션 버튼
  return 'action';
}

// 라우트 유효성 검사
function validateRoute(route, validRoutes) {
  if (!route || route.startsWith('http') || route.startsWith('mailto:') || route.startsWith('tel:')) {
    return true; // 외부 링크는 유효하다고 가정
  }
  
  // 동적 라우트 처리
  const normalizedRoute = route.replace(/\$\{[^}]+\}/g, ':param');
  
  return validRoutes.some(validRoute => {
    return validRoute === normalizedRoute || 
           validRoute === route ||
           route.startsWith(validRoute + '/') ||
           validRoute.includes(':') && matchesDynamicRoute(route, validRoute);
  });
}

// 동적 라우트 매칭
function matchesDynamicRoute(route, pattern) {
  const routeParts = route.split('/');
  const patternParts = pattern.split('/');
  
  if (routeParts.length !== patternParts.length) return false;
  
  for (let i = 0; i < routeParts.length; i++) {
    if (patternParts[i].startsWith(':')) continue; // 동적 세그먼트
    if (routeParts[i] !== patternParts[i]) return false;
  }
  
  return true;
}

// 메인 분석 함수
function analyzeButtons() {
  console.log('🔍 상세 버튼 연결 분석 시작...\n');
  
  const srcDir = path.join(process.cwd(), 'src');
  const appDir = path.join(srcDir, 'app');
  
  // 실제 라우트 수집
  console.log('📁 실제 라우트 구조 분석...');
  const validRoutes = getActualRoutes(appDir);
  console.log(`✅ ${validRoutes.length}개 실제 라우트 발견`);
  console.log('주요 라우트:', validRoutes.slice(0, 10).join(', '));
  
  // 모든 TSX 파일 분석
  console.log('\n📄 버튼 패턴 분석 중...');
  const allButtons = [];
  
  function scanFiles(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules') continue;
        
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanFiles(fullPath);
        } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const buttons = analyzeButtonsInFile(fullPath, content);
          allButtons.push(...buttons);
        }
      }
    } catch (error) {
      // 파일 접근 실패 무시
    }
  }
  
  scanFiles(srcDir);
  
  console.log(`📊 총 ${allButtons.length}개 버튼/링크 발견`);
  
  // 버튼 분류 및 유효성 검사
  console.log('\n🔗 연결 상태 검증 중...');
  
  for (const button of allButtons) {
    const category = categorizeButton(button);
    const isValid = button.type === 'onClick->function' || validateRoute(button.target, validRoutes);
    
    button.category = category;
    button.isValid = isValid;
    
    // 카테고리별 분류
    if (!analysis.summary.byCategory[category]) {
      analysis.summary.byCategory[category] = { total: 0, working: 0, broken: 0 };
    }
    analysis.summary.byCategory[category].total++;
    
    if (isValid) {
      analysis.workingConnections.push(button);
      analysis.summary.byCategory[category].working++;
    } else {
      analysis.brokenConnections.push(button);
      analysis.summary.byCategory[category].broken++;
    }
    
    // 타입별 분류
    switch (category) {
      case 'navigation':
        analysis.navigationButtons.push(button);
        break;
      case 'action':
        analysis.actionButtons.push(button);
        break;
      case 'form':
        analysis.formButtons.push(button);
        break;
      case 'modal':
        analysis.modalButtons.push(button);
        break;
    }
  }
  
  // 통계 계산
  analysis.summary.total = allButtons.length;
  analysis.summary.working = analysis.workingConnections.length;
  analysis.summary.broken = analysis.brokenConnections.length;
  
  // 결과 출력
  printDetailedResults(validRoutes);
}

// 상세 결과 출력
function printDetailedResults(validRoutes) {
  console.log('\n' + '='.repeat(70));
  console.log('📊 상세 버튼 연결 분석 결과');
  console.log('='.repeat(70));
  
  const { total, working, broken, byCategory } = analysis.summary;
  const successRate = total > 0 ? ((working / total) * 100).toFixed(1) : 0;
  
  console.log(`\n📈 전체 통계:`);
  console.log(`  • 총 버튼/링크: ${total}개`);
  console.log(`  • 정상 작동: ${working}개 (${successRate}%)`);
  console.log(`  • 문제 있음: ${broken}개`);
  
  console.log(`\n🏷️ 카테고리별 분석:`);
  Object.entries(byCategory).forEach(([category, stats]) => {
    const rate = stats.total > 0 ? ((stats.working / stats.total) * 100).toFixed(1) : 0;
    console.log(`  • ${category}: ${stats.working}/${stats.total} (${rate}%)`);
  });
  
  console.log(`\n🧭 네비게이션 버튼 (${analysis.navigationButtons.length}개):`);
  const navSample = analysis.navigationButtons.slice(0, 5);
  navSample.forEach(btn => {
    const status = btn.isValid ? '✅' : '❌';
    console.log(`  ${status} ${btn.target} (${btn.file}:${btn.line})`);
  });
  
  if (analysis.brokenConnections.length > 0) {
    console.log(`\n❌ 문제 있는 연결 (${analysis.brokenConnections.length}개):`);
    analysis.brokenConnections.slice(0, 10).forEach(btn => {
      console.log(`  • ${btn.target} in ${btn.file}:${btn.line}`);
      console.log(`    타입: ${btn.type}, 카테고리: ${btn.category}`);
    });
    
    if (analysis.brokenConnections.length > 10) {
      console.log(`  ... 및 ${analysis.brokenConnections.length - 10}개 더`);
    }
  }
  
  console.log(`\n✅ 사용 가능한 라우트 (${validRoutes.length}개):`);
  validRoutes.forEach(route => {
    console.log(`  • ${route}`);
  });
  
  // 상세 결과 저장
  const outputFile = path.join(process.cwd(), 'detailed-button-analysis.json');
  fs.writeFileSync(outputFile, JSON.stringify({
    ...analysis,
    validRoutes,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  console.log(`\n💾 상세 결과 저장: ${outputFile}`);
  
  // 권장사항
  console.log(`\n💡 권장사항:`);
  if (broken > 0) {
    console.log(`  • ${broken}개의 문제 있는 연결을 수정하세요`);
  }
  if (successRate < 90) {
    console.log(`  • 버튼 연결 성공률이 ${successRate}%입니다. 90% 이상을 목표로 하세요`);
  }
  if (analysis.navigationButtons.length > analysis.actionButtons.length) {
    console.log(`  • 네비게이션 버튼이 많습니다. UX 개선을 고려하세요`);
  }
}

// 실행
if (require.main === module) {
  analyzeButtons();
}
