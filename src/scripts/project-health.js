#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const { execSync } = require('child_process');

// ============================================
// 🏥 프로젝트 건강도 체크
// ============================================

class ProjectHealthChecker {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.srcPath = path.join(this.projectRoot, 'src');
    this.metrics = {
      codeQuality: { score: 0, details: {} },
      architecture: { score: 0, details: {} },
      performance: { score: 0, details: {} },
      maintainability: { score: 0, details: {} },
      security: { score: 0, details: {} }
    };
    this.overallScore = 0;
  }

  async checkHealth() {
    console.log('🏥 Checking Project Health...\n');
    
    await this.checkCodeQuality();
    await this.checkArchitecture();
    await this.checkPerformance();
    await this.checkMaintainability();
    await this.checkSecurity();
    
    this.calculateOverallScore();
    this.generateHealthReport();
  }

  async checkCodeQuality() {
    console.log('📝 Checking Code Quality...');
    
    const details = {};
    let score = 0;

    // TypeScript 사용률
    const tsFiles = await glob('**/*.{ts,tsx}', { cwd: this.srcPath });
    const jsFiles = await glob('**/*.{js,jsx}', { cwd: this.srcPath, ignore: ['**/scripts/**'] });
    const tsUsage = tsFiles.length / (tsFiles.length + jsFiles.length) * 100;
    details.typeScriptUsage = `${Math.round(tsUsage)}%`;
    score += tsUsage > 95 ? 25 : tsUsage > 80 ? 20 : 10;

    // any 타입 사용률
    let anyCount = 0;
    for (const file of tsFiles) {
      const content = fs.readFileSync(path.join(this.srcPath, file), 'utf8');
      anyCount += (content.match(/:\s*any\b/g) || []).length;
    }
    details.anyTypeUsage = `${anyCount} occurrences`;
    score += anyCount === 0 ? 25 : anyCount < 5 ? 20 : anyCount < 10 ? 15 : 5;

    // Console.log 사용률
    let consoleCount = 0;
    for (const file of [...tsFiles, ...jsFiles]) {
      if (file.includes('scripts/')) continue;
      const content = fs.readFileSync(path.join(this.srcPath, file), 'utf8');
      consoleCount += (content.match(/console\.(log|error|warn)/g) || []).length;
    }
    details.consoleStatements = `${consoleCount} statements`;
    score += consoleCount === 0 ? 25 : consoleCount < 3 ? 20 : consoleCount < 10 ? 15 : 5;

    // 사용되지 않는 imports
    let unusedImports = 0;
    for (const file of tsFiles) {
      const content = fs.readFileSync(path.join(this.srcPath, file), 'utf8');
      const imports = content.match(/import\s+\{([^}]+)\}/g) || [];
      for (const imp of imports) {
        const namedImports = imp.match(/\{([^}]+)\}/)[1].split(',');
        for (const namedImport of namedImports) {
          const importName = namedImport.trim().split(' as ')[0].trim();
          const usageRegex = new RegExp(`\\b${importName}\\b`, 'g');
          const usages = content.match(usageRegex);
          if (!usages || usages.length <= 1) {
            unusedImports++;
          }
        }
      }
    }
    details.unusedImports = `${unusedImports} imports`;
    score += unusedImports === 0 ? 25 : unusedImports < 5 ? 20 : unusedImports < 15 ? 15 : 5;

    this.metrics.codeQuality = { score: Math.min(score, 100), details };
    console.log(`   Score: ${this.metrics.codeQuality.score}/100`);
  }

  async checkArchitecture() {
    console.log('🏗️ Checking Architecture...');
    
    const details = {};
    let score = 0;

    // 도메인 구조 체크
    const domainsPath = path.join(this.srcPath, 'domains');
    const hasDomains = fs.existsSync(domainsPath);
    details.domainStructure = hasDomains ? 'Present' : 'Missing';
    score += hasDomains ? 25 : 0;

    // 타입 분리 체크
    const typesPath = path.join(this.srcPath, 'types');
    const typeFiles = fs.existsSync(typesPath) ? fs.readdirSync(typesPath) : [];
    details.typeOrganization = `${typeFiles.length} type files`;
    score += typeFiles.length > 3 ? 25 : typeFiles.length > 1 ? 20 : 10;

    // 상수 분리 체크
    const constantsPath = path.join(this.srcPath, 'constants');
    const constantFiles = fs.existsSync(constantsPath) ? fs.readdirSync(constantsPath) : [];
    details.constantsOrganization = `${constantFiles.length} constant files`;
    score += constantFiles.length > 2 ? 25 : constantFiles.length > 0 ? 20 : 0;

    // 컴포넌트 구조 체크
    const componentsPath = path.join(this.srcPath, 'components');
    const hasCommonComponents = fs.existsSync(path.join(componentsPath, 'common'));
    const hasUIComponents = fs.existsSync(path.join(componentsPath, 'ui'));
    details.componentStructure = `Common: ${hasCommonComponents}, UI: ${hasUIComponents}`;
    score += (hasCommonComponents && hasUIComponents) ? 25 : hasCommonComponents || hasUIComponents ? 15 : 5;

    this.metrics.architecture = { score: Math.min(score, 100), details };
    console.log(`   Score: ${this.metrics.architecture.score}/100`);
  }

  async checkPerformance() {
    console.log('⚡ Checking Performance...');
    
    const details = {};
    let score = 0;

    // 파일 크기 체크
    const allFiles = await glob('**/*.{ts,tsx,js,jsx}', { cwd: this.srcPath });
    let largeFiles = 0;
    let totalSize = 0;

    for (const file of allFiles) {
      const filePath = path.join(this.srcPath, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
      if (stats.size > 50 * 1024) { // 50KB
        largeFiles++;
      }
    }

    details.averageFileSize = `${Math.round(totalSize / allFiles.length / 1024)}KB`;
    details.largeFiles = `${largeFiles} files >50KB`;
    score += largeFiles === 0 ? 30 : largeFiles < 3 ? 25 : largeFiles < 5 ? 20 : 10;

    // 이미지 최적화 체크 (Next.js Image 사용)
    let imageOptimization = 0;
    let totalImages = 0;
    for (const file of allFiles.filter(f => f.endsWith('.tsx'))) {
      const content = fs.readFileSync(path.join(this.srcPath, file), 'utf8');
      const nextImages = (content.match(/from ['"]next\/image['"]/g) || []).length;
      const regularImages = (content.match(/<img/g) || []).length;
      totalImages += nextImages + regularImages;
      imageOptimization += nextImages;
    }
    details.imageOptimization = totalImages > 0 ? `${Math.round(imageOptimization / totalImages * 100)}%` : 'N/A';
    score += totalImages === 0 ? 35 : (imageOptimization / totalImages) > 0.8 ? 35 : (imageOptimization / totalImages) > 0.5 ? 25 : 15;

    // 동적 import 사용 체크
    let dynamicImports = 0;
    for (const file of allFiles) {
      const content = fs.readFileSync(path.join(this.srcPath, file), 'utf8');
      dynamicImports += (content.match(/import\(/g) || []).length;
    }
    details.dynamicImports = `${dynamicImports} dynamic imports`;
    score += dynamicImports > 5 ? 35 : dynamicImports > 2 ? 25 : dynamicImports > 0 ? 15 : 10;

    this.metrics.performance = { score: Math.min(score, 100), details };
    console.log(`   Score: ${this.metrics.performance.score}/100`);
  }

  async checkMaintainability() {
    console.log('🔧 Checking Maintainability...');
    
    const details = {};
    let score = 0;

    // 문서화 체크
    const docsPath = path.join(this.projectRoot, 'docs');
    const docFiles = fs.existsSync(docsPath) ? fs.readdirSync(docsPath).filter(f => f.endsWith('.md')) : [];
    details.documentation = `${docFiles.length} documentation files`;
    score += docFiles.length > 5 ? 25 : docFiles.length > 2 ? 20 : docFiles.length > 0 ? 15 : 5;

    // README 체크
    const readmePath = path.join(this.projectRoot, 'README.md');
    const hasReadme = fs.existsSync(readmePath);
    details.readme = hasReadme ? 'Present' : 'Missing';
    score += hasReadme ? 15 : 0;

    // 테스트 커버리지 체크
    const testFiles = await glob('**/*.{test,spec}.{ts,tsx,js,jsx}', { cwd: this.srcPath });
    const sourceFiles = await glob('**/*.{ts,tsx}', { 
      cwd: this.srcPath, 
      ignore: ['**/*.test.*', '**/*.spec.*', '**/scripts/**'] 
    });
    const testCoverage = sourceFiles.length > 0 ? (testFiles.length / sourceFiles.length * 100) : 0;
    details.testCoverage = `${Math.round(testCoverage)}%`;
    score += testCoverage > 70 ? 30 : testCoverage > 50 ? 25 : testCoverage > 30 ? 20 : testCoverage > 10 ? 15 : 5;

    // 스크립트 자동화 체크
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const scripts = Object.keys(packageJson.scripts || {});
    const automationScripts = scripts.filter(s => 
      s.includes('cleanup') || s.includes('audit') || s.includes('quality')
    );
    details.automationScripts = `${automationScripts.length} automation scripts`;
    score += automationScripts.length > 8 ? 30 : automationScripts.length > 5 ? 25 : automationScripts.length > 2 ? 20 : 10;

    this.metrics.maintainability = { score: Math.min(score, 100), details };
    console.log(`   Score: ${this.metrics.maintainability.score}/100`);
  }

  async checkSecurity() {
    console.log('🔒 Checking Security...');
    
    const details = {};
    let score = 0;

    // 환경변수 하드코딩 체크
    const allFiles = await glob('**/*.{ts,tsx,js,jsx}', { cwd: this.srcPath });
    let hardcodedSecrets = 0;
    const secretPatterns = [
      /api[_-]?key/i,
      /secret/i,
      /password/i,
      /token.*['"]\w{20,}/i
    ];

    for (const file of allFiles) {
      const content = fs.readFileSync(path.join(this.srcPath, file), 'utf8');
      for (const pattern of secretPatterns) {
        hardcodedSecrets += (content.match(pattern) || []).length;
      }
    }
    details.hardcodedSecrets = `${hardcodedSecrets} potential secrets`;
    score += hardcodedSecrets === 0 ? 30 : hardcodedSecrets < 3 ? 20 : 10;

    // 의존성 취약점 체크
    try {
      const auditOutput = execSync('npm audit --json', { 
        cwd: this.projectRoot, 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      const auditResult = JSON.parse(auditOutput);
      const vulnerabilities = Object.keys(auditResult.vulnerabilities || {}).length;
      details.vulnerabilities = `${vulnerabilities} vulnerabilities`;
      score += vulnerabilities === 0 ? 35 : vulnerabilities < 3 ? 25 : vulnerabilities < 10 ? 15 : 5;
    } catch (error) {
      details.vulnerabilities = 'Audit failed or vulnerabilities found';
      score += 15; // 중간 점수
    }

    // HTTPS 사용 체크
    let httpsUsage = 0;
    let httpUsage = 0;
    for (const file of allFiles) {
      const content = fs.readFileSync(path.join(this.srcPath, file), 'utf8');
      httpsUsage += (content.match(/https:\/\//g) || []).length;
      httpUsage += (content.match(/http:\/\/(?!localhost)/g) || []).length;
    }
    details.httpsUsage = `HTTPS: ${httpsUsage}, HTTP: ${httpUsage}`;
    score += httpUsage === 0 ? 35 : httpUsage < 3 ? 25 : 15;

    this.metrics.security = { score: Math.min(score, 100), details };
    console.log(`   Score: ${this.metrics.security.score}/100`);
  }

  calculateOverallScore() {
    const weights = {
      codeQuality: 0.25,
      architecture: 0.25,
      performance: 0.20,
      maintainability: 0.20,
      security: 0.10
    };

    this.overallScore = Object.entries(this.metrics).reduce((total, [category, data]) => {
      return total + (data.score * weights[category]);
    }, 0);
  }

  generateHealthReport() {
    console.log('\n🏥 Project Health Report');
    console.log('='.repeat(60));
    
    console.log(`\n🎯 Overall Health Score: ${Math.round(this.overallScore)}/100`);
    
    const healthLevel = this.getHealthLevel(this.overallScore);
    console.log(`📊 Health Level: ${healthLevel.emoji} ${healthLevel.label}`);
    
    console.log('\n📋 Category Scores:');
    Object.entries(this.metrics).forEach(([category, data]) => {
      const emoji = this.getScoreEmoji(data.score);
      console.log(`   ${emoji} ${this.formatCategoryName(category)}: ${data.score}/100`);
    });

    console.log('\n📝 Detailed Metrics:');
    Object.entries(this.metrics).forEach(([category, data]) => {
      console.log(`\n   ${this.formatCategoryName(category)}:`);
      Object.entries(data.details).forEach(([key, value]) => {
        console.log(`     • ${this.formatDetailKey(key)}: ${value}`);
      });
    });

    console.log('\n💡 Recommendations:');
    this.generateRecommendations();

    console.log('\n🎯 Next Steps:');
    console.log('   1. Address critical issues first');
    console.log('   2. Run: npm run quality:check');
    console.log('   3. Run: npm run cleanup:all');
    console.log('   4. Monitor metrics weekly');
  }

  getHealthLevel(score) {
    if (score >= 90) return { emoji: '🟢', label: 'Excellent' };
    if (score >= 80) return { emoji: '🟡', label: 'Good' };
    if (score >= 70) return { emoji: '🟠', label: 'Fair' };
    if (score >= 60) return { emoji: '🔴', label: 'Poor' };
    return { emoji: '💀', label: 'Critical' };
  }

  getScoreEmoji(score) {
    if (score >= 90) return '🟢';
    if (score >= 80) return '🟡';
    if (score >= 70) return '🟠';
    return '🔴';
  }

  formatCategoryName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1');
  }

  formatDetailKey(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.metrics.codeQuality.score < 80) {
      recommendations.push('Improve TypeScript usage and remove any types');
    }
    if (this.metrics.architecture.score < 80) {
      recommendations.push('Enhance domain-driven architecture structure');
    }
    if (this.metrics.performance.score < 80) {
      recommendations.push('Optimize bundle size and implement code splitting');
    }
    if (this.metrics.maintainability.score < 80) {
      recommendations.push('Add more tests and documentation');
    }
    if (this.metrics.security.score < 80) {
      recommendations.push('Address security vulnerabilities and hardcoded secrets');
    }

    if (recommendations.length === 0) {
      console.log('   🎉 Great job! Your project is in excellent health!');
    } else {
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const checker = new ProjectHealthChecker();
  checker.checkHealth().catch(console.error);
}

module.exports = ProjectHealthChecker;
