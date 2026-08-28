import fs from "node:fs";
import path from "node:path";

const source = path.join("apps", "cliente", "dist");
const target = "dist";

if (!fs.existsSync(source)) {
  console.error(`Expected build output at ${source}`);
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });
console.log(`Synced ${source} -> ${target}`);
