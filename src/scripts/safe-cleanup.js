#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// ============================================
// 🧹 안전한 파일 정리 스크립트
// ============================================

class SafeCleanup {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.srcPath = path.join(this.projectRoot, 'src');
    this.removed = [];
    this.cleaned = [];
  }

  async cleanup() {
    console.log('🧹 Starting safe cleanup...\n');
    
    await this.removeUnusedImports();
    await this.removeTempFiles();
    await this.removeDebugFiles();
    
    this.generateReport();
  }

  async removeUnusedImports() {
    console.log('📦 Removing unused imports...');
    
    const files = [
      'src/app/admin/page.tsx',
      'src/app/admin/clubs/page.tsx'
    ];

    for (const file of files) {
      const filePath = path.join(this.projectRoot, file);
      if (!fs.existsSync(filePath)) continue;

      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;

      // 사용하지 않는 import 제거
      content = content.replace(/import\s+\{\s*where\s*,?\s*\}\s+from\s+['"][^'"]+['"];\s*\n/g, '');
      content = content.replace(/import\s+\{\s*,?\s*where\s*\}\s+from\s+['"][^'"]+['"];\s*\n/g, '');
      content = content.replace(/import\s+\{\s*Image\s*,?\s*\}\s+from\s+['"][^'"]+['"];\s*\n/g, '');
      content = content.replace(/import\s+\{\s*query\s*,?\s*\}\s+from\s+['"][^'"]+['"];\s*\n/g, '');
      
      // 빈 import 정리
      content = content.replace(/import\s+\{\s*\}\s+from\s+['"][^'"]+['"];\s*\n/g, '');

      if (content !== original) {
        fs.writeFileSync(filePath, content);
        this.cleaned.push(`Removed unused imports from ${file}`);
      }
    }
  }

  async removeTempFiles() {
    console.log('🗑️ Removing temporary files...');
    
    const tempPatterns = [
      '**/*.tmp',
      '**/*.temp',
      '**/.DS_Store',
      '**/Thumbs.db',
      '**/*.log',
      '**/npm-debug.log*',
      '**/yarn-debug.log*',
      '**/yarn-error.log*'
    ];

    for (const pattern of tempPatterns) {
      const files = await glob(pattern, { 
        cwd: this.projectRoot,
        absolute: true,
        dot: true 
      });

      for (const file of files) {
        try {
          fs.unlinkSync(file);
          this.removed.push(path.relative(this.projectRoot, file));
        } catch (error) {
          // 파일이 이미 없거나 권한 문제
        }
      }
    }
  }

  async removeDebugFiles() {
    console.log('🐛 Removing debug files...');
    
    // 안전하게 제거할 수 있는 스크립트 파일들
    const debugFiles = [
      'src/scripts/fix-type-errors.js',
      'src/scripts/quick-type-fix.js',
      'src/scripts/fix-hook-rules.js',
      'src/scripts/fix-nextjs15-params.js'
    ];

    for (const file of debugFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.removed.push(file);
      }
    }
  }

  generateReport() {
    console.log('\n🧹 Safe Cleanup Report');
    console.log('='.repeat(40));
    
    console.log(`\n📊 Summary:`);
    console.log(`   Files removed: ${this.removed.length}`);
    console.log(`   Files cleaned: ${this.cleaned.length}`);
    
    if (this.removed.length > 0) {
      console.log('\n🗑️ Removed Files:');
      this.removed.forEach(file => {
        console.log(`   • ${file}`);
      });
    }

    if (this.cleaned.length > 0) {
      console.log('\n✨ Cleaned Files:');
      this.cleaned.forEach(clean => {
        console.log(`   • ${clean}`);
      });
    }

    if (this.removed.length === 0 && this.cleaned.length === 0) {
      console.log('\n✨ No cleanup needed - project is already clean!');
    }

    console.log('\n💡 Note: Important files (types, constants, components) were preserved');
    console.log('   for project functionality and future development.');
  }
}

// 스크립트 실행
if (require.main === module) {
  const cleaner = new SafeCleanup();
  cleaner.cleanup().catch(console.error);
}

module.exports = SafeCleanup;
