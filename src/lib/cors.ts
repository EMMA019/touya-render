import { ANON_HEADER } from "./config";

const BUILTIN_EXACT = [
  "https://touya.onrender.com",
  "http://127.0.0.1:43127",
  "http://localhost:43127",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
];

const BUILTIN_SUFFIXES = [".pages.dev", ".workers.dev"];

/** Extra origins from Render env. Comma-separated. `*` allows any browser origin. */
export function extraCorsOrigins(): string[] {
  return (process.env.TOUYA_CORS_ORIGINS ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isAllowedCorsOrigin(origin: string): boolean {
  if (!origin) return false;
  const extras = extraCorsOrigins();
  if (extras.includes("*")) return true;
  if (BUILTIN_EXACT.includes(origin)) return true;
  for (const rule of extras) {
    if (rule === origin) return true;
    if (rule.includes("*") && wildcardMatch(rule, origin)) return true;
  }
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") return false;
    return BUILTIN_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

function wildcardMatch(rule: string, origin: string): boolean {
  const escaped = rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(origin);
}

export function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  headers.set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", `Content-Type, ${ANON_HEADER}`);
  headers.set("Access-Control-Max-Age", "86400");
  headers.set("Vary", "Origin");
  const origin = request.headers.get("origin") ?? "";
  if (origin && isAllowedCorsOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

export function applyCors(response: Response, request: Request): Response {
  const extra = corsHeaders(request);
  const headers = new Headers(response.headers);
  extra.forEach((value, key) => {
    headers.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function OPTIONS(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function jsonApi(request: Request, data: unknown, init?: ResponseInit): Response {
  return applyCors(Response.json(data, init), request);
}
