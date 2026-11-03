const fs = require('fs');
const path = require('path');

/**
 * Fix @/ path aliases in compiled JavaScript files
 * Converts @/ imports to relative paths within dist directory
 */
function fixPathAliases(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      fixPathAliases(filePath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      // Replace @/ imports with relative paths
      // Match require("@/something") or require('@/something')
      const aliasRegex = /require\(["']@\/([^"']+)["']\)/g;
      content = content.replace(aliasRegex, (match, importPath) => {
        // Calculate relative path from current file to target in dist directory
        const currentDir = path.dirname(filePath);
        const distDir = path.join(__dirname, '..', 'dist');
        const targetPath = path.join(distDir, importPath);
        const relativePath = path.relative(currentDir, targetPath);
        const normalizedPath = relativePath.replace(/\\/g, '/');
        // Ensure path starts with ./
        const finalPath = normalizedPath.startsWith('.') ? normalizedPath : './' + normalizedPath;
        return `require("${finalPath}")`;
      });

      // Also fix import statements (though less common in CommonJS)
      const importRegex = /from ["']@\/([^"']+)["']/g;
      content = content.replace(importRegex, (match, importPath) => {
        const currentDir = path.dirname(filePath);
        const distDir = path.join(__dirname, '..', 'dist');
        const targetPath = path.join(distDir, importPath);
        const relativePath = path.relative(currentDir, targetPath);
        const normalizedPath = relativePath.replace(/\\/g, '/');
        const finalPath = normalizedPath.startsWith('.') ? normalizedPath : './' + normalizedPath;
        return `from "${finalPath}"`;
      });

      // Fix incorrect zod imports that were mistakenly replaced
      // If we see require("../zod") or require("../../zod") WITHOUT a slash after 'zod', it should be "zod" (npm package)
      // But keep require("../zod/auth") as is (it's a local file)
      content = content.replace(/require\(['"]\.\.\/zod['"]\)/g, "require('zod')");
      content = content.replace(/require\(['"]\.\.\/\.\.\/zod['"]\)/g, "require('zod')");
      content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/zod['"]\)/g, "require('zod')");
      content = content.replace(/from ['"]\.\.\/zod['"]/g, "from 'zod'");
      content = content.replace(/from ['"]\.\.\/\.\.\/zod['"]/g, "from 'zod'");
      content = content.replace(/from ['"]\.\.\/\.\.\/\.\.\/zod['"]/g, "from 'zod'");
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed path aliases in: ${filePath}`);
      }
    }
  });
}

// Fix imports in dist directory
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  fixPathAliases(distDir);
  console.log('Path aliases fixed!');
} else {
  console.log('dist directory not found');
}
