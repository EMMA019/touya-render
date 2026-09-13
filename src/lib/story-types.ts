/**
 * Story (chapter) scripts and progress. Shared by server and clients.
 * Spec: docs/MEETING_FLOW_SPEC.md §1. Scripts live in shared/story/{characterId}.json.
 * The runner never calls the LLM; only a `free` beat goes through /api/chat.
 */

export const STORY_FLAGS = ["B1", "B2", "B3", "B4", "B5"] as const;
export type StoryFlag = (typeof STORY_FLAGS)[number];

export const BEAT_KINDS = ["line", "choice", "free", "end", "defer", "retry"] as const;
export type BeatKind = (typeof BEAT_KINDS)[number];

export type StoryChapterNumber = 0 | 1 | 2 | 3;

/** Flag a chapter's `end` beat sets; also the flag that admits its band. */
export const ENTRY_FLAG: Record<StoryChapterNumber, StoryFlag> = { 0: "B1", 1: "B3", 2: "B4", 3: "B5" };

export type StoryChoice = {
  id: string;
  /** Button label. ≤ 20 chars. */
  label: string;
  next: string;
  /** Ch0 only: exactly one `choice` beat carries metVia on every option. */
  metVia?: string;
  setFlags?: StoryFlag[];
  /** ≤ 1 element. */
  reveals?: string[];
  /** Stored verbatim as a `relationship` memory fact (rules only, no LLM). */
  remember?: string;
  /** User bubble text. Falls back to `label`. */
  userText?: string;
  /** Ch2 "not yet": `next` must point at a `defer` beat. */
  defer?: boolean;
};

export type StoryBeat = {
  id: string;
  kind: BeatKind;
  /** Bubbles. 1 element = 1 bubble. 1–2 elements. */
  text: string[];
  /** Optional stage direction shown as a caption above the bubble. Public. */
  narration?: string;
  next?: string;
  choices?: StoryChoice[];
  reveals?: string[];
  setFlags?: StoryFlag[];
  /** `free` only. Server-only; stripped from the public script. ≤ 60 chars. */
  promptHint?: string;
  /** `end` only. Client passes it to saveHook. */
  hook?: string;
};

export type StoryChapter = {
  /** `${characterId}-ch${chapter}` */
  id: string;
  chapter: StoryChapterNumber;
  /** Backdrop. Must be a daily scene (no costume / season). */
  situationId: string;
  entry: string;
  beats: StoryBeat[];
};

export type StoryScript = {
  characterId: string;
  version: number;
  /** Server-only. One 20–40 char line per metVia for the 【関係】 prompt line. */
  metViaLines: Record<string, string>;
  /** Server-only. id → line for 【すでに話したこと】. */
  reveals: Record<string, string>;
  chapters: StoryChapter[];
};

/** Public script: promptHint / metViaLines / reveals stripped. */
export type StoryBeatPublic = Omit<StoryBeat, "promptHint">;
export type StoryChapterPublic = Omit<StoryChapter, "beats"> & { beats: StoryBeatPublic[] };
export type StoryScriptPublic = {
  characterId: string;
  version: number;
  chapters: StoryChapterPublic[];
};

export type Warmth = "warm" | "cool" | "cold";

export type StoryToday = { day: string; turns: number; warmth: Warmth };

export type StoryRecord = {
  scriptVersion: number | null;
  chapterId: string | null;
  beat: string | null;
  /** flag → ISO time it was set. Flags never clear. */
  flags: Partial<Record<StoryFlag, string>>;
  /** Script choice id, or "legacy" / "default". */
  metVia: string | null;
  revealed: string[];
  /** `${chapterId}/${beatId}` → choiceId */
  choices: Record<string, string>;
  /** Ch2 declined: chapter re-offers once `count >= deferredUntil`. */
  deferredUntil: number | null;
  legacy: boolean;
  today: StoryToday;
};

export type StoryPublic = {
  chapterId: string | null;
  beat: string | null;
  flags: StoryFlag[];
  metVia: string | null;
  /** -1 (never met) .. 3 */
  effectiveLevel: number;
  /** Band name; -1 is "はじめて". */
  effectiveName: string;
  pendingChapter: StoryChapterNumber | null;
  warmth: Warmth;
  /** effectiveLevel >= NSFW_MIN_LEVEL. Age confirmation is separate. */
  nsfwEligible: boolean;
};

/** Prompt-side view of a story record (server resolves metViaLines / reveals). */
export type PromptStory = {
  metVia: string;
  metViaLine?: string;
  effectiveLevel: number;
  effectiveName: string;
  flags: StoryFlag[];
  revealed: string[];
  revealedLines?: string[];
};

export const STORY_OUT_OF_STEP = "story_out_of_step";
export const STORY_BAD_CHOICE = "story_bad_choice";
export const STORY_BAD_BEAT = "story_bad_beat";
