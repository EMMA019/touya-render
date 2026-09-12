#!/usr/bin/env node
/**
 * Static HTML export for Cloudflare Pages / Workers + Assets.
 * Hides Next.js API routes and proxy (unsupported by `output: "export"`).
 * Render keeps `npm run build` unchanged — this script is Cloudflare-only.
 */
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const hideDir = path.join(root, ".cf-hide");
const hiders = [
  { from: path.join(root, "src/app/api"), to: path.join(hideDir, "api") },
  { from: path.join(root, "src/proxy.ts"), to: path.join(hideDir, "proxy.ts") },
];

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE?.trim() || "https://touya.onrender.com";

async function run(cmd, args, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", env, cwd: root });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`));
    });
  });
}

async function hideServerOnly() {
  await rm(hideDir, { recursive: true, force: true });
  await mkdir(hideDir, { recursive: true });
  for (const item of hiders) {
    await rename(item.from, item.to);
  }
}

async function restoreServerOnly() {
  for (const item of hiders) {
    try {
      await rename(item.to, item.from);
    } catch {
      // already restored or never moved
    }
  }
  await rm(hideDir, { recursive: true, force: true });
}

async function main() {
  process.on("SIGINT", () => {
    void restoreServerOnly().finally(() => process.exit(130));
  });
  await hideServerOnly();
  try {
    await run("npx", ["next", "build"], {
      ...process.env,
      TOUYA_CF_PAGES: "1",
      NEXT_PUBLIC_API_BASE: apiBase,
    });
    await writeFile(
      path.join(root, "out", "_headers"),
      `/\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`,
      "utf8",
    );
  } finally {
    await restoreServerOnly();
  }
  console.log(`[touya] Cloudflare static export ready in ./out (API → ${apiBase})`);
}

main().catch(async (error) => {
  await restoreServerOnly();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
