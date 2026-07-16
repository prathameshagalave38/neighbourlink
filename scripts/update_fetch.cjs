const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, '../frontend/src');

function updateFetchCalls(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      updateFetchCalls(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf-8');
      let updated = false;

      // Replace fetch("/api/...") with fetch(`${import.meta.env.VITE_API_URL || ""}/api/...`)
      // Regex explanation: look for fetch(" or fetch(' followed by /api/
      const regex1 = /fetch\(["'](\/api\/.*?)["']/g;
      if (regex1.test(content)) {
        content = content.replace(regex1, 'fetch(`${import.meta.env.VITE_API_URL || ""}$1`');
        updated = true;
      }

      // Replace fetch(`/api/...`) with fetch(`${import.meta.env.VITE_API_URL || ""}/api/...`)
      // Regex explanation: look for fetch(`/api/
      const regex2 = /fetch\(`(\/api\/.*?)`/g;
      if (regex2.test(content)) {
        content = content.replace(regex2, 'fetch(`${import.meta.env.VITE_API_URL || ""}$1`');
        updated = true;
      }

      if (updated) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated: ${filePath}`);
      }
    }
  }
}

updateFetchCalls(directory);
console.log("Done updating fetch calls.");
