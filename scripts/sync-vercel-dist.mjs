import fs from "node:fs";
import path from "node:path";

const clienteRoot = path.join("apps", "cliente");
const distSource = path.join(clienteRoot, "dist");
const distTarget = "dist";

if (!fs.existsSync(distSource)) {
  console.error(`Expected build output at ${distSource}`);
  process.exit(1);
}

fs.rmSync(distTarget, { recursive: true, force: true });
fs.cpSync(distSource, distTarget, { recursive: true });
console.log(`Synced ${distSource} -> ${distTarget}`);

for (const item of ["api", "lib"]) {
  const source = path.join(clienteRoot, item);
  fs.rmSync(item, { recursive: true, force: true });
  fs.cpSync(source, item, { recursive: true });
  console.log(`Synced ${source} -> ${item}`);
}

const middlewareSource = path.join(clienteRoot, "middleware.ts");
fs.copyFileSync(middlewareSource, "middleware.ts");
console.log(`Synced ${middlewareSource} -> middleware.ts`);
