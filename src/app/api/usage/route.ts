import { emptyQuota, readQuota } from "@/lib/usage";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";

export async function GET() {
  const anonKey = await getVisitorId();
  if (!anonKey) {
    return Response.json(emptyQuota());
  }
  return Response.json(await readQuota(anonKey));
}
