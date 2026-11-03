const fs = require('fs');
const path = require('path');

/**
 * Fix incorrect zod imports in compiled files
 * TypeScript incorrectly compiles 'zod' imports to '../zod' in files within the zod directory
 */
function fixZodImports(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      fixZodImports(filePath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      // Fix require("../zod") to require("zod") in zod directory files and middlewares
      if (dir.includes(path.join('dist', 'zod')) || filePath.includes('validationError.js')) {
        content = content.replace(/require\(["']\.\.\/zod["']\)/g, 'require("zod")');
      }

      // Fix require("../../zod/...") to require("@/zod/...") equivalent
      // Actually, these should stay as relative imports for the zod schemas

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed imports in: ${filePath}`);
      }
    }
  });
}

// Fix imports in dist directory
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  fixZodImports(distDir);
  console.log('Zod imports fixed!');
} else {
  console.log('dist directory not found');
}

