#!/usr/bin/env node

/**
 * Migration script to update all /classes/mus240 references to /mus-240
 * This script will update all TypeScript/JavaScript files in the src directory
 */

const fs = require('fs');
const path = require('path');

// Patterns to replace
const patterns = [
  { from: /\/classes\/mus240/g, to: '/mus-240' },
];

// Extensions to process
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

// Directories to skip
const skipDirs = ['node_modules', '.git', 'dist', 'build'];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    patterns.forEach(pattern => {
      if (pattern.from.test(content)) {
        content = content.replace(pattern.from, pattern.to);
        updated = true;
      }
    });
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Updated: ${filePath}`);
      return 1;
    }
    return 0;
  } catch (error) {
    console.error(`✗ Error updating ${filePath}:`, error.message);
    return 0;
  }
}

function processDirectory(dir) {
  let filesUpdated = 0;
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!skipDirs.includes(entry.name)) {
          filesUpdated += processDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          filesUpdated += updateFile(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dir}:`, error.message);
  }
  
  return filesUpdated;
}

// Run the migration
console.log('🚀 Starting MUS240 route migration...\n');
const srcDir = path.join(process.cwd(), 'src');
const filesUpdated = processDirectory(srcDir);
console.log(`\n✅ Migration complete! Updated ${filesUpdated} files.`);
console.log('\nAll /classes/mus240 references have been updated to /mus-240');
