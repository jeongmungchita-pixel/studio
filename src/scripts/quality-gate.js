#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================
// 🚪 품질 게이트 스크립트
// ============================================

class QualityGate {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.results = {
      typeCheck: { passed: false, errors: [] },
      lint: { passed: false, errors: [] },
      tests: { passed: false, errors: [] },
      cleanup: { passed: false, issues: [] },
      routes: { passed: false, issues: [] },
      security: { passed: false, vulnerabilities: [] }
    };
    this.overallPassed = false;
  }

  async run() {
    console.log('🚪 Running Quality Gate Checks...\n');
    
    try {
      await this.runTypeCheck();
      await this.runLintCheck();
      await this.runTests();
      await this.runCleanupCheck();
      await this.runRouteAudit();
      await this.runSecurityAudit();
      
      this.generateReport();
      this.setExitCode();
    } catch (error) {
      console.error('❌ Quality Gate failed with error:', error.message);
      process.exit(1);
    }
  }

  async runTypeCheck() {
    console.log('📝 Type Check...');
    try {
      execSync('npm run typecheck', { 
        cwd: this.projectRoot, 
        stdio: 'pipe' 
      });
      this.results.typeCheck.passed = true;
      console.log('   ✅ Type check passed');
    } catch (error) {
      this.results.typeCheck.errors.push(error.stdout?.toString() || error.message);
      console.log('   ❌ Type check failed');
    }
  }

  async runLintCheck() {
    console.log('🧹 Lint Check...');
    try {
      execSync('npm run lint', { 
        cwd: this.projectRoot, 
        stdio: 'pipe' 
      });
      this.results.lint.passed = true;
      console.log('   ✅ Lint check passed');
    } catch (error) {
      this.results.lint.errors.push(error.stdout?.toString() || error.message);
      console.log('   ❌ Lint check failed');
    }
  }

  async runTests() {
    console.log('🧪 Test Check...');
    try {
      execSync('npm run test -- --passWithNoTests', { 
        cwd: this.projectRoot, 
        stdio: 'pipe' 
      });
      this.results.tests.passed = true;
      console.log('   ✅ Tests passed');
    } catch (error) {
      this.results.tests.errors.push(error.stdout?.toString() || error.message);
      console.log('   ❌ Tests failed');
    }
  }

  async runCleanupCheck() {
    console.log('🔍 Cleanup Analysis...');
    try {
      const output = execSync('npm run cleanup:analyze', { 
        cwd: this.projectRoot, 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      // 분석 결과 파싱
      const issues = this.parseCleanupOutput(output);
      this.results.cleanup.issues = issues;
      this.results.cleanup.passed = issues.length === 0;
      
      if (this.results.cleanup.passed) {
        console.log('   ✅ No cleanup issues found');
      } else {
        console.log(`   ⚠️  Found ${issues.length} cleanup issues`);
      }
    } catch (error) {
      this.results.cleanup.issues.push('Cleanup analysis failed');
      console.log('   ❌ Cleanup analysis failed');
    }
  }

  async runRouteAudit() {
    console.log('🛣️  Route Audit...');
    try {
      const output = execSync('npm run audit:routes', { 
        cwd: this.projectRoot, 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      const issues = this.parseRouteOutput(output);
      this.results.routes.issues = issues;
      this.results.routes.passed = issues.length === 0;
      
      if (this.results.routes.passed) {
        console.log('   ✅ No route issues found');
      } else {
        console.log(`   ⚠️  Found ${issues.length} route issues`);
      }
    } catch (error) {
      this.results.routes.issues.push('Route audit failed');
      console.log('   ❌ Route audit failed');
    }
  }

  async runSecurityAudit() {
    console.log('🔒 Security Audit...');
    try {
      const output = execSync('npm audit --audit-level=moderate --json', { 
        cwd: this.projectRoot, 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      const auditResult = JSON.parse(output);
      const vulnerabilities = auditResult.vulnerabilities || {};
      const vulnCount = Object.keys(vulnerabilities).length;
      
      this.results.security.vulnerabilities = Object.entries(vulnerabilities)
        .map(([name, vuln]) => ({
          name,
          severity: vuln.severity,
          range: vuln.range
        }));
      
      this.results.security.passed = vulnCount === 0;
      
      if (this.results.security.passed) {
        console.log('   ✅ No security vulnerabilities found');
      } else {
        console.log(`   ⚠️  Found ${vulnCount} security vulnerabilities`);
      }
    } catch (error) {
      // npm audit가 취약점을 발견하면 exit code 1을 반환하므로 정상 처리
      try {
        const output = error.stdout?.toString();
        if (output) {
          const auditResult = JSON.parse(output);
          const vulnerabilities = auditResult.vulnerabilities || {};
          const vulnCount = Object.keys(vulnerabilities).length;
          
          this.results.security.vulnerabilities = Object.entries(vulnerabilities)
            .map(([name, vuln]) => ({
              name,
              severity: vuln.severity,
              range: vuln.range
            }));
          
          this.results.security.passed = vulnCount === 0;
          console.log(`   ⚠️  Found ${vulnCount} security vulnerabilities`);
        }
      } catch (parseError) {
        this.results.security.vulnerabilities.push('Security audit failed');
        console.log('   ❌ Security audit failed');
      }
    }
  }

  parseCleanupOutput(output) {
    const issues = [];
    // Only block on empty files or unused imports; others are warnings
    const emptyMatch = output.match(/Empty files: (\d+)/i);
    const emptyCount = emptyMatch ? parseInt(emptyMatch[1]) : 0;
    if (emptyCount > 0) {
      issues.push(`${emptyCount} empty files`);
    }

    // Summary line
    const unusedImportsMatch = output.match(/Files with Unused Imports: (\d+)/i);
    let unusedImportsCount = unusedImportsMatch ? parseInt(unusedImportsMatch[1]) : 0;
    // Fallback to scan report header
    if (unusedImportsCount === 0) {
      const fallback = output.match(/Found unused imports in (\d+) files/i);
      if (fallback) unusedImportsCount = parseInt(fallback[1]);
    }
    if (unusedImportsCount > 0) {
      issues.push(`${unusedImportsCount} files with unused imports`);
    }

    return issues;
  }

  parseRouteOutput(output) {
    const issues = [];
    // Treat only invalid and hardcoded routes as blocking
    const hasInvalid = output.includes('❌ Invalid Routes');
    const hasHardcoded = output.includes('🔧 Hardcoded Routes');
    if (hasInvalid || hasHardcoded) {
      issues.push('blocking route issues');
    }
    return issues;
  }

  generateReport() {
    console.log('\n🚪 Quality Gate Report');
    console.log('='.repeat(50));
    
    const checks = [
      { name: 'Type Check', result: this.results.typeCheck },
      { name: 'Lint Check', result: this.results.lint },
      { name: 'Tests', result: this.results.tests },
      { name: 'Cleanup', result: this.results.cleanup },
      { name: 'Routes', result: this.results.routes },
      { name: 'Security', result: this.results.security }
    ];
    
    let passedCount = 0;
    
    checks.forEach(check => {
      const status = check.result.passed ? '✅' : '❌';
      console.log(`${status} ${check.name}`);
      
      if (check.result.passed) {
        passedCount++;
      } else {
        // 에러 상세 정보 출력
        if (check.result.errors?.length > 0) {
          check.result.errors.forEach(error => {
            console.log(`   Error: ${error.substring(0, 100)}...`);
          });
        }
        if (check.result.issues?.length > 0) {
          check.result.issues.forEach(issue => {
            console.log(`   Issue: ${issue}`);
          });
        }
        if (check.result.vulnerabilities?.length > 0) {
          check.result.vulnerabilities.slice(0, 3).forEach(vuln => {
            console.log(`   Vulnerability: ${vuln.name} (${vuln.severity})`);
          });
        }
      }
    });
    
    console.log('\n📊 Summary:');
    console.log(`   Passed: ${passedCount}/${checks.length}`);
    console.log(`   Success Rate: ${Math.round(passedCount / checks.length * 100)}%`);
    
    this.overallPassed = passedCount === checks.length;
    
    if (this.overallPassed) {
      console.log('\n🎉 Quality Gate PASSED! 🎉');
    } else {
      console.log('\n💥 Quality Gate FAILED! 💥');
      console.log('\n💡 To fix issues:');
      console.log('   npm run quality:fix');
      console.log('   npm run cleanup:all');
    }
  }

  setExitCode() {
    process.exit(this.overallPassed ? 0 : 1);
  }
}

// 스크립트 실행
if (require.main === module) {
  const gate = new QualityGate();
  gate.run().catch(console.error);
}

module.exports = QualityGate;
