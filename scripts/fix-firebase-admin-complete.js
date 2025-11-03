#!/usr/bin/env node

/**
 * Firebase Admin SDK Complete Fixer
 * - Admin SDK 올바른 사용법으로 완전히 수정
 */

const fs = require('fs');
const path = require('path');

const adapterDir = path.join(__dirname, '../src/adapters/firebase');

const files = [
  'auth.ts',
  'user.ts', 
  'member.ts',
  'club.ts',
  'statistics.ts',
  'search.ts',
  'notification.ts',
  'audit.ts'
];

console.log('🔧 Firebase Admin SDK 완전 수정 시작...');

files.forEach(file => {
  const filePath = path.join(adapterDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  파일 없음: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. import 구문을 최소한으로 - Timestamp와 collection만
  content = content.replace(
    /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]firebase-admin\/firestore['"];?/g,
    `import { Timestamp, collection as collectionRef } from 'firebase-admin/firestore';`
  );

  // 2. where() 호출을 this.db.where()로 수정
  content = content.replace(/\bwhere\(/g, 'this.db.where(');

  // 3. orderBy() 호출을 this.db.orderBy()로 수정  
  content = content.replace(/\borderBy\(/g, 'this.db.orderBy(');

  // 4. limit() 호출을 this.db.limit()로 수정
  content = content.replace(/\blimit\(/g, 'this.db.limit(');

  // 5. getDocs() 호출을 this.db.get()으로 수정
  content = content.replace(/\bgetDocs\(/g, 'this.db.get(');

  // 6. getDoc() 호출을 this.db.get()으로 수정
  content = content.replace(/\bgetDoc\(/g, 'this.db.get(');

  // 7. doc() 호출이 있는 경우 this.db.doc()으로 수정
  content = content.replace(/\bdoc\(/g, 'this.db.doc(');

  // 8. query() 호출이 아직 남아있는 경우 this.db.query()로 수정
  content = content.replace(/\bquery\(/g, 'this.db.query(');

  // 9. collection()이 아직 남아있는 경우 collectionRef()로 수정
  content = content.replace(/\bcollection\(/g, 'collectionRef(');

  fs.writeFileSync(filePath, content);
  console.log(`✅ 수정 완료: ${file}`);
});

console.log('🎉 Firebase Admin SDK 완전 수정 완료!');
