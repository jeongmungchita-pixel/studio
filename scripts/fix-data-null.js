#!/usr/bin/env node

/**
 * Add data null check after docSnap.data()
 */

const fs = require('fs');
const path = require('path');

const adapterDir = path.join(__dirname, '../src/adapters/firebase');

const files = [
  'user.ts', 
  'member.ts'
];

console.log('🔧 docSnap.data() null 체크 추가...');

files.forEach(file => {
  const filePath = path.join(adapterDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  파일 없음: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // data() 호출 후 null 체크 추가
  content = content.replace(
    /const data = docSnap\.data\(\);\s*return\s*\{/,
    'const data = docSnap.data();\n    if (!data) {\n      return null;\n    }\n\n    return {'
  );

  fs.writeFileSync(filePath, content);
  console.log(`✅ 수정 완료: ${file}`);
});

console.log('🎉 docSnap.data() null 체크 추가 완료!');
