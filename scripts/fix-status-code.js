#!/usr/bin/env node

/**
 * Fix missing statusCode in ApiError responses
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

console.log('🔧 ApiError에 statusCode 추가...');

files.forEach(file => {
  const filePath = path.join(adapterDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  파일 없음: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // error 객체에 statusCode가 없는 경우 추가
  content = content.replace(
    /error:\s*\{\s*code:\s*['"][^'"]*['"],\s*message:\s*[^}]+\s*\}/g,
    (match) => {
      if (!match.includes('statusCode')) {
        return match.replace(/}/, ',\n          statusCode: 500\n        }');
      }
      return match;
    }
  );

  fs.writeFileSync(filePath, content);
  console.log(`✅ 수정 완료: ${file}`);
});

console.log('🎉 ApiError에 statusCode 추가 완료!');
