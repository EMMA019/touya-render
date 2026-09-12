import { listPublicCharactersForVisitor } from "@/lib/characters";
import { jsonApi } from "@/lib/cors";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";
export { OPTIONS } from "@/lib/cors";

export async function GET(request: Request) {
  const visitorId = await getVisitorId();
  return jsonApi(request, { characters: await listPublicCharactersForVisitor(visitorId) });
}