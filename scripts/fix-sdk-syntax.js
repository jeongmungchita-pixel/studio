#!/usr/bin/env node

/**
 * Fix Firebase Admin SDK Syntax Errors
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

console.log('🔧 Firebase Admin SDK 구문 오류 수정...');

files.forEach(file => {
  const filePath = path.join(adapterDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  파일 없음: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. docRef(docRef(...)) 중복 수정
  content = content.replace(/const docRef = docRef\(this\.db,([^)]+)\)/g, 'const docRef = this.db.doc($1)');
  
  // 2. await .get( 수정
  content = content.replace(/await \.get\(/g, 'await docRef.get(');
  content = content.replace(/await \.get\(/g, 'await querySnapshot.get(');
  
  // 3. collection, this.db.where 패턴 수정
  content = content.replace(/(\w+),\s*this\.db\.where\(/g, '$1.where(');
  content = content.replace(/(\w+),\s*this\.db\.orderBy\(/g, '$1.orderBy(');
  content = content.replace(/(\w+),\s*this\.db\.limit\(/g, '$1.limit(');
  
  // 4. await .get( 컬렉션 수정
  content = content.replace(/await \.get\((\w+)\)/g, 'await $1.get()');

  fs.writeFileSync(filePath, content);
  console.log(`✅ 수정 완료: ${file}`);
});

console.log('🎉 Firebase Admin SDK 구문 오류 수정 완료!');
