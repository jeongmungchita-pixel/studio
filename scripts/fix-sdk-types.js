#!/usr/bin/env node

/**
 * Fix Firebase Admin SDK Type Issues
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

console.log('🔧 Firebase Admin SDK 타입 문제 수정...');

files.forEach(file => {
  const filePath = path.join(adapterDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  파일 없음: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 쿼리 변수에 any 타입 추가
  content = content.replace(/let q = this\.db\.collection\(/g, 'let q: any = this.db.collection(');
  content = content.replace(/let q = collection\(/g, 'let q: any = collection(');

  fs.writeFileSync(filePath, content);
  console.log(`✅ 수정 완료: ${file}`);
});

console.log('🎉 Firebase Admin SDK 타입 문제 수정 완료!');
