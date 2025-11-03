#!/usr/bin/env node

/**
 * Fix docSnap.exists() to docSnap.exists
 */

const fs = require('fs');
const path = require('path');

const adapterDir = path.join(__dirname, '../src/adapters/firebase');

const files = [
  'user.ts', 
  'member.ts'
];

console.log('🔧 docSnap.exists() 수정...');

files.forEach(file => {
  const filePath = path.join(adapterDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  파일 없음: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // exists() -> exists
  content = content.replace(/docSnap\.exists\(\)/g, 'docSnap.exists');

  fs.writeFileSync(filePath, content);
  console.log(`✅ 수정 완료: ${file}`);
});

console.log('🎉 docSnap.exists() 수정 완료!');
