#!/usr/bin/env node

/**
 * Firebase Admin SDK Correct Implementation
 * - Admin SDK의 올바른 사용법: 모든 것을 Firestore 인스턴스에서 호출
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

console.log('🔧 Firebase Admin SDK 올바른 구현으로 수정...');

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

  // 2. 모든 Firestore 메서드 호출을 this.db에서 직접 호출하도록 수정
  const replacements = [
    { pattern: /\bcollectionRef\(/g, replacement: 'this.db.collection(' },
    { pattern: /\bthis\.db\.where\(/g, replacement: 'this.db.where(' },
    { pattern: /\bthis\.db\.orderBy\(/g, replacement: 'this.db.orderBy(' },
    { pattern: /\bthis\.db\.limit\(/g, replacement: 'this.db.limit(' },
    { pattern: /\bthis\.db\.query\(/g, replacement: 'this.db.query(' },
    { pattern: /\bthis\.db\.doc\(/g, replacement: 'this.db.doc(' },
    { pattern: /\bthis\.db\.get\(/g, replacement: 'this.db.get(' },
    { pattern: /\bthis\.db\.collection\(/g, replacement: 'this.db.collection(' }
  ];

  replacements.forEach(({ pattern, replacement }) => {
    content = content.replace(pattern, replacement);
  });

  // 3. collectionRef가 정의되어 있다면 제거
  content = content.replace(/const collectionRef = this\.db\.collection;/g, '');
  content = content.replace(/collectionRef\(/g, 'this.db.collection(');

  fs.writeFileSync(filePath, content);
  console.log(`✅ 수정 완료: ${file}`);
});

console.log('🎉 Firebase Admin SDK 올바른 구현 수정 완료!');
