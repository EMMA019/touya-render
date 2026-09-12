import { listPublicCharactersForVisitor } from "@/lib/characters";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";

export async function GET() {
  const visitorId = await getVisitorId();
  return Response.json({ characters: await listPublicCharactersForVisitor(visitorId) });
}