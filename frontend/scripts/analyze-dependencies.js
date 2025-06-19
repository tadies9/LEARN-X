#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Analyzing dependencies...\n');

// Read package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};

// Dependencies to check for removal
const suspectDependencies = [
  // Duplicate or redundant
  'axios', // Already in root package.json
  'form-data', // Might not be needed with modern fetch
  
  // Heavy libraries to consider replacing
  'crypto-js', // Can use native crypto
  'date-fns', // Can use dayjs (much smaller)
  'jspdf', // Heavy, check if both PDF libs needed
  'html2canvas', // Heavy, check usage
  
  // Check if all Radix components are used
  '@radix-ui/react-navigation-menu',
  '@radix-ui/react-toggle',
  '@radix-ui/react-toggle-group',
  
  // Development tools to verify
  '@tanstack/react-query-devtools', // Should not be in production
  'cal-sans', // Custom font - check usage
];

console.log('📦 Checking potentially unused or redundant dependencies:\n');

suspectDependencies.forEach((dep) => {
  if (dependencies[dep]) {
    console.log(`❓ ${dep}`);
    try {
      // Try to find usage in the codebase
      const searchCmd = `grep -r "${dep}" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | wc -l`;
      const usageCount = parseInt(execSync(searchCmd, { encoding: 'utf8' }).trim());
      
      if (usageCount === 0) {
        console.log(`   ⚠️  No direct imports found - might be unused`);
      } else {
        console.log(`   ✓  Found ${usageCount} usage(s)`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not analyze usage`);
    }
  }
});

// Check bundle sizes of major dependencies
console.log('\n📊 Estimated sizes of heavy dependencies:\n');

const heavyDeps = [
  { name: '@react-pdf/renderer', size: '~4MB' },
  { name: 'react-pdf', size: '~9MB' },
  { name: 'mermaid', size: '~3MB' },
  { name: '@tiptap (all packages)', size: '~2MB' },
  { name: '@radix-ui (all packages)', size: '~2MB' },
  { name: 'recharts', size: '~1MB' },
  { name: 'framer-motion', size: '~500KB' },
  { name: 'react-syntax-highlighter', size: '~500KB' },
  { name: 'jspdf', size: '~500KB' },
  { name: 'html2canvas', size: '~450KB' },
  { name: 'date-fns', size: '~400KB' },
];

heavyDeps.forEach(({ name, size }) => {
  console.log(`📦 ${name}: ${size}`);
});

// Suggest optimizations
console.log('\n🚀 Optimization suggestions:\n');

console.log('1. Replace heavy dependencies:');
console.log('   - crypto-js → Web Crypto API');
console.log('   - date-fns → dayjs (~30KB)');
console.log('   - moment → dayjs (if used)');

console.log('\n2. Dynamic imports for:');
console.log('   - PDF libraries (load on demand)');
console.log('   - Mermaid diagrams (load on demand)');
console.log('   - Rich text editor (load on demand)');
console.log('   - Chart libraries (load on demand)');

console.log('\n3. Tree-shaking improvements:');
console.log('   - Import specific Radix components');
console.log('   - Import specific Lucide icons');
console.log('   - Import specific date-fns functions');

console.log('\n4. Consider removing:');
console.log('   - Unused Radix UI components');
console.log('   - Development dependencies from production');
console.log('   - Duplicate dependencies');

console.log('\n✅ Analysis complete!');