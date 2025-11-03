#!/usr/bin/env node

/**
 * Firebase Admin SDK Proper Implementation Fixer
 * - 올바른 Admin SDK 사용법: collection().where().orderBy().get()
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
  'notification.ts'
];

console.log('🔧 Firebase Admin SDK 올바른 구현으로 전체 수정...');

files.forEach(file => {
  const filePath = path.join(adapterDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  파일 없음: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. import 구문을 Timestamp만 남기고 모두 제거
  content = content.replace(
    /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]firebase-admin\/firestore['"];?/g,
    (match, imports) => {
      if (imports.includes('Timestamp')) {
        return `import { Timestamp } from 'firebase-admin/firestore';`;
      }
      return `// No direct imports from firebase-admin/firestore - use this.db methods`;
    }
  );

  // 2. query() 호출 제거 - Admin SDK는 query()가 없음
  content = content.replace(/this\.db\.query\([^)]*\)/g, (match) => {
    // query(collection) -> collection
    return match.replace(/this\.db\.query\(([^)]+)\)/, '$1');
  });

  // 3. query(q, where(...)) 패턴을 q.where(...)로 수정
  content = content.replace(/this\.db\.query\(([^,]+),\s*this\.db\.where\(([^)]+)\)\)/g, '$1.where($2)');
  content = content.replace(/this\.db\.query\(([^,]+),\s*this\.db\.orderBy\(([^)]+)\)\)/g, '$1.orderBy($2)');
  content = content.replace(/this\.db\.query\(([^,]+),\s*this\.db\.limit\(([^)]+)\)\)/g, '$1.limit($2)');

  // 4. 복합 쿼리 체이닝 수정
  content = content.replace(/(\w+)\s*=\s*this\.db\.query\(\w+,\s*this\.db\.where\(([^)]+)\)\);?/g, '$1 = $1.where($2);');
  content = content.replace(/(\w+)\s*=\s*this\.db\.query\(\w+,\s*this\.db\.orderBy\(([^)]+)\)\);?/g, '$1 = $1.orderBy($2);');

  // 5. getDocs()를 .get()으로 수정
  content = content.replace(/this\.db\.get\(/g, '.get(');

  // 6. collection(this.db, 'name')을 collection('name')으로 수정
  content = content.replace(/this\.db\.collection\(this\.db,\s*['"]/g, "this.db.collection('");

  fs.writeFileSync(filePath, content);
  console.log(`✅ 수정 완료: ${file}`);
});

console.log('🎉 Firebase Admin SDK 올바른 구현 전체 수정 완료!');
