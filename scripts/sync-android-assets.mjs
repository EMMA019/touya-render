/**
 * Copy situation art from public/situations/ into the Android assets folder so
 * the app can show the same PNGs offline (SituationArt.kt maps /situations/...
 * to file:///android_asset/situations/...). Web stays the source of truth.
 *
 *   npm run sync-android            # copy new / changed files
 *   npm run sync-android -- --check # exit 1 if anything differs (CI)
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "public/situations");
const dest = join(root, "android/app/src/main/assets/situations");
const check = process.argv.includes("--check");
const EXT = /\.(png|svg|webp|jpg|mp4)$/i;

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (EXT.test(name)) out.push(path);
  }
  return out;
}

function digest(path) {
  return createHash("sha1").update(readFileSync(path)).digest("hex");
}

let copied = 0;
let same = 0;
const stale = [];
for (const file of walk(src)) {
  const rel = relative(src, file);
  const target = join(dest, rel);
  if (existsSync(target) && digest(target) === digest(file)) {
    same += 1;
    continue;
  }
  if (check) {
    stale.push(rel);
    continue;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(file));
  copied += 1;
}

if (check) {
  if (stale.length > 0) {
    console.error(`android assets out of date (${stale.length}):\n- ${stale.join("\n- ")}\nrun: npm run sync-android`);
    process.exit(1);
  }
  console.log(`android assets in sync (${same} files)`);
} else {
  console.log(`android assets: ${copied} copied, ${same} unchanged`);
}
