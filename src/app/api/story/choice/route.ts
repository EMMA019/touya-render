import { handleStoryStep } from "@/lib/story-api";

export const dynamic = "force-dynamic";
export { OPTIONS } from "@/lib/cors";

/** { characterId, chapterId, beatId, choiceId } → next beat. Script runner only; no LLM. */
export async function POST(request: Request) {
  return handleStoryStep(request, "choice");
}
