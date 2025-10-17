#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// ============================================
// 🔧 Any 타입 사용량 줄이기 스크립트
// ============================================

class AnyTypeReducer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.srcPath = path.join(this.projectRoot, 'src');
    this.fixed = [];
    this.anyCount = 0;
  }

  async reduce() {
    console.log('🔧 Reducing any type usage...\n');
    
    await this.findAndFixAnyTypes();
    
    this.generateReport();
  }

  async findAndFixAnyTypes() {
    console.log('🔍 Finding and fixing any types...');
    
    const files = await glob('**/*.{ts,tsx}', { 
      cwd: this.srcPath,
      ignore: ['**/*.d.ts', '**/node_modules/**'],
      absolute: true 
    });

    for (const file of files) {
      await this.processFile(file);
    }
  }

  async processFile(filePath) {
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    const relativePath = path.relative(this.srcPath, filePath);

    // any 타입 카운트
    const anyMatches = content.match(/:\s*any\b/g);
    if (anyMatches) {
      this.anyCount += anyMatches.length;
    }

    // 1. 이벤트 핸들러 any 타입 수정
    content = content.replace(
      /\(([^)]*?)\s*:\s*any\)\s*=>/g,
      '($1: React.MouseEvent<HTMLElement> | React.FormEvent<HTMLElement>) =>'
    );

    // 2. 폼 필드 any 타입 수정
    content = content.replace(
      /field\s*:\s*any/g,
      'field: { name: string; value: any; onChange: (value: any) => void }'
    );

    // 3. 일반적인 객체 any 타입 수정
    content = content.replace(
      /:\s*any\[\]/g,
      ': unknown[]'
    );

    // 4. 함수 매개변수 any 타입 수정
    content = content.replace(
      /\(([^)]*?)\s*:\s*any\)/g,
      '($1: unknown)'
    );

    // 5. 속성 any 타입 수정
    content = content.replace(
      /(\w+)\s*:\s*any;/g,
      '$1: unknown;'
    );

    // 6. React 컴포넌트 props any 수정
    content = content.replace(
      /props\s*:\s*any/g,
      'props: Record<string, unknown>'
    );

    // 7. 이벤트 객체 any 수정
    content = content.replace(
      /event?\s*:\s*any/g,
      'event: Event'
    );

    // 8. 데이터 객체 any 수정
    content = content.replace(
      /data\s*:\s*any/g,
      'data: Record<string, unknown>'
    );

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      this.fixed.push(`Reduced any types in ${relativePath}`);
    }
  }

  generateReport() {
    console.log('\n🔧 Any Type Reduction Report');
    console.log('='.repeat(50));
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total any types found: ${this.anyCount}`);
    console.log(`   Files fixed: ${this.fixed.length}`);
    
    if (this.fixed.length > 0) {
      console.log('\n✅ Fixed Files:');
      this.fixed.forEach(fix => {
        console.log(`   • ${fix}`);
      });
    } else {
      console.log('\n✨ No any types to fix!');
    }

    console.log('\n💡 Next Steps:');
    console.log('   1. Run: npm run typecheck');
    console.log('   2. Review and adjust specific types as needed');
    console.log('   3. Consider using generic types for better type safety');
  }
}

// 스크립트 실행
if (require.main === module) {
  const reducer = new AnyTypeReducer();
  reducer.reduce().catch(console.error);
}

module.exports = AnyTypeReducer;
