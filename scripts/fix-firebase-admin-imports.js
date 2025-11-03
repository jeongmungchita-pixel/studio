#!/usr/bin/env node

/**
 * Firebase Admin SDK Import Fixer
 * - Client SDK import를 Admin SDK 방식으로 수정
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

console.log('🔧 Firebase Admin SDK Import 수정 시작...');

files.forEach(file => {
  const filePath = path.join(adapterDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  파일 없음: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. import 구문 수정 - query, where 등을 직접 import하지 않음
  content = content.replace(
    /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]firebase-admin\/firestore['"];?/g,
    (match, imports) => {
      // 필수 import만 남기기 (Timestamp, collection, doc 등)
      const essentialImports = imports
        .split(',')
        .map(item => item.trim())
        .filter(item => 
          item === 'Timestamp' || 
          item === 'collection' || 
          item === 'doc' ||
          item === 'collectionGroup' ||
          item.startsWith('collection as') ||
          item.startsWith('doc as')
        );
      
      if (essentialImports.length === 0) {
        return `import { Firestore } from 'firebase-admin/firestore';`;
      }
      
      return `import { ${essentialImports.join(', ')}, Firestore } from 'firebase-admin/firestore';`;
    }
  );

  // 2. query() 호출을 this.db.query()로 수정
  content = content.replace(/\bquery\(/g, 'this.db.query(');

  // 3. collection() 호출이 이미 collectionRef로 되어 있는지 확인
  if (content.includes('collection(') && !content.includes('collectionRef(')) {
    content = content.replace(
      /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]firebase-admin\/firestore['"];?/,
      (match, imports) => {
        const updatedImports = imports
          .split(',')
          .map(item => item.trim())
          .map(item => item === 'collection' ? 'collection as collectionRef' : item)
          .join(', ');
        return `import { ${updatedImports}, Firestore } from 'firebase-admin/firestore';`;
      }
    );
    content = content.replace(/\bcollection\(/g, 'collectionRef(');
  }

  fs.writeFileSync(filePath, content);
  console.log(`✅ 수정 완료: ${file}`);
});

console.log('🎉 Firebase Admin SDK Import 수정 완료!');
