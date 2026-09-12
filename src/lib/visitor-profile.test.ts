import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { NSFW_AGE_REQUIRED } from "./chat-mode";

test("visitor profile defaults to SFW and rejects NSFW without age", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "touya-visitor-"));
  process.env.VISITOR_STORE_PATH = path.join(dir, "visitors.json");
  const { applyVisitorModeChange, readVisitorProfile, resetVisitorProfileMemory } =
    await import("./visitor-profile");
  resetVisitorProfileMemory();

  const idle = await readVisitorProfile("v1");
  assert.equal(idle.chatMode, "sfw");
  assert.equal(idle.ageConfirmed, false);
  assert.equal(idle.ageConfirmedAt, null);

  const cheated = await applyVisitorModeChange("v1", { chatMode: "nsfw" });
  assert.equal(cheated.ok, false);
  if (!cheated.ok) assert.equal(cheated.error, NSFW_AGE_REQUIRED);
  assert.equal((await readVisitorProfile("v1")).chatMode, "sfw");

  const now = new Date("2026-09-12T12:00:00.000Z");
  const confirmed = await applyVisitorModeChange(
    "v1",
    { confirmAge: true, chatMode: "nsfw" },
    now
  );
  assert.equal(confirmed.ok, true);
  if (confirmed.ok) {
    assert.equal(confirmed.profile.ageConfirmed, true);
    assert.equal(confirmed.profile.ageConfirmedAt, now.toISOString());
    assert.equal(confirmed.profile.chatMode, "nsfw");
  }

  const back = await applyVisitorModeChange("v1", { chatMode: "sfw" });
  assert.equal(back.ok, true);
  if (back.ok) {
    assert.equal(back.profile.chatMode, "sfw");
    assert.equal(back.profile.ageConfirmed, true);
  }

  await rm(dir, { recursive: true, force: true });
});
