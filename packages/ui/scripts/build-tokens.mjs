/**
 * Builds packages/ui/src/tokens.css from tokens/userx-tokens.json.
 * Palette vars are emitted for reference only; components must use semantic layer.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(
  readFileSync(join(root, "tokens", "userx-tokens.json"), "utf8"),
);

function resolveRef(value, palette) {
  if (typeof value !== "string") return String(value);
  const m = value.match(/^\{palette\.(\w+)\.(\w+)\}$/);
  if (!m) return value;
  const [, ramp, step] = m;
  return palette[ramp][step];
}

const lines = [];
lines.push("/*");
lines.push(" * GENERATED — do not edit by hand.");
lines.push(" * Source: packages/ui/tokens/userx-tokens.json");
lines.push(" * Run: npm run tokens:build --workspace @userx/ui");
lines.push(" *");
lines.push(" * Components must use ONLY semantic vars (--color-*, --space-*, …).");
lines.push(" * Palette vars (--palette-*) are private — never use in components.");
lines.push(" */");
lines.push(":root {");
lines.push("  /* ——— palette (private) ——— */");

for (const [ramp, steps] of Object.entries(tokens.palette)) {
  for (const [step, hex] of Object.entries(steps)) {
    lines.push(`  --palette-${ramp}-${step}: ${hex};`);
  }
}

lines.push("");
lines.push("  /* ——— semantic (public) ——— */");

const { color, font, lh, fw, space, radius, border, shadow } = tokens.semantic;

for (const [key, ref] of Object.entries(color)) {
  const hex = resolveRef(ref, tokens.palette);
  lines.push(`  --color-${key}: ${hex};`);
}

lines.push(`  --font-family: ${font.family};`);
for (const [k, v] of Object.entries(font)) {
  if (k === "family") continue;
  lines.push(`  --font-${k}: ${v};`);
}
for (const [k, v] of Object.entries(lh)) {
  lines.push(`  --lh-${k}: ${v};`);
}
for (const [k, v] of Object.entries(fw)) {
  lines.push(`  --fw-${k}: ${v};`);
}
for (const [k, v] of Object.entries(space)) {
  lines.push(`  --space-${k}: ${v};`);
}
for (const [k, v] of Object.entries(radius)) {
  lines.push(`  --radius-${k}: ${v};`);
}
lines.push(`  --border-width: ${border.width};`);
for (const [k, v] of Object.entries(shadow)) {
  lines.push(`  --shadow-${k}: ${v};`);
}

lines.push("}");
lines.push("");

writeFileSync(join(root, "src", "tokens.css"), lines.join("\n"), "utf8");
console.log("Wrote src/tokens.css");
