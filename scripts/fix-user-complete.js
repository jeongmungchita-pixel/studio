#!/usr/bin/env node

/**
 * Fix all Firebase Admin SDK method calls in user.ts
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/adapters/firebase/user.ts');

console.log('🔧 user.ts 전체 Firebase Admin SDK 수정...');

let content = fs.readFileSync(filePath, 'utf8');

// setDoc(docRef(...), data) -> doc(...).set(data)
content = content.replace(
  /await setDoc\(docRef\(this\.db, '([^']+)', '([^']+)'\), ([^)]+)\)/g,
  'await this.db.doc(`$1/$2`).set($3)'
);

// updateDoc(docRef(...), data) -> doc(...).update(data)
content = content.replace(
  /await updateDoc\(docRef\(this\.db, '([^']+)', '([^']+)'\), ([^)]+)\)/g,
  'await this.db.doc(`$1/$2`).update($3)'
);

// deleteDoc(docRef(...)) -> doc(...).delete()
content = content.replace(
  /await deleteDoc\(docRef\(this\.db, '([^']+)', '([^']+)'\)\)/g,
  'await this.db.doc(`$1/$2`).delete()'
);

// collection(..., where(...)) -> collection(...).where(...)
content = content.replace(
  /this\.db\.collection\(\s*'([^']+)'\s*,\s*this\.db\.where\(([^)]+)\)\s*\)/g,
  'this.db.collection(`$1`).where($2)'
);

// collection(..., where(...), orderBy(...)) -> collection(...).where(...).orderBy(...)
content = content.replace(
  /this\.db\.collection\(\s*'([^']+)'\s*,\s*this\.db\.where\(([^)]+)\),\s*this\.db\.orderBy\(([^)]+)\)\s*\)/g,
  'this.db.collection(`$1`).where($2).orderBy($3)'
);

// docRef.get(q) -> q.get()
content = content.replace(/await docRef\.get\((\w+)\)/g, 'await $1.get()');

// getCountFromServer -> .get().size
content = content.replace(
  /await getCountFromServer\((\w+)\)/g,
  'await $1.get()'
);
content = content.replace(/\.data\(\)\.count/g, '.size');

fs.writeFileSync(filePath, content);
console.log('✅ 수정 완료: user.ts');
