import assert from "node:assert/strict";
import { test } from "node:test";
import { DIAGNOSIS_QUESTIONS, scoreDiagnosis } from "./diagnosis";

test("diagnosis has ten questions and maps a full hiyori path", () => {
  assert.equal(DIAGNOSIS_QUESTIONS.length, 10);
  const allFirst = DIAGNOSIS_QUESTIONS.map(() => 0);
  assert.equal(scoreDiagnosis(allFirst).id, "hiyori");
});

test("diagnosis can land on each of the four", () => {
  assert.equal(scoreDiagnosis(DIAGNOSIS_QUESTIONS.map(() => 1)).id, "rione");
  assert.equal(scoreDiagnosis(DIAGNOSIS_QUESTIONS.map(() => 2)).id, "shiraishi");
  const claraHeavy = [3, 3, 3, 3, 3, 3, 3, 1, 3, 3];
  assert.equal(scoreDiagnosis(claraHeavy).id, "clara");
});
