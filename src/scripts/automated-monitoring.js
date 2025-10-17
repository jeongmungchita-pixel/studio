#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// ============================================
// 🔍 자동화된 모니터링 시스템
// ============================================

class AutomatedMonitoring {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.logFile = path.join(this.projectRoot, 'monitoring.log');
    this.alerts = [];
    this.metrics = {};
  }

  async runFullMonitoring() {
    console.log('🔍 Starting automated monitoring...\n');
    
    await this.checkSystemHealth();
    await this.checkSecurity();
    await this.checkPerformance();
    await this.checkCodeQuality();
    await this.checkDependencies();
    
    this.generateReport();
    this.saveMetrics();
    
    if (this.alerts.length > 0) {
      this.sendAlerts();
    }
  }

  async checkSystemHealth() {
    console.log('🏥 Checking system health...');
    
    try {
      // TypeScript 컴파일 체크
      const { stdout: typeCheck } = await execAsync('npm run typecheck', { cwd: this.projectRoot });
      this.metrics.typeCheck = typeCheck.includes('error') ? 'FAIL' : 'PASS';
      
      // 빌드 테스트
      const { stdout: buildCheck } = await execAsync('npm run build', { cwd: this.projectRoot });
      this.metrics.buildCheck = buildCheck.includes('Failed') ? 'FAIL' : 'PASS';
      
      // 테스트 실행
      const { stdout: testCheck } = await execAsync('npm test -- --passWithNoTests --coverage --silent', { cwd: this.projectRoot });
      const coverageMatch = testCheck.match(/All files[^|]*\|\s*([0-9.]+)/);
      this.metrics.testCoverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;
      
    } catch (error) {
      this.alerts.push({
        level: 'ERROR',
        category: 'System Health',
        message: `System health check failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  async checkSecurity() {
    console.log('🔒 Checking security...');
    
    try {
      // npm audit 실행
      const { stdout: auditResult } = await execAsync('npm audit --json', { cwd: this.projectRoot });
      const audit = JSON.parse(auditResult);
      
      this.metrics.vulnerabilities = {
        total: audit.metadata?.vulnerabilities?.total || 0,
        high: audit.metadata?.vulnerabilities?.high || 0,
        moderate: audit.metadata?.vulnerabilities?.moderate || 0,
        low: audit.metadata?.vulnerabilities?.low || 0
      };

      // 고위험 취약점 알림
      if (this.metrics.vulnerabilities.high > 0) {
        this.alerts.push({
          level: 'CRITICAL',
          category: 'Security',
          message: `${this.metrics.vulnerabilities.high} high-severity vulnerabilities found`,
          timestamp: new Date().toISOString()
        });
      }

      // 시크릿 스캔
      const { stdout: secretScan } = await execAsync('node src/scripts/check-secrets.js', { cwd: this.projectRoot });
      this.metrics.secretScan = secretScan.includes('No hardcoded secrets found') ? 'PASS' : 'FAIL';
      
    } catch (error) {
      this.alerts.push({
        level: 'WARNING',
        category: 'Security',
        message: `Security check failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  async checkPerformance() {
    console.log('⚡ Checking performance...');
    
    try {
      // 번들 크기 분석
      const srcPath = path.join(this.projectRoot, 'src');
      const { stdout: bundleSize } = await execAsync(`find ${srcPath} -name "*.ts" -o -name "*.tsx" | xargs wc -c | tail -1`);
      const totalSize = parseInt(bundleSize.trim().split(/\s+/)[0]);
      
      this.metrics.bundleSize = {
        total: totalSize,
        average: totalSize / 100, // 대략적인 파일 수로 나눔
        status: totalSize > 5000000 ? 'WARNING' : 'GOOD' // 5MB 이상이면 경고
      };

      // 대용량 파일 체크
      const { stdout: largeFiles } = await execAsync(`find ${srcPath} -name "*.ts" -o -name "*.tsx" | xargs ls -la | awk '$5 > 50000 {print $9, $5}'`);
      this.metrics.largeFiles = largeFiles.trim().split('\n').filter(line => line.length > 0).length;

      if (this.metrics.largeFiles > 5) {
        this.alerts.push({
          level: 'WARNING',
          category: 'Performance',
          message: `${this.metrics.largeFiles} large files detected (>50KB)`,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.log('Performance check completed with warnings');
    }
  }

  async checkCodeQuality() {
    console.log('📝 Checking code quality...');
    
    try {
      // ESLint 실행
      const { stdout: lintResult } = await execAsync('npm run lint', { cwd: this.projectRoot });
      this.metrics.lintStatus = lintResult.includes('error') ? 'FAIL' : 'PASS';
      
      // Any 타입 사용량 체크
      const { stdout: anyTypes } = await execAsync(`grep -r ": any" ${path.join(this.projectRoot, 'src')} | wc -l`);
      this.metrics.anyTypeCount = parseInt(anyTypes.trim());
      
      if (this.metrics.anyTypeCount > 10) {
        this.alerts.push({
          level: 'WARNING',
          category: 'Code Quality',
          message: `High any type usage: ${this.metrics.anyTypeCount} occurrences`,
          timestamp: new Date().toISOString()
        });
      }

      // Console.log 사용량 체크
      const { stdout: consoleLogs } = await execAsync(`grep -r "console\\." ${path.join(this.projectRoot, 'src')} | wc -l`);
      this.metrics.consoleLogCount = parseInt(consoleLogs.trim());

    } catch (error) {
      console.log('Code quality check completed');
    }
  }

  async checkDependencies() {
    console.log('📦 Checking dependencies...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8'));
      
      this.metrics.dependencies = {
        total: Object.keys(packageJson.dependencies || {}).length + Object.keys(packageJson.devDependencies || {}).length,
        production: Object.keys(packageJson.dependencies || {}).length,
        development: Object.keys(packageJson.devDependencies || {}).length
      };

      // 오래된 패키지 체크
      const { stdout: outdated } = await execAsync('npm outdated --json', { cwd: this.projectRoot });
      const outdatedPackages = Object.keys(JSON.parse(outdated || '{}'));
      this.metrics.outdatedPackages = outdatedPackages.length;

      if (this.metrics.outdatedPackages > 10) {
        this.alerts.push({
          level: 'INFO',
          category: 'Dependencies',
          message: `${this.metrics.outdatedPackages} packages need updates`,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.log('Dependencies check completed');
    }
  }

  generateReport() {
    console.log('\n🔍 Automated Monitoring Report');
    console.log('='.repeat(60));
    
    console.log('\n📊 System Metrics:');
    console.log(`   TypeScript Check: ${this.metrics.typeCheck || 'N/A'}`);
    console.log(`   Build Check: ${this.metrics.buildCheck || 'N/A'}`);
    console.log(`   Test Coverage: ${this.metrics.testCoverage || 0}%`);
    console.log(`   Lint Status: ${this.metrics.lintStatus || 'N/A'}`);
    
    console.log('\n🔒 Security Metrics:');
    console.log(`   Vulnerabilities: ${this.metrics.vulnerabilities?.total || 0} total`);
    console.log(`   Secret Scan: ${this.metrics.secretScan || 'N/A'}`);
    
    console.log('\n⚡ Performance Metrics:');
    console.log(`   Bundle Size: ${Math.round((this.metrics.bundleSize?.total || 0) / 1024)} KB`);
    console.log(`   Large Files: ${this.metrics.largeFiles || 0}`);
    
    console.log('\n📝 Code Quality:');
    console.log(`   Any Types: ${this.metrics.anyTypeCount || 0}`);
    console.log(`   Console Logs: ${this.metrics.consoleLogCount || 0}`);
    
    console.log('\n📦 Dependencies:');
    console.log(`   Total Packages: ${this.metrics.dependencies?.total || 0}`);
    console.log(`   Outdated: ${this.metrics.outdatedPackages || 0}`);

    if (this.alerts.length > 0) {
      console.log('\n⚠️ Alerts:');
      this.alerts.forEach(alert => {
        console.log(`   ${alert.level} - ${alert.category}: ${alert.message}`);
      });
    } else {
      console.log('\n✅ No alerts - System is healthy!');
    }

    // 전체 건강도 점수 계산
    const healthScore = this.calculateHealthScore();
    console.log(`\n🎯 Overall Health Score: ${healthScore}/100`);
  }

  calculateHealthScore() {
    let score = 100;
    
    // 시스템 건강도 (40점)
    if (this.metrics.typeCheck === 'FAIL') score -= 15;
    if (this.metrics.buildCheck === 'FAIL') score -= 15;
    if (this.metrics.testCoverage < 30) score -= 10;
    
    // 보안 (30점)
    if (this.metrics.vulnerabilities?.high > 0) score -= 20;
    if (this.metrics.vulnerabilities?.moderate > 0) score -= 5;
    if (this.metrics.secretScan === 'FAIL') score -= 5;
    
    // 코드 품질 (20점)
    if (this.metrics.anyTypeCount > 10) score -= 10;
    if (this.metrics.consoleLogCount > 5) score -= 5;
    if (this.metrics.lintStatus === 'FAIL') score -= 5;
    
    // 성능 (10점)
    if (this.metrics.largeFiles > 5) score -= 5;
    if (this.metrics.bundleSize?.status === 'WARNING') score -= 5;
    
    return Math.max(0, score);
  }

  saveMetrics() {
    const logEntry = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      alerts: this.alerts,
      healthScore: this.calculateHealthScore()
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(this.logFile, logLine);
  }

  sendAlerts() {
    console.log('\n📧 Alert Summary:');
    const criticalAlerts = this.alerts.filter(a => a.level === 'CRITICAL');
    const warningAlerts = this.alerts.filter(a => a.level === 'WARNING');
    
    if (criticalAlerts.length > 0) {
      console.log(`   🚨 ${criticalAlerts.length} CRITICAL alerts`);
    }
    if (warningAlerts.length > 0) {
      console.log(`   ⚠️ ${warningAlerts.length} WARNING alerts`);
    }
    
    // 실제 환경에서는 여기서 이메일, 슬랙 등으로 알림 발송
    console.log('   📱 Alerts would be sent to monitoring channels');
  }
}

// 스크립트 실행
if (require.main === module) {
  const monitor = new AutomatedMonitoring();
  monitor.runFullMonitoring().catch(console.error);
}

module.exports = AutomatedMonitoring;
