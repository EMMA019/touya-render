import { cookies, headers } from "next/headers";
import { hashAnonymousId } from "./anonymous-id";
import { isInstallUuid } from "./install-uuid";
import { ANON_COOKIE, ANON_HEADER, VISITOR_COOKIE } from "./config";

/**
 * Hashed anonymous install id for quota / affinity / sexual-escalation / memory.
 * Raw UUID is never the store key. No PII is read.
 */
export async function getVisitorId(): Promise<string | null> {
  const jar = await cookies();
  const hdrs = await headers();
  const raw =
    pickUuid(hdrs.get(ANON_HEADER)) ??
    pickUuid(jar.get(ANON_COOKIE)?.value) ??
    pickUuid(jar.get(VISITOR_COOKIE)?.value);
  return raw ? hashAnonymousId(raw) : null;
}

function pickUuid(value: string | undefined | null): string | null {
  return isInstallUuid(value) ? value.trim() : null;
}
