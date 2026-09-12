export const ANON_STORAGE_KEY = "touya_anon_id";
export const ANON_COOKIE = "touya_anon";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Client-only install id. No name, email, or other PII. */
export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(ANON_STORAGE_KEY) ?? "";
  if (!UUID.test(id)) {
    id = crypto.randomUUID();
    window.localStorage.setItem(ANON_STORAGE_KEY, id);
  }
  document.cookie = `${ANON_COOKIE}=${id}; Path=/; Max-Age=31536000; SameSite=Lax`;
  return id;
}

export function anonymousHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const id = getOrCreateAnonymousId();
  if (id) headers.set("x-touya-vid", id);
  return headers;
}
