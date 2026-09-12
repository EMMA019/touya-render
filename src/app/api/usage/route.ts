import { publicModeFromProfile } from "@/lib/mode-public";
import { emptyQuota, readQuota } from "@/lib/usage";
import { getVisitorId } from "@/lib/visitor";
import { emptyVisitorProfile, readVisitorProfile } from "@/lib/visitor-profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const anonKey = await getVisitorId();
  if (!anonKey) {
    const mode = publicModeFromProfile(emptyVisitorProfile());
    return Response.json({ ...emptyQuota(), ...mode, mode });
  }
  const [quota, profile] = await Promise.all([
    readQuota(anonKey),
    readVisitorProfile(anonKey),
  ]);
  const mode = publicModeFromProfile(profile);
  return Response.json({ ...quota, ...mode, mode });
}
