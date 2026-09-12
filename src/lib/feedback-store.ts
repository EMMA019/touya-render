import { FEEDBACK_STORE_FILENAME } from "./config";
import { createJsonStore } from "./json-store";

export type FeedbackEntry = {
  at: string;
  characterId: string;
  situationId?: string;
  assistantText: string;
  note?: string;
};

type StoreShape = { entries: FeedbackEntry[] };

const store = createJsonStore<StoreShape>({
  envKey: "FEEDBACK_STORE_PATH",
  filename: FEEDBACK_STORE_FILENAME,
  empty: () => ({ entries: [] }),
});

export async function recordFeedback(entry: Omit<FeedbackEntry, "at">, now = new Date()) {
  const row: FeedbackEntry = {
    at: now.toISOString(),
    characterId: entry.characterId,
    situationId: entry.situationId,
    assistantText: entry.assistantText.slice(0, 400),
    note: entry.note?.slice(0, 200),
  };
  return store.enqueue(async () => {
    const data = await store.read();
    data.entries = [...data.entries, row].slice(-200);
    await store.persist(data);
    return row;
  });
}

export function resetFeedbackStore() {
  store.resetMemory();
}
