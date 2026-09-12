import { HomePortal } from "@/components/home-portal";
import { listPublicCharacters, listPublicCharactersForVisitor } from "@/lib/characters";
import { isCloudflarePagesBuild } from "@/lib/web-export";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = process.env.TOUYA_CF_PAGES === "1" ? "force-static" : "force-dynamic";

export default async function HomePage() {
  if (isCloudflarePagesBuild()) {
    return <HomePortal initialCharacters={listPublicCharacters()} />;
  }
  const visitorId = await getVisitorId();
  const characters = await listPublicCharactersForVisitor(visitorId);
  return <HomePortal initialCharacters={characters} />;
}
