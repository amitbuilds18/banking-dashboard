import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function checkFiles(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += checkFiles(fullPath);
    } else if (entry.name.endsWith(".js") && entry.name !== "test-syntax.js") {
      execSync(`node --check "${fullPath}"`);
      count++;
    }
  }
  return count;
}

try {
  const checked = checkFiles(__dirname);
  console.log(`✅ Syntax check passed: ${checked} backend JavaScript files verified successfully.`);
  process.exit(0);
} catch (err) {
  console.error("❌ Syntax check failed:", err.message);
  process.exit(1);
}
