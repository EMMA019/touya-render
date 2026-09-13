import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

const RASTER = /\.(png|webp|jpe?g)$/i;
const MIN_REAL_BYTES = 1000;

/** Generated SVG silhouettes and missing rasters are stubs — do not show on the shelf. */
export function hasRealSituationArt(path: string | null | undefined): boolean {
  const rel = path?.trim().replace(/^\//, "") ?? "";
  if (!rel || !RASTER.test(rel)) return false;
  const abs = join(process.cwd(), "public", rel);
  if (!existsSync(abs)) return false;
  try {
    return statSync(abs).size >= MIN_REAL_BYTES;
  } catch {
    return false;
  }
}

/** Public listing: keep real NSFW/SFW rasters, drop stub / missing files. */
export function publicArtPath(path: string | null | undefined): string | null {
  const value = path?.trim() || null;
  if (!value || !hasRealSituationArt(value)) return null;
  return value;
}
