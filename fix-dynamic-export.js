const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all .tsx files in src/app directory
const files = glob.sync('src/app/**/*.tsx', {
  cwd: process.cwd(),
  absolute: true
});

let fixedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Check if file has the problematic pattern
  if (content.includes("'use client'") && content.includes("export const dynamic = 'force-dynamic'")) {
    // Remove the export const dynamic line and any comment before it
    content = content.replace(/\/\/.*Disable static generation.*\n/g, '');
    content = content.replace(/export const dynamic = 'force-dynamic';\n/g, '');
    
    // Write back the fixed content
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✅ Fixed: ${path.relative(process.cwd(), file)}`);
    fixedCount++;
  }
});

console.log(`\n🎉 Fixed ${fixedCount} files with dynamic export issues!`);
