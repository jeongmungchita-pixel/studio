#!/usr/bin/env node

/**
 * Fix doc() method calls to use path strings
 */

const fs = require('fs');
const path = require('path');

const adapterDir = path.join(__dirname, '../src/adapters/firebase');

const files = [
  'user.ts', 
  'member.ts'
];

console.log('🔧 doc() 메서드 호출 수정...');

files.forEach(file => {
  const filePath = path.join(adapterDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  파일 없음: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // doc('collection', 'id') -> doc('collection/id')
  content = content.replace(/this\.db\.doc\('([^']+)',\s*'([^']+)'\)/g, "this.db.doc('$1/$2')");

  fs.writeFileSync(filePath, content);
  console.log(`✅ 수정 완료: ${file}`);
});

console.log('🎉 doc() 메서드 호출 수정 완료!');
