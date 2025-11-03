#!/usr/bin/env node

/**
 * Remove duplicate this.db calls
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

console.log('🔧 중복 this.db 제거...');

files.forEach(file => {
  const filePath = path.join(adapterDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  파일 없음: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 중복된 this.db 제거
  content = content.replace(/this\.db\.this\.db\./g, 'this.db.');
  content = content.replace(/this\.db\.collection\(this\.db\,/g, 'this.db.collection(');
  content = content.replace(/this\.db\.doc\(this\.db\,/g, 'this.db.doc(');

  fs.writeFileSync(filePath, content);
  console.log(`✅ 수정 완료: ${file}`);
});

console.log('🎉 중복 this.db 제거 완료!');
