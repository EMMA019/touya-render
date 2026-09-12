import { ChatView } from "@/components/chat-view";
import { UnknownCharacter } from "@/components/unknown-character";
import { EMPTY_AFFINITY } from "@/lib/affinity-types";
import { getPublicCharacter } from "@/lib/characters";
import { loadCompanion } from "@/lib/companion";
import type { Quota } from "@/lib/quota-types";
import { unlockedSituationIds } from "@/lib/situation-unlock";
import { emptyQuota, readQuota } from "@/lib/usage";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = getPublicCharacter(slug);
  if (!character) return <UnknownCharacter />;

  const visitorId = await getVisitorId();
  const quota: Quota = visitorId ? await readQuota(visitorId) : emptyQuota();

  const companion = visitorId
    ? await loadCompanion(visitorId, character.id, character.situations, true)
    : {
        bond: {
          daysMet: 0,
          factCount: 0,
          stage: "first" as const,
          lastDay: null,
          firstDay: null,
          streak: 0,
          daysAway: 0,
        },
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
