/**
 * Browser origin of the Render API.
 * Empty = same-origin (local `next dev` / Render-hosted UI).
 * Cloudflare Pages may set NEXT_PUBLIC_API_BASE=https://touya.onrender.com.
 * Android keeps its own API_BASE_URL and does not read this.
 */
export function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_BASE ?? "").trim().replace(/\/+$/, "");
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = apiBase();
  return base ? `${base}${normalized}` : normalized;
}

export function isCrossOriginApi(): boolean {
  return apiBase().length > 0;
}
