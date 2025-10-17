#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// ============================================
// 🔒 하드코딩된 시크릿 검사 스크립트
// ============================================

class SecretChecker {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.srcPath = path.join(this.projectRoot, 'src');
    this.secrets = [];
    
    // 시크릿 패턴들
    this.secretPatterns = [
      /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
      /secret[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
      /password\s*[:=]\s*['"][^'"]+['"]/gi,
      /token\s*[:=]\s*['"][^'"]+['"]/gi,
      /firebase[_-]?config\s*[:=]\s*\{[^}]+\}/gi,
      /process\.env\.[A-Z_]+/g
    ];
  }

  async check() {
    console.log('🔒 Checking for hardcoded secrets...\n');
    
    await this.scanFiles();
    
    this.generateReport();
  }

  async scanFiles() {
    console.log('🔍 Scanning files for secrets...');
    
    const files = await glob('**/*.{ts,tsx,js,jsx}', { 
      cwd: this.srcPath,
      ignore: ['**/*.d.ts', '**/node_modules/**', '**/scripts/**'],
      absolute: true 
    });

    for (const file of files) {
      await this.scanFile(file);
    }
  }

  async scanFile(filePath) {
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(this.srcPath, filePath);
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      this.secretPatterns.forEach(pattern => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // 환경변수 사용은 OK
            if (match.includes('process.env')) {
              return;
            }
            
            // 예시나 주석은 OK
            if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
              return;
            }
            
            // 실제 값이 있는 경우만 시크릿으로 간주
            if (match.includes('your-') || match.includes('example') || match.includes('xxx')) {
              return;
            }

            this.secrets.push({
              file: relativePath,
              line: index + 1,
              content: line.trim(),
              match: match,
              severity: this.getSeverity(match)
            });
          });
        }
      });
    });
  }

  getSeverity(match) {
    if (match.toLowerCase().includes('password') || match.toLowerCase().includes('secret')) {
      return 'HIGH';
    }
    if (match.toLowerCase().includes('api') || match.toLowerCase().includes('token')) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  generateReport() {
    console.log('\n🔒 Secret Check Report');
    console.log('='.repeat(50));
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total potential secrets: ${this.secrets.length}`);
    
    const high = this.secrets.filter(s => s.severity === 'HIGH').length;
    const medium = this.secrets.filter(s => s.severity === 'MEDIUM').length;
    const low = this.secrets.filter(s => s.severity === 'LOW').length;
    
    console.log(`   High severity: ${high}`);
    console.log(`   Medium severity: ${medium}`);
    console.log(`   Low severity: ${low}`);
    
    if (this.secrets.length > 0) {
      console.log('\n⚠️ Found Potential Secrets:');
      this.secrets.forEach(secret => {
        console.log(`   ${secret.severity} - ${secret.file}:${secret.line}`);
        console.log(`     ${secret.match}`);
      });
      
      console.log('\n💡 Recommendations:');
      console.log('   1. Move secrets to environment variables');
      console.log('   2. Use .env files for local development');
      console.log('   3. Use secure secret management in production');
      console.log('   4. Never commit real secrets to version control');
    } else {
      console.log('\n✅ No hardcoded secrets found!');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const checker = new SecretChecker();
  checker.check().catch(console.error);
}

module.exports = SecretChecker;
