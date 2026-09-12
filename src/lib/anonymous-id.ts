import { createHash } from "node:crypto";

export { isInstallUuid } from "./install-uuid";

/**
 * Hash the client install UUID before any store write.
 * Server counters never persist the raw id. Changing the pepper resets quota.
 */
export function anonymousPepper(): string {
  return process.env.TOUYA_ANON_PEPPER?.trim() || "touya-local-pepper";
}

export function hashAnonymousId(raw: string): string {
  return createHash("sha256")
    .update(`${anonymousPepper()}:${raw.trim()}`)
    .digest("hex");
}
