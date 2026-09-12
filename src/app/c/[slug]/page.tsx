import { ChatView } from "@/components/chat-view";
import { UnknownCharacter } from "@/components/unknown-character";
import { EMPTY_AFFINITY } from "@/lib/affinity-types";
import { EMPTY_BOND } from "@/lib/bond-types";
import { getPublicCharacter, listPublicCharacters } from "@/lib/characters";
import { loadCompanion } from "@/lib/companion";
import type { Quota } from "@/lib/quota-types";
import { unlockedSituationIds } from "@/lib/situation-unlock";
import { emptyQuota, readQuota } from "@/lib/usage";
import { isCloudflarePagesBuild } from "@/lib/web-export";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = process.env.TOUYA_CF_PAGES === "1" ? "force-static" : "force-dynamic";

export function generateStaticParams() {
  return listPublicCharacters().map((character) => ({ slug: character.id }));
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = getPublicCharacter(slug);
  if (!character) return <UnknownCharacter />;

  if (isCloudflarePagesBuild()) {
    return (
      <div className="min-h-svh bg-black">
        <ChatView
          character={character}
          initialQuota={emptyQuota()}
          initialBond={EMPTY_BOND}
          initialMemory={[]}
          initialUnlocked={unlockedSituationIds(character.situations, 0)}
          initialAffinity={EMPTY_AFFINITY}
        />
      </div>
    );
  }

  const visitorId = await getVisitorId();
  const quota: Quota = visitorId ? await readQuota(visitorId) : emptyQuota();

  const companion = visitorId
    ? await loadCompanion(visitorId, character.id, character.situations, true)
    : {
        bond: EMPTY_BOND,
        memory: [],
        unlocked: unlockedSituationIds(character.situations, 0),
        affinity: EMPTY_AFFINITY,
      };

  return (
    <div className="min-h-svh bg-black">
      <ChatView
        character={character}
        initialQuota={quota}
        initialBond={companion.bond}
        initialMemory={companion.memory}
        initialUnlocked={companion.unlocked}
        initialAffinity={companion.affinity}
      />
    </div>
  );
}
