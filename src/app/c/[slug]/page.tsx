import { ChatView } from "@/components/chat-view";
import { UnknownCharacter } from "@/components/unknown-character";
import { EMPTY_AFFINITY } from "@/lib/affinity-types";
import { EMPTY_BOND } from "@/lib/bond-types";
import { getPublicCharacter, listPublicCharacters } from "@/lib/characters";
import { EMPTY_QUOTA } from "@/lib/quota-types";
import { unlockedSituationIds } from "@/lib/situation-unlock";

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

  return (
    <div className="min-h-svh bg-black">
      <ChatView
        character={character}
        initialQuota={EMPTY_QUOTA}
        initialBond={EMPTY_BOND}
        initialMemory={[]}
        initialUnlocked={unlockedSituationIds(character.situations, 0)}
        initialAffinity={EMPTY_AFFINITY}
      />
    </div>
  );
}
