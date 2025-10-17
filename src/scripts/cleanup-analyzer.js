#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// ============================================
// 🧹 코드 정리 분석기
// ============================================

class CleanupAnalyzer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.srcPath = path.join(this.projectRoot, 'src');
    
    this.unusedFiles = [];
    this.duplicateCode = [];
    this.deprecatedPatterns = [];
    this.largeFiles = [];
    this.emptyFiles = [];
    this.unusedImports = [];
    this.unusedExports = [];
    this.suggestions = [];
  }

  async analyze() {
    console.log('🧹 Starting cleanup analysis...\n');
    
    await this.findUnusedFiles();
    await this.findEmptyFiles();
    await this.findLargeFiles();
    await this.findDeprecatedPatterns();
    await this.findUnusedImports();
    await this.findDuplicateCode();
    
    this.generateReport();
  }

  async findUnusedFiles() {
    console.log('📁 Scanning for unused files...');
    
    try {
      const allFiles = await glob('**/*.{ts,tsx,js,jsx}', { 
        cwd: this.srcPath,
        ignore: ['**/*.d.ts', '**/node_modules/**'],
        absolute: true 
      });

      const importMap = new Map();
      const exportMap = new Map();

      // 모든 파일의 import/export 분석
      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(this.srcPath, file);
        
        // import 문 찾기
        const imports = this.extractImports(content);
        imports.forEach(imp => {
          if (!importMap.has(imp)) importMap.set(imp, []);
          importMap.get(imp).push(relativePath);
        });
        
        // export 문 찾기
        const exports = this.extractExports(content);
        exportMap.set(relativePath, exports);
      }

      // 사용되지 않는 파일 찾기
      for (const [filePath, exports] of exportMap.entries()) {
        const isImported = Array.from(importMap.keys()).some(imp => 
          imp.includes(filePath.replace(/\.(ts|tsx|js|jsx)$/, ''))
        );
        
        const isEntryPoint = this.isEntryPoint(filePath);
        
        if (!isImported && !isEntryPoint && exports.length > 0) {
          this.unusedFiles.push({
            path: filePath,
            exports: exports.length,
            size: fs.statSync(path.join(this.srcPath, filePath)).size
          });
        }
      }

      console.log(`   Found ${this.unusedFiles.length} potentially unused files`);
    } catch (error) {
      console.error('Error scanning unused files:', error);
    }
  }

  async findEmptyFiles() {
    console.log('📄 Scanning for empty files...');
    
    try {
      const allFiles = await glob('**/*.{ts,tsx,js,jsx}', { 
        cwd: this.srcPath,
        absolute: true 
      });

      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf8').trim();
        const relativePath = path.relative(this.srcPath, file);
        
        // 빈 파일이거나 주석만 있는 파일
        const meaningfulContent = content
          .replace(/\/\*[\s\S]*?\*\//g, '') // 블록 주석 제거
          .replace(/\/\/.*$/gm, '') // 라인 주석 제거
          .replace(/\s+/g, '') // 공백 제거
          .replace(/['"`]use client['"`];?/g, '') // use client 제거
          .replace(/['"`]use server['"`];?/g, ''); // use server 제거
        
        if (meaningfulContent.length === 0) {
          this.emptyFiles.push({
            path: relativePath,
            size: fs.statSync(file).size
          });
        }
      }

      console.log(`   Found ${this.emptyFiles.length} empty files`);
    } catch (error) {
      console.error('Error scanning empty files:', error);
    }
  }

  async findLargeFiles() {
    console.log('📊 Scanning for large files...');
    
    try {
      const allFiles = await glob('**/*.{ts,tsx,js,jsx}', { 
        cwd: this.srcPath,
        absolute: true 
      });

      for (const file of allFiles) {
        const stats = fs.statSync(file);
        const relativePath = path.relative(this.srcPath, file);
        
        // 50KB 이상의 파일
        if (stats.size > 50 * 1024) {
          const content = fs.readFileSync(file, 'utf8');
          const lines = content.split('\n').length;
          
          this.largeFiles.push({
            path: relativePath,
            size: stats.size,
            lines,
            sizeKB: Math.round(stats.size / 1024)
          });
        }
      }

      // 크기순 정렬
      this.largeFiles.sort((a, b) => b.size - a.size);
      console.log(`   Found ${this.largeFiles.length} large files (>50KB)`);
    } catch (error) {
      console.error('Error scanning large files:', error);
    }
  }

  async findDeprecatedPatterns() {
    console.log('⚠️  Scanning for deprecated patterns...');
    
    try {
      const allFiles = await glob('**/*.{ts,tsx,js,jsx}', { 
        cwd: this.srcPath,
        absolute: true 
      });

      const deprecatedPatterns = [
        { pattern: /class\s+\w+Component\s+extends\s+React\.Component/g, reason: 'Class components (consider hooks)' },
        { pattern: /componentDidMount|componentWillUnmount|componentDidUpdate/g, reason: 'Lifecycle methods (use useEffect)' },
        { pattern: /React\.FC</g, reason: 'React.FC type (use function declaration)' },
        { pattern: /defaultProps/g, reason: 'defaultProps (use default parameters)' },
        { pattern: /PropTypes/g, reason: 'PropTypes (use TypeScript types)' },
        { pattern: /\.bind\(this\)/g, reason: 'Function binding (use arrow functions)' },
        { pattern: /var\s+/g, reason: 'var declaration (use const/let)' },
        { pattern: /==\s*(?!null)/g, reason: 'Loose equality (use ===)' },
        { pattern: /console\.log/g, reason: 'Console.log (remove or use proper logging)' },
        { pattern: /any/g, reason: 'any type (use specific types)' },
      ];

      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(this.srcPath, file);
        
        for (const { pattern, reason } of deprecatedPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            this.deprecatedPatterns.push({
              path: relativePath,
              pattern: reason,
              count: matches.length,
              examples: matches.slice(0, 3) // 처음 3개 예시만
            });
          }
        }
      }

      console.log(`   Found ${this.deprecatedPatterns.length} deprecated pattern usages`);
    } catch (error) {
      console.error('Error scanning deprecated patterns:', error);
    }
  }

  async findUnusedImports() {
    console.log('📦 Scanning for unused imports...');
    
    try {
      const allFiles = await glob('**/*.{ts,tsx}', { 
        cwd: this.srcPath,
        absolute: true 
      });

      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(this.srcPath, file);
        
        // import 문 추출
        const importMatches = content.match(/import\s+.*?from\s+['"`].*?['"`];?/g);
        if (!importMatches) continue;
        
        const unusedInFile = [];
        
        for (const importStatement of importMatches) {
          // named imports 추출
          const namedImports = this.extractNamedImports(importStatement);
          
          for (const namedImport of namedImports) {
            // 파일 내에서 사용되는지 확인
            const usageRegex = new RegExp(`\\b${namedImport}\\b`, 'g');
            const usages = content.match(usageRegex);
            
            // import 문 자체를 제외하고 사용되지 않으면
            if (!usages || usages.length <= 1) {
              unusedInFile.push(namedImport);
            }
          }
        }
        
        if (unusedInFile.length > 0) {
          this.unusedImports.push({
            path: relativePath,
            unused: unusedInFile
          });
        }
      }

      console.log(`   Found unused imports in ${this.unusedImports.length} files`);
    } catch (error) {
      console.error('Error scanning unused imports:', error);
    }
  }

  async findDuplicateCode() {
    console.log('🔄 Scanning for duplicate code...');
    
    try {
      const allFiles = await glob('**/*.{ts,tsx}', { 
        cwd: this.srcPath,
        absolute: true 
      });

      const codeBlocks = new Map();
      
      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(this.srcPath, file);
        
        // 함수 블록 추출
        const functions = this.extractFunctions(content);
        
        for (const func of functions) {
          const normalized = this.normalizeCode(func.body);
          
          if (normalized.length > 100) { // 최소 길이 체크
            if (!codeBlocks.has(normalized)) {
              codeBlocks.set(normalized, []);
            }
            codeBlocks.get(normalized).push({
              file: relativePath,
              name: func.name,
              lines: func.lines
            });
          }
        }
      }
      
      // 중복 코드 찾기
      for (const [code, locations] of codeBlocks.entries()) {
        if (locations.length > 1) {
          this.duplicateCode.push({
            locations,
            codeLength: code.length,
            similarity: '100%'
          });
        }
      }

      console.log(`   Found ${this.duplicateCode.length} potential code duplications`);
    } catch (error) {
      console.error('Error scanning duplicate code:', error);
    }
  }

  // 헬퍼 메서드들
  extractImports(content) {
    const imports = [];
    const importRegex = /import\s+.*?from\s+['"`](.*?)['"`]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  extractExports(content) {
    const exports = [];
    const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  extractNamedImports(importStatement) {
    const namedImports = [];
    
    // { name1, name2 } 패턴
    const namedMatch = importStatement.match(/\{\s*([^}]+)\s*\}/);
    if (namedMatch) {
      const names = namedMatch[1].split(',').map(name => 
        name.trim().split(' as ')[0].trim()
      );
      namedImports.push(...names);
    }
    
    // default import
    const defaultMatch = importStatement.match(/import\s+(\w+)\s+from/);
    if (defaultMatch) {
      namedImports.push(defaultMatch[1]);
    }
    
    return namedImports;
  }

  extractFunctions(content) {
    const functions = [];
    
    // 함수 선언 패턴들
    const patterns = [
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        functions.push({
          name: match[1],
          body: match[2],
          lines: match[0].split('\n').length
        });
      }
    }
    
    return functions;
  }

  normalizeCode(code) {
    return code
      .replace(/\s+/g, ' ') // 공백 정규화
      .replace(/\/\*[\s\S]*?\*\//g, '') // 주석 제거
      .replace(/\/\/.*$/gm, '')
      .trim();
  }

  isEntryPoint(filePath) {
    const entryPatterns = [
      /page\.tsx?$/,
      /layout\.tsx?$/,
      /loading\.tsx?$/,
      /error\.tsx?$/,
      /not-found\.tsx?$/,
      /route\.ts$/,
      /middleware\.ts$/,
      /^app\//,
      /index\.tsx?$/,
    ];
    
    return entryPatterns.some(pattern => pattern.test(filePath));
  }

  generateReport() {
    console.log('\n🧹 Cleanup Analysis Report');
    console.log('='.repeat(50));
    
    console.log(`\n📊 Summary:`);
    console.log(`   Unused files: ${this.unusedFiles.length}`);
    console.log(`   Empty files: ${this.emptyFiles.length}`);
    console.log(`   Large files: ${this.largeFiles.length}`);
    console.log(`   Deprecated patterns: ${this.deprecatedPatterns.length}`);
    console.log(`   Files with unused imports: ${this.unusedImports.length}`);
    console.log(`   Duplicate code blocks: ${this.duplicateCode.length}`);

    // 상세 리포트
    if (this.unusedFiles.length > 0) {
      console.log('\n🗑️  Unused Files:');
      this.unusedFiles.forEach(file => {
        console.log(`   • ${file.path} (${file.exports} exports, ${Math.round(file.size/1024)}KB)`);
      });
    }

    if (this.emptyFiles.length > 0) {
      console.log('\n📄 Empty Files:');
      this.emptyFiles.forEach(file => {
        console.log(`   • ${file.path}`);
      });
    }

    if (this.largeFiles.length > 0) {
      console.log('\n📊 Large Files (>50KB):');
      this.largeFiles.slice(0, 10).forEach(file => {
        console.log(`   • ${file.path} (${file.sizeKB}KB, ${file.lines} lines)`);
      });
    }

    if (this.deprecatedPatterns.length > 0) {
      console.log('\n⚠️  Deprecated Patterns:');
      this.deprecatedPatterns.slice(0, 10).forEach(item => {
        console.log(`   • ${item.path}: ${item.pattern} (${item.count} occurrences)`);
      });
    }

    if (this.unusedImports.length > 0) {
      console.log('\n📦 Files with Unused Imports:');
      this.unusedImports.slice(0, 10).forEach(item => {
        console.log(`   • ${item.path}: ${item.unused.join(', ')}`);
      });
    }

    if (this.duplicateCode.length > 0) {
      console.log('\n🔄 Duplicate Code:');
      this.duplicateCode.slice(0, 5).forEach((item, index) => {
        console.log(`   ${index + 1}. Found in ${item.locations.length} files:`);
        item.locations.forEach(loc => {
          console.log(`      - ${loc.file}: ${loc.name}()`);
        });
      });
    }

    // 정리 권장사항
    console.log('\n💡 Cleanup Recommendations:');
    console.log('   1. Remove empty and unused files');
    console.log('   2. Split large files into smaller modules');
    console.log('   3. Update deprecated patterns to modern alternatives');
    console.log('   4. Remove unused imports');
    console.log('   5. Extract duplicate code into shared utilities');
    console.log('   6. Consider code splitting for large components');
  }
}

// 스크립트 실행
if (require.main === module) {
  const analyzer = new CleanupAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = CleanupAnalyzer;
