import { jsonApi } from "@/lib/cors";
import { publicModeFromProfile } from "@/lib/mode-public";
import { emptyQuota, readQuota } from "@/lib/usage";
import { getVisitorId } from "@/lib/visitor";
import { emptyVisitorProfile, readVisitorProfile } from "@/lib/visitor-profile";

export const dynamic = "force-dynamic";
export { OPTIONS } from "@/lib/cors";

export async function GET(request: Request) {
  const anonKey = await getVisitorId();
  if (!anonKey) {
    const mode = publicModeFromProfile(emptyVisitorProfile());
    return jsonApi(request, { ...emptyQuota(), ...mode, mode });
  }
  const [quota, profile] = await Promise.all([
    readQuota(anonKey),
    readVisitorProfile(anonKey),
  ]);
  const mode = publicModeFromProfile(profile);
  return jsonApi(request, { ...quota, ...mode, mode });
}
