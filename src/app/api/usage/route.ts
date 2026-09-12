import { jsonApi } from "@/lib/cors";
import { emptyQuota, readQuota } from "@/lib/usage";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";
export { OPTIONS } from "@/lib/cors";

export async function GET(request: Request) {
  const anonKey = await getVisitorId();
  if (!anonKey) {
    return jsonApi(request, emptyQuota());
  }
  return jsonApi(request, await readQuota(anonKey));
}
