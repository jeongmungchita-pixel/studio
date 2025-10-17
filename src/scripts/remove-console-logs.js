#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// ============================================
// 🧹 Console.log 제거 스크립트
// ============================================

class ConsoleLogRemover {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.srcPath = path.join(this.projectRoot, 'src');
    this.cleaned = [];
    this.errors = [];
  }

  async clean() {
    console.log('🧹 Removing console.log statements...\n');
    
    try {
      const tsFiles = await glob('**/*.{ts,tsx}', { 
        cwd: this.srcPath,
        ignore: ['**/*.d.ts', '**/node_modules/**', '**/scripts/**'],
        absolute: true 
      });

      for (const file of tsFiles) {
        await this.cleanFile(file);
      }

      this.generateReport();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  async cleanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.srcPath, filePath);
      
      const cleanedContent = this.removeConsoleLogs(content);
      
      if (content !== cleanedContent) {
        fs.writeFileSync(filePath, cleanedContent, 'utf8');
        
        const originalLines = content.split('\n');
        const cleanedLines = cleanedContent.split('\n');
        const removedCount = originalLines.length - cleanedLines.length;
        
        this.cleaned.push({
          path: relativePath,
          removedLines: removedCount,
          savedBytes: content.length - cleanedContent.length
        });
      }
    } catch (error) {
      this.errors.push({
        path: path.relative(this.srcPath, filePath),
        error: error.message
      });
    }
  }

  removeConsoleLogs(content) {
    const lines = content.split('\n');
    const cleanedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // console.log 라인 감지 및 제거
      if (this.isConsoleLogLine(trimmedLine)) {
        // 멀티라인 console.log 처리
        if (this.isMultilineStart(trimmedLine)) {
          // 닫는 괄호를 찾을 때까지 스킵
          while (i < lines.length && !this.isMultilineEnd(lines[i])) {
            i++;
          }
        }
        // 단일 라인이면 그냥 스킵
        continue;
      }
      
      cleanedLines.push(line);
    }

    return cleanedLines.join('\n');
  }

  isConsoleLogLine(line) {
    // console.log, console.error, console.warn, console.info 등
    const consolePatterns = [
      /^\s*console\.(log|error|warn|info|debug|trace)\s*\(/,
      /^\s*console\.(log|error|warn|info|debug|trace)`/,
      /^\s*console\.(log|error|warn|info|debug|trace)\[/
    ];
    
    return consolePatterns.some(pattern => pattern.test(line));
  }

  isMultilineStart(line) {
    // 괄호가 열렸지만 닫히지 않은 경우
    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;
    return openParens > closeParens;
  }

  isMultilineEnd(line) {
    // 세미콜론으로 끝나거나 닫는 괄호가 있는 경우
    return line.includes(');') || line.trim().endsWith(';');
  }

  generateReport() {
    console.log('\n🧹 Console Log Removal Report');
    console.log('='.repeat(50));
    
    console.log(`\n📊 Summary:`);
    console.log(`   Files cleaned: ${this.cleaned.length}`);
    console.log(`   Errors: ${this.errors.length}`);
    
    if (this.cleaned.length > 0) {
      const totalLines = this.cleaned.reduce((sum, file) => sum + file.removedLines, 0);
      const totalBytes = this.cleaned.reduce((sum, file) => sum + file.savedBytes, 0);
      
      console.log(`   Total lines removed: ${totalLines}`);
      console.log(`   Total bytes saved: ${totalBytes}`);
      
      console.log('\n✅ Cleaned Files:');
      this.cleaned.forEach(file => {
        console.log(`   • ${file.path} (${file.removedLines} lines, ${file.savedBytes} bytes)`);
      });
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => {
        console.log(`   • ${error.path}: ${error.error}`);
      });
    }

    if (this.cleaned.length === 0 && this.errors.length === 0) {
      console.log('\n✨ No console.log statements found!');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const remover = new ConsoleLogRemover();
  remover.clean().catch(console.error);
}

module.exports = ConsoleLogRemover;
