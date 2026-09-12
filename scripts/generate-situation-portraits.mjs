/** Situation art is character-only. No <text>, name tags, or signs. Names live in UI data.
 * Reads shared/characters/*.json (skips _*) so a 5th character only needs JSON + this script.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = join(root, "shared/characters");

const LOOKS = {
  "cafe-rain": {
    sky: ["#4a1824", "#e08a78", "#1a0c10"],
    dress: "#d48a88",
    skirt: "#8a3a44",
    sleeve: "#e0b0a8",
    collar: "#f0d0c8",
  },
  "rainy-walk": {
    sky: ["#2a2438", "#6a7090", "#121018"],
    dress: "#3a3048",
    skirt: "#241828",
    sleeve: "#4a4058",
    collar: "#d8c8c0",
  },
  "office-after": {
    sky: ["#2c1018", "#c45a6a", "#14080c"],
    dress: "#f2e4dc",
    skirt: "#8a2438",
    sleeve: "#f6eee8",
    collar: "#c45a6a",
  },
  bookstore: {
    sky: ["#1c1410", "#8a6048", "#100c08"],
    dress: "#3a2418",
    skirt: "#241410",
    sleeve: "#4a3020",
    collar: "#f2e4dc",
  },
  "rooftop-night": {
    sky: ["#121428", "#6a7eb8", "#080810"],
    dress: "#1c2238",
    skirt: "#121428",
    sleeve: "#2a3050",
    collar: "#d0d8f8",
  },
  "park-bench": {
    sky: ["#101818", "#3a5048", "#080c0c"],
    dress: "#243038",
    skirt: "#141820",
    sleeve: "#2c3840",
    collar: "#d0d8f8",
  },
  "penthouse-dusk": {
    sky: ["#2a1a28", "#d4a0b8", "#120810"],
    dress: "#e0b0c4",
    skirt: "#8a5a70",
    sleeve: "#ecc4d0",
    collar: "#f6e4cc",
  },
  "mansion-library": {
    sky: ["#1a1210", "#6a4838", "#100808"],
    dress: "#4a3030",
    skirt: "#2a1818",
    sleeve: "#5a4040",
    collar: "#f6e4cc",
  },
  "quiet-room": {
    sky: ["#241820", "#c08090", "#100808"],
    dress: "#c08090",
    skirt: "#241820",
    sleeve: "#f0d0c8",
    collar: "#f0d0c8",
  },
  "flower-dusk": {
    sky: ["#3a2418", "#c4a078", "#1a100c"],
    dress: "#d8b898",
    skirt: "#6a4830",
    sleeve: "#e8d0b8",
    collar: "#f4e8dc",
  },
  "riverside-lantern": {
    sky: ["#241820", "#6a5860", "#100c0c"],
    dress: "#c8b49a",
    skirt: "#4a3830",
    sleeve: "#d8c8b4",
    collar: "#f0e4d4",
  },
  "office-late": {
    sky: ["#1c1820", "#8a6a78", "#100c10"],
    dress: "#f2e8e4",
    skirt: "#3a2430",
    sleeve: "#f6eee8",
    collar: "#d8c0c4",
  },
  "station-platform": {
    sky: ["#14141c", "#5a6070", "#0c0c10"],
    dress: "#2a2830",
    skirt: "#1a181c",
    sleeve: "#3a3840",
    collar: "#e8dcd8",
  },
  "river-night": {
    sky: ["#101418", "#5a6870", "#080a0c"],
    dress: "#2a3038",
    skirt: "#14181c",
    sleeve: "#3a4048",
    collar: "#c8d0d4",
  },
  darkroom: {
    sky: ["#1a1010", "#6a3030", "#100808"],
    dress: "#1c1414",
    skirt: "#100c0c",
    sleeve: "#2a1c1c",
    collar: "#d0c8c4",
  },
  conservatory: {
    sky: ["#241c18", "#c4b090", "#120e0c"],
    dress: "#c8b49a",
    skirt: "#6a5848",
    sleeve: "#d8c8b4",
    collar: "#f4eadc",
  },
  "stone-hall": {
    sky: ["#1a1612", "#6a5a48", "#0e0c0a"],
    dress: "#8a7a68",
    skirt: "#4a3c30",
    sleeve: "#9a8a78",
    collar: "#f0e4d4",
  },
  "night-cafe": {
    sky: ["#2a1c14", "#d4b48a", "#14100c"],
    dress: "#f2ebe3",
    skirt: "#d8c4a8",
    sleeve: "#f6f0ea",
    collar: "#fff8f2",
  },
  "shop-night": {
    sky: ["#1a1410", "#8a7060", "#100c0a"],
    dress: "#f2ebe3",
    skirt: "#c4a888",
    sleeve: "#f6f0ea",
    collar: "#fff8f2",
  },
  "quiet-cafe": {
    sky: ["#1c1814", "#d8c8b4", "#12100c"],
    dress: "#f4f0ea",
    skirt: "#b8a898",
    sleeve: "#f6f2ec",
    collar: "#fffaf4",
  },
  "garden-dusk": {
    sky: ["#141810", "#6a7060", "#0c100c"],
    dress: "#f4f0ea",
    skirt: "#a89888",
    sleeve: "#f6f2ec",
    collar: "#fffaf4",
  },
  "editorial-night": {
    sky: ["#101418", "#3a4a68", "#080a10"],
    dress: "#1a2438",
    skirt: "#10141c",
    sleeve: "#243048",
    collar: "#e8ecf2",
  },
  "night-lounge": {
    sky: ["#141018", "#4a4058", "#0c0a10"],
    dress: "#1a2438",
    skirt: "#10141c",
    sleeve: "#243048",
    collar: "#e8ecf2",
  },
  "hotel-lounge": {
    sky: ["#241c14", "#c4a070", "#120e0a"],
    dress: "#c4a070",
    skirt: "#6a4a30",
    sleeve: "#d8b888",
    collar: "#f6eee4",
  },
  "gallery-dusk": {
    sky: ["#1a1816", "#8a8880", "#10100e"],
    dress: "#c4a070",
    skirt: "#6a4a30",
    sleeve: "#d8b888",
    collar: "#f6eee4",
  },
  maid: {
    sky: ["#1a1214", "#4a3030", "#100808"],
    dress: "#1a1214",
    skirt: "#0e0a0c",
    sleeve: "#1a1214",
    collar: "#f4eee8",
    apron: true,
    band: "#f4eee8",
  },
  nurse: {
    sky: ["#e8f0f4", "#9ab0c0", "#1c2430"],
    dress: "#f4f7fa",
    skirt: "#2a3a4a",
    sleeve: "#eef3f6",
    collar: "#d0d8e0",
    cap: true,
  },
  miko: {
    sky: ["#2a1810", "#c45a48", "#140c08"],
    dress: "#f4eee8",
    skirt: "#b42828",
    sleeve: "#f4eee8",
    collar: "#f8f2ea",
    ribbon: true,
  },
  idol: {
    sky: ["#1a1028", "#c45a9a", "#0c0814"],
    dress: "#f4b8d0",
    skirt: "#1a1020",
    sleeve: "#f8d0e0",
    collar: "#fff4f8",
    spark: true,
  },
  halloween: {
    sky: ["#1c0c18", "#4a1c20", "#12080c"],
    dress: "#1a1220",
    skirt: "#141018",
    sleeve: "#1c141c",
    collar: "#2a1820",
    hat: true,
    pumpkins: true,
  },
};

function bodyExtras(look) {
  const parts = [];
  if (look.apron) {
    parts.push(`<path d="M150 390c16-8 30-10 46-10s30 2 46 10v210H150Z" fill="#f4eee8"/>`);
  }
  if (look.ribbon) {
    parts.push(`<path d="M196 330l-28 36h56Z" fill="#b42828"/>`);
    parts.push(`<circle cx="196" cy="328" r="6" fill="#f4eee8"/>`);
  }
  if (look.spark) {
    parts.push(`<circle cx="48" cy="140" r="4" fill="#fff6e8"/>`);
    parts.push(`<circle cx="342" cy="120" r="3" fill="#ffd0e8"/>`);
    parts.push(`<circle cx="70" cy="200" r="2.4" fill="#fff"/>`);
  }
  if (look.pumpkins) {
    parts.push(`<circle cx="46" cy="700" r="36" fill="#e08a2a"/>`);
    parts.push(`<circle cx="46" cy="700" r="20" fill="#2a1408"/>`);
    parts.push(`<circle cx="344" cy="680" r="28" fill="#f0a040"/>`);
    parts.push(`<circle cx="344" cy="680" r="16" fill="#2a1408"/>`);
  }
  return parts.join("");
}

function headExtras(look) {
  const parts = [];
  if (look.apron) {
    parts.push(`<rect x="168" y="154" width="56" height="10" rx="4" fill="#f4eee8"/>`);
  }
  if (look.cap) {
    parts.push(`<ellipse cx="196" cy="158" rx="58" ry="16" fill="#f4f7fa"/>`);
    parts.push(`<rect x="188" y="148" width="16" height="12" rx="2" fill="#c45a6a"/>`);
  }
  if (look.spark) {
    parts.push(`<rect x="168" y="154" width="56" height="8" rx="4" fill="#fff4f8"/>`);
  }
  if (look.hat) {
    parts.push(`<ellipse cx="196" cy="158" rx="86" ry="12" fill="#1a1224"/>`);
    parts.push(`<path d="M160 158l36-70 36 70c-12-8-24-10-36-10s-24 2-36 10Z" fill="#1a1224"/>`);
    parts.push(`<rect x="160" y="156" width="72" height="6" fill="#e08a2a"/>`);
  }
  return parts.join("");
}

function lookFor(scene, character) {
  const halloween =
    scene.costume === "halloween" ||
    scene.season === "halloween" ||
    String(scene.id).startsWith("halloween");
  const key = halloween ? "halloween" : LOOKS[scene.costume] ? scene.costume : scene.id;
  if (LOOKS[key]) return LOOKS[key];
  const p = character.palette ?? {};
  const hint = character.portrait ?? {};
  return {
    sky: [p.from ?? "#241820", p.to ?? "#c08090", hint.skyBot ?? "#100808"],
    dress: hint.dress ?? p.to ?? "#c08090",
    skirt: hint.skirt ?? p.from ?? "#241820",
    sleeve: hint.sleeve ?? p.accent ?? "#f0d0c8",
    collar: hint.collar ?? p.accent ?? "#f0d0c8",
  };
}

function portrait(character, scene, look) {
  const hair = character.palette?.hair ?? "#3a2428";
  const hairBack =
    character.portrait?.hair === "shoulder"
      ? "M96 300c14-150 40-220 100-220s86 70 100 220c6 80-16 160-100 170S90 380 96 300Z"
      : "M78 280c16-170 48-250 118-250s102 80 118 250c10 120-20 280-118 300S68 400 78 280Z";
  const [skyTop, skyMid, skyBot] = look.sky;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMin slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${skyTop}"/>
      <stop offset="42%" stop-color="${skyMid}"/>
      <stop offset="100%" stop-color="${skyBot}"/>
    </linearGradient>
  </defs>
  <rect width="390" height="844" fill="url(#sky)"/>
  <path d="${hairBack}" fill="${hair}"/>
  <path d="M168 318c6 46 14 70 28 70s22-24 28-70" fill="#e8b8a8"/>
  <path d="M156 348c12 16 28 22 40 22s28-6 40-22c-12 8-26 12-40 12s-28-4-40-12Z" fill="${look.collar}"/>
  <path d="M78 360c18-20 52-32 118-32s100 12 118 32c14 70 8 150-10 230H88c-18-80-24-160-10-230Z" fill="${look.dress}"/>
  <path d="M70 580c30 16 70 24 126 24s96-8 126-24c8 90 4 180-8 240H78c-12-60-16-150-8-240Z" fill="${look.skirt}"/>
  <path d="M78 372c-36 40-54 100-56 160-2 22 16 28 26 16 14-34 24-90 30-150Z" fill="${look.sleeve}"/>
  <path d="M312 372c36 40 54 100 56 160 2 22-16 28-26 16-14-34-24-90-30-150Z" fill="${look.sleeve}"/>
  <path d="M18 528c2 16 16 24 28 20 8-4 10-16 6-24-12-4-24-4-34 4Z" fill="#e8b8a8"/>
  <path d="M372 528c-2 16-16 24-28 20-8-4-10-16-6-24 12-4 24-4 34 4Z" fill="#e8b8a8"/>
  ${bodyExtras(look)}
  <ellipse cx="196" cy="236" rx="62" ry="78" fill="#f3c8b8"/>
  <path d="M134 210c12-78 30-108 62-108s50 30 62 108c-18-22-40-32-62-32s-44 10-62 32Z" fill="${hair}"/>
  <path d="M128 250c-10 50-8 110 6 160 10-40 14-90 8-150Zm134 0c10 50 8 110-6 160-10-40-14-90-8-150Z" fill="${hair}"/>
  <ellipse cx="172" cy="242" rx="5" ry="6" fill="#2a1c18"/>
  <ellipse cx="220" cy="242" rx="5" ry="6" fill="#2a1c18"/>
  <path d="M180 274c8 8 24 8 32 0" fill="none" stroke="#c47a6a" stroke-width="2.2" stroke-linecap="round"/>
  ${headExtras(look)}
</svg>
`;
}

function photorealPortrait(character, scene, look) {
  const hair = character.palette?.hair ?? "#3a2428";
  const hairBack =
    character.portrait?.hair === "shoulder"
      ? "M102 308c12-140 38-208 94-208s82 68 94 208c6 76-14 154-94 164S96 384 102 308Z"
      : "M84 286c14-158 46-236 112-236s98 78 112 236c8 112-18 268-112 286S76 398 84 286Z";
  const [skyTop, skyMid, skyBot] = look.sky;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMin slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${skyTop}"/>
      <stop offset="38%" stop-color="${skyMid}"/>
      <stop offset="100%" stop-color="${skyBot}"/>
    </linearGradient>
    <radialGradient id="key" cx="46%" cy="22%" r="52%">
      <stop offset="0%" stop-color="#fff6e8" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="skin" cx="45%" cy="38%" r="62%">
      <stop offset="0%" stop-color="#f6d2c0"/>
      <stop offset="70%" stop-color="#e8b8a4"/>
      <stop offset="100%" stop-color="#d4a090"/>
    </radialGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.18"/>
    </linearGradient>
  </defs>
  <rect width="390" height="844" fill="url(#sky)"/>
  <rect width="390" height="844" fill="url(#key)"/>
  <ellipse cx="70" cy="120" rx="28" ry="18" fill="#fff6e8" opacity="0.08"/>
  <ellipse cx="320" cy="160" rx="22" ry="14" fill="#fff6e8" opacity="0.06"/>
  <path d="${hairBack}" fill="${hair}"/>
  <path d="M170 322c4 40 12 64 26 64s22-24 26-64" fill="#e0b09a"/>
  <path d="M158 352c10 14 24 20 38 20s28-6 38-20c-12 6-24 10-38 10s-26-4-38-10Z" fill="${look.collar}"/>
  <path d="M82 368c16-16 50-28 114-28s98 12 114 28c12 66 6 146-8 224H90c-16-78-22-158-8-224Z" fill="${look.dress}"/>
  <path d="M74 584c28 14 68 22 122 22s94-8 122-22c6 86 2 176-6 236H80c-10-60-14-150-6-236Z" fill="${look.skirt}"/>
  <path d="M82 380c-32 38-48 96-50 154 0 20 14 26 24 14 12-32 22-86 26-144Z" fill="${look.sleeve}"/>
  <path d="M308 380c32 38 48 96 50 154 0 20-14 26-24 14-12-32-22-86-26-144Z" fill="${look.sleeve}"/>
  <path d="M24 530c2 14 14 22 26 18 8-4 10-14 6-22-12-4-22-4-32 4Z" fill="#e0b09a"/>
  <path d="M366 530c-2 14-14 22-26 18-8-4-10-14-6-22 12-4 22-4 32 4Z" fill="#e0b09a"/>
  ${bodyExtras(look)}
  <ellipse cx="196" cy="238" rx="54" ry="70" fill="url(#skin)"/>
  <ellipse cx="196" cy="238" rx="54" ry="70" fill="url(#shade)"/>
  <path d="M142 214c10-68 26-94 54-94s44 26 54 94c-16-18-34-26-54-26s-38 8-54 26Z" fill="${hair}"/>
  <path d="M138 248c-8 46-6 100 4 148 8-36 12-82 6-138Zm116 0c8 46 6 100-4 148-8-36-12-82-6-138Z" fill="${hair}"/>
  <ellipse cx="176" cy="244" rx="4" ry="4.4" fill="#2a2018"/>
  <ellipse cx="216" cy="244" rx="4" ry="4.4" fill="#2a2018"/>
  <path d="M194 248c1 8 2 12 2 16" fill="none" stroke="#c48a78" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M188 272c6 4 14 4 20 0" fill="none" stroke="#b4786a" stroke-width="1.6" stroke-linecap="round"/>
  ${headExtras(look)}
</svg>
`;
}

function loadRoster() {
  return readdirSync(catalogDir)
    .filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(catalogDir, file), "utf8")));
}

const require = createRequire(import.meta.url);

function which(bin) {
  const result = spawnSync("which", [bin], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

function writePngFromSvg(svg, pngPath) {
  try {
    const { Resvg } = require("@resvg/resvg-js");
    const png = new Resvg(svg, { fitTo: { mode: "width", value: 390 } }).render().asPng();
    writeFileSync(pngPath, png);
    return true;
  } catch {
    // optional devDependency — fall through
  }

  const rsvg = which("rsvg-convert");
  if (rsvg) {
    const tmpSvg = `${pngPath}.tmp.svg`;
    writeFileSync(tmpSvg, svg);
    const result = spawnSync(rsvg, ["-w", "390", "-h", "844", tmpSvg, "-o", pngPath], {
      encoding: "utf8",
    });
    rmSync(tmpSvg, { force: true });
    if (result.status === 0 && existsSync(pngPath)) return true;
  }

  const chrome =
    process.env.CHROME_PATH ||
    which("google-chrome") ||
    which("chromium") ||
    which("chromium-browser");
  if (!chrome) return false;

  const dir = mkdtempSync(join(tmpdir(), "touya-portrait-"));
  try {
    const htmlPath = join(dir, "index.html");
    const shotPath = join(dir, "shot.png");
    const body = svg.replace(/<\?xml[^>]*>/, "");
    writeFileSync(
      htmlPath,
      `<!doctype html><html><head><style>
html,body{margin:0;padding:0;background:#000;width:390px;height:844px;overflow:hidden}
svg{display:block;width:390px;height:844px}
</style></head><body>${body}</body></html>`
    );
    const result = spawnSync(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--window-size=390,844",
        `--screenshot=${shotPath}`,
        `file://${htmlPath}`,
      ],
      { encoding: "utf8", timeout: 30_000 }
    );
    if (result.status === 0 && existsSync(shotPath)) {
      writeFileSync(pngPath, readFileSync(shotPath));
      return true;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return false;
}

/** Rasterize SVG → PNG. Never overwrites an existing PNG (photo art stays). */
export function rasterizeSvgToPng(svg, pngPath, { force = false } = {}) {
  if (!force && existsSync(pngPath)) return "kept";
  return writePngFromSvg(svg, pngPath) ? "wrote" : "skipped";
}

export function writePortraits(roster = loadRoster()) {
  let count = 0;
  let pngWrote = 0;
  let pngKept = 0;
  let pngSkipped = 0;
  for (const character of roster) {
    for (const scene of character.situations ?? []) {
      const look = lookFor(scene, character);
      const dir = join(root, "public/situations", character.id);
      mkdirSync(dir, { recursive: true });
      const draw = character.artStyle === "photoreal" ? photorealPortrait : portrait;
      const svg = draw(character, scene, look);
      writeFileSync(join(dir, `${scene.id}.svg`), svg);
      const pngStatus = rasterizeSvgToPng(svg, join(dir, `${scene.id}.png`));
      if (pngStatus === "wrote") pngWrote += 1;
      else if (pngStatus === "kept") pngKept += 1;
      else pngSkipped += 1;
      count += 1;
    }
  }
  return { count, pngWrote, pngKept, pngSkipped };
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const { count, pngWrote, pngKept, pngSkipped } = writePortraits();
  console.log(`wrote ${count} situation SVG portraits`);
  console.log(`png: ${pngWrote} filled, ${pngKept} existing kept, ${pngSkipped} skipped`);
  if (pngSkipped > 0) {
    console.warn("missing PNG rasterizer (rsvg-convert or chrome). JSON still points at .png — fill those files before ship.");
  }
}
