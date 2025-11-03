#!/usr/bin/env node

/**
 * Fix doc parameter types in Firebase adapters
 */

const fs = require('fs');
const path = require('path');

const adapterDir = path.join(__dirname, '../src/adapters/firebase');

const files = [
  'user.ts', 
  'member.ts',
  'club.ts',
  'statistics.ts',
  'search.ts',
  'notification.ts'
];

console.log('🔧 Firebase doc 파라미터 타입 수정...');

files.forEach(file => {
  const filePath = path.join(adapterDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  파일 없음: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // doc 파라미터에 any 타입 추가
  content = content.replace(/\.docs\.map\(doc => \(/g, '.docs.map((doc: any) => (');
  content = content.replace(/\.forEach\(\(doc\) => \{/g, '.forEach((doc: any) => {');

  fs.writeFileSync(filePath, content);
  console.log(`✅ 수정 완료: ${file}`);
});

console.log('🎉 Firebase doc 파라미터 타입 수정 완료!');
