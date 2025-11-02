#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TypeScript files
const files = glob.sync('src/**/*.{ts,tsx}', {
  ignore: ['**/node_modules/**', '**/.next/**']
});

let totalFixed = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Pattern: new APIError('message', 'CODE', number)
  // Should be: new APIError('message', number, 'CODE')
  const pattern = /new APIError\(([^,]+),\s*(['"][A-Z_]+['"]),\s*(\d+)\)/g;
  
  content = content.replace(pattern, (match, message, code, statusCode) => {
    totalFixed++;
    return `new APIError(${message}, ${statusCode}, ${code})`;
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`  Fixed: ${file}`);
  }
});

console.log(`\n✅ Fixed ${totalFixed} APIError calls`);
