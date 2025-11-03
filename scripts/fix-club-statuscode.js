#!/usr/bin/env node

/**
 * Add missing statusCode to all ApiError objects in club.ts
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/adapters/firebase/club.ts');

console.log('🔧 club.ts ApiError에 statusCode 추가...');

let content = fs.readFileSync(filePath, 'utf8');

// 모든 error 객체에 statusCode 추가
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
console.log('✅ 수정 완료: club.ts');
