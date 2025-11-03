#!/usr/bin/env node

/**
 * Fix collection( 'xxx') to collection('xxx')
 */

const fs = require('fs');
const path = require('path');

const adapterDir = path.join(__dirname, '../src/adapters/firebase');

const files = [
  'user.ts',
  'member.ts',
  'club.ts',
  'notification.ts',
  'search.ts',
  'statistics.ts'
];

console.log('🔧 collection( 공백 제거...');

files.forEach(file => {
  const filePath = path.join(adapterDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  파일 없음: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Fix collection( 'xxx') to collection('xxx')
  content = content.replace(/\.collection\(\s+'/g, ".collection('");

  fs.writeFileSync(filePath, content);
  console.log(`✅ 수정 완료: ${file}`);
});

console.log('🎉 collection( 공백 제거 완료!');
