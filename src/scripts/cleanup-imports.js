#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// ============================================
// 🧹 Import 정리 스크립트
// ============================================

class ImportCleaner {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.srcPath = path.join(this.projectRoot, 'src');
    this.cleaned = [];
    this.errors = [];
  }

  async clean() {
    console.log('🧹 Starting import cleanup...\n');
    
    try {
      const tsFiles = await glob('**/*.{ts,tsx}', { 
        cwd: this.srcPath,
        ignore: ['**/*.d.ts', '**/node_modules/**'],
        absolute: true 
      });

      for (const file of tsFiles) {
        await this.cleanFileImports(file);
      }

      this.generateReport();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  async cleanFileImports(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.srcPath, filePath);
      
      const cleanedContent = this.removeUnusedImports(content);
      
      if (content !== cleanedContent) {
        fs.writeFileSync(filePath, cleanedContent, 'utf8');
        this.cleaned.push({
          path: relativePath,
          originalLines: content.split('\n').length,
          cleanedLines: cleanedContent.split('\n').length,
          saved: content.length - cleanedContent.length
        });
      }
    } catch (error) {
      this.errors.push({
        path: path.relative(this.srcPath, filePath),
        error: error.message
      });
    }
  }

  removeUnusedImports(content) {
    const lines = content.split('\n');
    const cleanedLines = [];
    let inImportBlock = false;
    let currentImportBlock = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Import 문 시작 감지
      if (line.trim().startsWith('import ') && !line.includes(' from ')) {
        inImportBlock = true;
        currentImportBlock = [line];
        continue;
      }
      
      // 멀티라인 import 계속
      if (inImportBlock) {
        currentImportBlock.push(line);
        
        // Import 문 끝 감지
        if (line.includes(' from ') || line.trim().endsWith(';')) {
          const importStatement = currentImportBlock.join('\n');
          const cleanedImport = this.cleanImportStatement(importStatement, content);
          
          if (cleanedImport.trim()) {
            cleanedLines.push(cleanedImport);
          }
          
          inImportBlock = false;
          currentImportBlock = [];
          continue;
        }
        continue;
      }
      
      // 단일 라인 import
      if (line.trim().startsWith('import ') && line.includes(' from ')) {
        const cleanedImport = this.cleanImportStatement(line, content);
        if (cleanedImport.trim()) {
          cleanedLines.push(cleanedImport);
        }
        continue;
      }
      
      // 일반 라인
      cleanedLines.push(line);
    }

    return cleanedLines.join('\n');
  }

  cleanImportStatement(importStatement, fileContent) {
    // Default import 추출
    const defaultImportMatch = importStatement.match(/import\s+(\w+)(?:\s*,\s*\{[^}]*\})?\s+from/);
    const defaultImport = defaultImportMatch ? defaultImportMatch[1] : null;
    
    // Named imports 추출
    const namedImportsMatch = importStatement.match(/\{\s*([^}]+)\s*\}/);
    const namedImports = namedImportsMatch 
      ? namedImportsMatch[1].split(',').map(imp => imp.trim().split(' as ')[0].trim())
      : [];
    
    // From 경로 추출
    const fromMatch = importStatement.match(/from\s+['"`]([^'"`]+)['"`]/);
    const fromPath = fromMatch ? fromMatch[1] : '';

    // 사용되는 imports 필터링
    const usedNamedImports = namedImports.filter(imp => {
      if (!imp) return false;
      
      // import 문 자체를 제외하고 사용되는지 확인
      const regex = new RegExp(`\\b${imp}\\b`, 'g');
      const matches = fileContent.match(regex);
      return matches && matches.length > 1; // import 문 + 실제 사용
    });

    const isDefaultUsed = defaultImport && (() => {
      const regex = new RegExp(`\\b${defaultImport}\\b`, 'g');
      const matches = fileContent.match(regex);
      return matches && matches.length > 1;
    })();

    // 정리된 import 문 생성
    if (!isDefaultUsed && usedNamedImports.length === 0) {
      return ''; // 전체 import 제거
    }

    let cleanedImport = 'import ';
    
    if (isDefaultUsed && usedNamedImports.length > 0) {
      cleanedImport += `${defaultImport}, { ${usedNamedImports.join(', ')} }`;
    } else if (isDefaultUsed) {
      cleanedImport += defaultImport;
    } else if (usedNamedImports.length > 0) {
      cleanedImport += `{ ${usedNamedImports.join(', ')} }`;
    }
    
    cleanedImport += ` from '${fromPath}';`;
    
    return cleanedImport;
  }

  generateReport() {
    console.log('\n🧹 Import Cleanup Report');
    console.log('='.repeat(50));
    
    console.log(`\n📊 Summary:`);
    console.log(`   Files cleaned: ${this.cleaned.length}`);
    console.log(`   Errors: ${this.errors.length}`);
    
    if (this.cleaned.length > 0) {
      const totalSaved = this.cleaned.reduce((sum, file) => sum + file.saved, 0);
      console.log(`   Total bytes saved: ${totalSaved}`);
      
      console.log('\n✅ Cleaned Files:');
      this.cleaned.forEach(file => {
        const linesSaved = file.originalLines - file.cleanedLines;
        console.log(`   • ${file.path} (${linesSaved} lines removed, ${file.saved} bytes saved)`);
      });
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => {
        console.log(`   • ${error.path}: ${error.error}`);
      });
    }

    if (this.cleaned.length === 0 && this.errors.length === 0) {
      console.log('\n✨ All imports are already clean!');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const cleaner = new ImportCleaner();
  cleaner.clean().catch(console.error);
}

module.exports = ImportCleaner;
