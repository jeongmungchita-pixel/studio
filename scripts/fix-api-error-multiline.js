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
  
  // Pattern for multi-line: new APIError(\n'message',\n'CODE',\nnumber\n)
  // Should be: new APIError(\n'message',\nnumber,\n'CODE'\n)
  const pattern = /new APIError\(([^,]+),\s*(['"][A-Z_]+['"])\s*,\s*(\d+)/gs;
  
  content = content.replace(pattern, (match, message, code, statusCode) => {
    totalFixed++;
    return `new APIError(${message}, ${statusCode}, ${code}`;
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`  Fixed: ${file}`);
  }
});

console.log(`\n✅ Fixed ${totalFixed} APIError calls`);
