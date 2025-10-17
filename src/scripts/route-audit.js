#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// ============================================
// 🔍 라우트 감사 스크립트
// ============================================

class RouteAuditor {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.srcPath = path.join(this.projectRoot, 'src');
    this.appPath = path.join(this.srcPath, 'app');
    
    this.existingRoutes = new Set();
    this.usedRoutes = new Set();
    this.routeConstants = new Map();
    this.issues = [];
  }

  async audit() {
    console.log('🔍 Starting route audit...\n');
    
    // 1. 실제 존재하는 라우트 스캔
    await this.scanExistingRoutes();
    
    // 2. 라우트 상수 로드
    await this.loadRouteConstants();
    
    // 3. 사용되는 라우트 스캔
    await this.scanUsedRoutes();
    
    // 4. 분석 및 리포트 생성
    this.analyzeRoutes();
    this.generateReport();
  }

  async scanExistingRoutes() {
    console.log('📁 Scanning existing routes...');
    
    try {
      const pageFiles = await glob('**/page.tsx', { 
        cwd: this.appPath,
        absolute: false 
      });
      
      pageFiles.forEach(file => {
        // page.tsx 파일 경로를 라우트로 변환
        let route = '/' + file.replace('/page.tsx', '');
        
        // 루트 경로 처리
        if (route === '/page') route = '/';
        
        // 동적 라우트 처리 ([id] -> :id)
        route = route.replace(/\[([^\]]+)\]/g, ':$1');
        
        this.existingRoutes.add(route);
      });
      
      console.log(`   Found ${this.existingRoutes.size} existing routes`);
    } catch (error) {
      console.error('Error scanning routes:', error);
    }
  }

  async loadRouteConstants() {
    console.log('📋 Loading route constants...');
    
    try {
      const routesFile = path.join(this.srcPath, 'constants/routes.ts');
      if (fs.existsSync(routesFile)) {
        const content = fs.readFileSync(routesFile, 'utf8');
        
        // ROUTES 객체에서 라우트 추출
        const routeMatches = content.match(/['"`]\/[^'"`]*['"`]/g);
        if (routeMatches) {
          routeMatches.forEach(match => {
            const route = match.slice(1, -1); // 따옴표 제거
            this.routeConstants.set(route, 'ROUTES constant');
          });
        }
        
        console.log(`   Found ${this.routeConstants.size} route constants`);
      }
    } catch (error) {
      console.error('Error loading route constants:', error);
    }
  }

  async scanUsedRoutes() {
    console.log('🔎 Scanning used routes...');
    
    try {
      const tsxFiles = await glob('**/*.{tsx,ts}', { 
        cwd: this.srcPath,
        ignore: ['**/*.d.ts', '**/node_modules/**'],
        absolute: true 
      });
      
      for (const file of tsxFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const routes = this.extractRoutesFromContent(content);
        
        routes.forEach(route => {
          this.usedRoutes.add(route);
        });
      }
      
      console.log(`   Found ${this.usedRoutes.size} used routes`);
    } catch (error) {
      console.error('Error scanning used routes:', error);
    }
  }

  extractRoutesFromContent(content) {
    const routes = [];
    
    // router.push 패턴
    const routerPushMatches = content.match(/router\.push\(['"`]([^'"`]+)['"`]\)/g);
    if (routerPushMatches) {
      routerPushMatches.forEach(match => {
        const route = match.match(/['"`]([^'"`]+)['"`]/)?.[1];
        if (route && route.startsWith('/')) {
          routes.push(route);
        }
      });
    }

    // href 패턴
    const hrefMatches = content.match(/href=['"`]([^'"`]+)['"`]/g);
    if (hrefMatches) {
      hrefMatches.forEach(match => {
        const route = match.match(/['"`]([^'"`]+)['"`]/)?.[1];
        if (route && route.startsWith('/')) {
          routes.push(route);
        }
      });
    }

    // Link to 패턴
    const linkToMatches = content.match(/to=['"`]([^'"`]+)['"`]/g);
    if (linkToMatches) {
      linkToMatches.forEach(match => {
        const route = match.match(/['"`]([^'"`]+)['"`]/)?.[1];
        if (route && route.startsWith('/')) {
          routes.push(route);
        }
      });
    }

    // 직접 라우트 문자열
    const directRoutes = content.match(/['"`]\/[a-zA-Z0-9\-_\/\[\]]+['"`]/g);
    if (directRoutes) {
      directRoutes.forEach(match => {
        const route = match.slice(1, -1);
        if (route.startsWith('/') && !route.includes(' ') && route.length > 1) {
          routes.push(route);
        }
      });
    }

    return routes;
  }

  analyzeRoutes() {
    console.log('\n📊 Analyzing routes...');
    
    // 1. 사용되지 않는 라우트
    const unusedRoutes = [...this.existingRoutes].filter(route => {
      // 동적 라우트는 정확한 매칭이 어려우므로 패턴 매칭 사용
      if (route.includes(':')) {
        const pattern = route.replace(/:([^\/]+)/g, '[^/]+');
        const regex = new RegExp(`^${pattern}$`);
        return ![...this.usedRoutes].some(used => regex.test(used));
      }
      return !this.usedRoutes.has(route);
    });

    if (unusedRoutes.length > 0) {
      this.issues.push({
        type: 'unused_routes',
        title: '🚫 Unused Routes',
        items: unusedRoutes,
        description: 'These routes exist but are not referenced in the code'
      });
    }

    // 2. 존재하지 않는 라우트
    const invalidRoutes = [...this.usedRoutes].filter(route => {
      // 동적 라우트 패턴 확인
      const normalizedRoute = route.replace(/\/[^\/]+/g, (match) => {
        // 숫자나 UUID 패턴을 동적 라우트로 간주
        if (/^\/[0-9a-f\-]+$/i.test(match) || /^\/\d+$/.test(match)) {
          return '/:id';
        }
        return match;
      });

      return !this.existingRoutes.has(route) && !this.existingRoutes.has(normalizedRoute);
    });

    if (invalidRoutes.length > 0) {
      this.issues.push({
        type: 'invalid_routes',
        title: '❌ Invalid Routes',
        items: invalidRoutes,
        description: 'These routes are used in code but do not exist'
      });
    }

    // 3. 상수로 정의되지 않은 라우트
    const hardcodedRoutes = [...this.usedRoutes].filter(route => {
      return !this.routeConstants.has(route) && route !== '/' && !route.includes('?') && !route.includes('#');
    });

    if (hardcodedRoutes.length > 0) {
      this.issues.push({
        type: 'hardcoded_routes',
        title: '🔧 Hardcoded Routes',
        items: hardcodedRoutes,
        description: 'These routes should be defined in route constants'
      });
    }

    // 4. 정의되었지만 사용되지 않는 상수
    const unusedConstants = [...this.routeConstants.keys()].filter(route => {
      return !this.usedRoutes.has(route);
    });

    if (unusedConstants.length > 0) {
      this.issues.push({
        type: 'unused_constants',
        title: '📋 Unused Route Constants',
        items: unusedConstants,
        description: 'These route constants are defined but not used'
      });
    }
  }

  generateReport() {
    console.log('\n📋 Route Audit Report');
    console.log('='.repeat(50));
    
    console.log(`\n📊 Summary:`);
    console.log(`   Existing routes: ${this.existingRoutes.size}`);
    console.log(`   Used routes: ${this.usedRoutes.size}`);
    console.log(`   Route constants: ${this.routeConstants.size}`);
    console.log(`   Issues found: ${this.issues.length}`);

    if (this.issues.length === 0) {
      console.log('\n✅ No issues found! All routes are properly organized.');
      return;
    }

    this.issues.forEach(issue => {
      console.log(`\n${issue.title}`);
      console.log('-'.repeat(30));
      console.log(`${issue.description}\n`);
      
      issue.items.forEach(item => {
        console.log(`   • ${item}`);
      });
    });

    // 상세 리스트 출력
    console.log('\n📁 Existing Routes:');
    [...this.existingRoutes].sort().forEach(route => {
      console.log(`   ${route}`);
    });

    console.log('\n🔗 Used Routes:');
    [...this.usedRoutes].sort().forEach(route => {
      console.log(`   ${route}`);
    });

    // 권장사항
    console.log('\n💡 Recommendations:');
    console.log('   1. Remove unused routes or add them to route constants');
    console.log('   2. Create missing route files for invalid routes');
    console.log('   3. Move hardcoded routes to /src/constants/routes.ts');
    console.log('   4. Remove unused route constants');
    console.log('   5. Consider using TypeScript enums for better type safety');
  }
}

// 스크립트 실행
if (require.main === module) {
  const auditor = new RouteAuditor();
  auditor.audit().catch(console.error);
}

module.exports = RouteAuditor;
