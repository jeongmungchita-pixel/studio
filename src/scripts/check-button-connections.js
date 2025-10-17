#!/usr/bin/env node

/**
 * 버튼 연결 상태 점검 스크립트
 * 모든 버튼의 onClick, href, Link 연결을 분석합니다.
 */

const fs = require('fs');
const path = require('path');

// 분석할 파일 패턴
const filePatterns = ['.tsx', '.ts'];
const excludeDirs = ['node_modules', '.next', '__tests__'];

// 버튼 연결 패턴들
const patterns = {
  onClick: /onClick\s*=\s*{?\s*\(\s*\)\s*=>\s*([^}]+)}/g,
  onClickRouter: /onClick\s*=\s*{?\s*\(\s*\)\s*=>\s*router\.push\(['"`]([^'"`]+)['"`]\)/g,
  href: /href\s*=\s*['"`]([^'"`]+)['"`]/g,
  linkTo: /<Link[^>]+to\s*=\s*['"`]([^'"`]+)['"`]/g,
  routerPush: /router\.push\(['"`]([^'"`]+)['"`]\)/g,
  windowLocation: /window\.location\.href\s*=\s*['"`]([^'"`]+)['"`]/g,
};

// 결과 저장
const results = {
  totalButtons: 0,
  connectedButtons: 0,
  brokenLinks: [],
  validRoutes: [],
  buttonsByType: {
    onClick: [],
    href: [],
    router: [],
    windowLocation: []
  },
  fileAnalysis: {}
};

// Next.js 라우트 구조 분석
function getValidRoutes(appDir) {
  const routes = new Set();
  
  function scanDirectory(dir, basePath = '') {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // 동적 라우트 처리 [id], [slug] 등
          const routePath = item.startsWith('[') && item.endsWith(']') 
            ? basePath + '/' + item.replace(/\[|\]/g, ':')  // [id] -> :id
            : basePath + '/' + item;
            
          routes.add(routePath);
          scanDirectory(fullPath, routePath);
        } else if (item === 'page.tsx' || item === 'page.ts') {
          routes.add(basePath || '/');
        }
      }
    } catch (error) {
      console.warn(`디렉토리 스캔 실패: ${dir}`);
    }
  }
  
  scanDirectory(appDir);
  return Array.from(routes);
}

// 파일 분석
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    
    const fileResult = {
      path: relativePath,
      buttons: [],
      links: [],
      issues: []
    };

    // onClick 패턴 분석
    let match;
    while ((match = patterns.onClick.exec(content)) !== null) {
      const action = match[1].trim();
      fileResult.buttons.push({
        type: 'onClick',
        action: action,
        line: getLineNumber(content, match.index)
      });
      results.buttonsByType.onClick.push({
        file: relativePath,
        action: action,
        line: getLineNumber(content, match.index)
      });
    }

    // router.push 패턴 분석
    patterns.onClickRouter.lastIndex = 0;
    while ((match = patterns.onClickRouter.exec(content)) !== null) {
      const route = match[1];
      fileResult.buttons.push({
        type: 'router.push',
        route: route,
        line: getLineNumber(content, match.index)
      });
      results.buttonsByType.router.push({
        file: relativePath,
        route: route,
        line: getLineNumber(content, match.index)
      });
    }

    // href 패턴 분석
    patterns.href.lastIndex = 0;
    while ((match = patterns.href.exec(content)) !== null) {
      const href = match[1];
      fileResult.links.push({
        type: 'href',
        url: href,
        line: getLineNumber(content, match.index)
      });
      results.buttonsByType.href.push({
        file: relativePath,
        url: href,
        line: getLineNumber(content, match.index)
      });
    }

    // window.location 패턴 분석
    patterns.windowLocation.lastIndex = 0;
    while ((match = patterns.windowLocation.exec(content)) !== null) {
      const url = match[1];
      fileResult.buttons.push({
        type: 'window.location',
        url: url,
        line: getLineNumber(content, match.index)
      });
      results.buttonsByType.windowLocation.push({
        file: relativePath,
        url: url,
        line: getLineNumber(content, match.index)
      });
    }

    results.fileAnalysis[relativePath] = fileResult;
    results.totalButtons += fileResult.buttons.length + fileResult.links.length;
    
  } catch (error) {
    console.warn(`파일 분석 실패: ${filePath} - ${error.message}`);
  }
}

// 라인 번호 계산
function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

// 디렉토리 스캔
function scanDirectory(dir) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      if (excludeDirs.includes(item)) continue;
      
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (filePatterns.some(ext => item.endsWith(ext))) {
        analyzeFile(fullPath);
      }
    }
  } catch (error) {
    console.warn(`디렉토리 스캔 실패: ${dir}`);
  }
}

// 라우트 유효성 검사
function validateRoutes(validRoutes) {
  const allRoutes = [
    ...results.buttonsByType.router.map(b => b.route),
    ...results.buttonsByType.href.map(b => b.url),
    ...results.buttonsByType.windowLocation.map(b => b.url)
  ];

  for (const route of allRoutes) {
    // 외부 URL 제외
    if (route.startsWith('http') || route.startsWith('mailto:') || route.startsWith('tel:')) {
      continue;
    }

    // 동적 라우트 처리
    const normalizedRoute = route.replace(/\/[^\/]*\[[^\]]+\][^\/]*/g, '/:param');
    
    const isValid = validRoutes.some(validRoute => {
      const normalizedValid = validRoute.replace(/\/\[[^\]]+\]/g, '/:param');
      return normalizedValid === normalizedRoute || 
             validRoute === route ||
             route.startsWith(validRoute + '/');
    });

    if (!isValid) {
      results.brokenLinks.push(route);
    } else {
      results.validRoutes.push(route);
    }
  }
}

// 메인 실행
function main() {
  console.log('🔍 버튼 연결 상태 점검 시작...\n');
  
  const srcDir = path.join(process.cwd(), 'src');
  const appDir = path.join(srcDir, 'app');
  
  // 유효한 라우트 수집
  console.log('📁 라우트 구조 분석 중...');
  const validRoutes = getValidRoutes(appDir);
  console.log(`✅ ${validRoutes.length}개 라우트 발견\n`);
  
  // 파일 스캔
  console.log('📄 소스 파일 분석 중...');
  scanDirectory(srcDir);
  
  // 라우트 유효성 검사
  console.log('🔗 라우트 유효성 검사 중...');
  validateRoutes(validRoutes);
  
  // 결과 출력
  printResults();
}

// 결과 출력
function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 버튼 연결 상태 점검 결과');
  console.log('='.repeat(60));
  
  console.log(`\n📈 전체 통계:`);
  console.log(`  • 총 버튼/링크: ${results.totalButtons}개`);
  console.log(`  • 유효한 연결: ${results.validRoutes.length}개`);
  console.log(`  • 문제 있는 연결: ${results.brokenLinks.length}개`);
  
  const successRate = results.totalButtons > 0 
    ? ((results.validRoutes.length / results.totalButtons) * 100).toFixed(1)
    : 0;
  console.log(`  • 성공률: ${successRate}%`);
  
  console.log(`\n🔧 버튼 타입별 분석:`);
  console.log(`  • onClick 핸들러: ${results.buttonsByType.onClick.length}개`);
  console.log(`  • router.push: ${results.buttonsByType.router.length}개`);
  console.log(`  • href 링크: ${results.buttonsByType.href.length}개`);
  console.log(`  • window.location: ${results.buttonsByType.windowLocation.length}개`);
  
  if (results.brokenLinks.length > 0) {
    console.log(`\n❌ 문제 있는 링크 (${results.brokenLinks.length}개):`);
    results.brokenLinks.forEach(link => {
      console.log(`  • ${link}`);
    });
  }
  
  console.log(`\n✅ 주요 유효 라우트 (${Math.min(results.validRoutes.length, 10)}개):`);
  results.validRoutes.slice(0, 10).forEach(route => {
    console.log(`  • ${route}`);
  });
  
  if (results.validRoutes.length > 10) {
    console.log(`  ... 및 ${results.validRoutes.length - 10}개 더`);
  }
  
  // 상세 결과를 JSON 파일로 저장
  const outputFile = path.join(process.cwd(), 'button-analysis-result.json');
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 상세 결과가 저장되었습니다: ${outputFile}`);
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { main, analyzeFile, getValidRoutes };
