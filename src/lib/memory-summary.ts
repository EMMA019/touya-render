import { MEMORY_SUMMARY_MAX_CHARS } from "./config";
import type { MemoryFact } from "./memory-extract";

const LABELS: Record<MemoryFact["kind"], string> = {
  profile: "プロフィール",
  preference: "好み",
  relationship: "関係",
  agreement: "約束",
};

export function summarizeMemory(facts: MemoryFact[]): string {
  if (facts.length === 0) return "";
  const lines = facts.slice(-6).map((fact) => `${LABELS[fact.kind]}: ${fact.text}`);
  let text = lines.join(" / ");
  if (text.length > MEMORY_SUMMARY_MAX_CHARS) {
    text = `${text.slice(0, MEMORY_SUMMARY_MAX_CHARS - 1)}…`;
  }
  return text;
}
