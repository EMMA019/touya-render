/**
 * Thin companion grounding, inspired by Kairi's "filter the final answer"
 * idea — not a clone of its market/citation stack.
 */
const REAL_PERSON_CLAIMS =
  /私は実在の(?:人間|人物)です。?|これは本物の電話です。?|実際に会いに行けます。?/g;

const OVERCLAIM =
  /必ず治(る|ります)|絶対に儲か|必ず勝て|診断すると/g;

export function groundAssistantText(text: string): string {
  let next = text.replace(/\s+$/g, "");
  next = next.replace(REAL_PERSON_CLAIMS, "私は物語の中の相手です。");
  next = next.replace(OVERCLAIM, "断定はできないけれど");
  next = next.replace(/\n{3,}/g, "\n\n");

  if (next.length > 720) {
    const cut = next.slice(0, 720);
    const lastStop = Math.max(
      cut.lastIndexOf("。"),
      cut.lastIndexOf("！"),
      cut.lastIndexOf("？")
    );
    next = (lastStop > 200 ? cut.slice(0, lastStop + 1) : cut).trim();
  }

  return next.trim();
}
