import { Suspense } from "react";
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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ s?: string }>;
}) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const character = getPublicCharacter(slug);
  if (!character) return <UnknownCharacter />;

  return (
    <div className="min-h-svh bg-black">
      <Suspense fallback={<div className="min-h-svh bg-black" />}>
        <ChatView
          character={character}
          initialQuota={EMPTY_QUOTA}
          initialBond={EMPTY_BOND}
          initialMemory={[]}
          initialUnlocked={unlockedSituationIds(character.situations, 0)}
          initialAffinity={EMPTY_AFFINITY}
          initialSituationId={typeof query.s === "string" ? query.s : undefined}
        />
      </Suspense>
    </div>
  );
}
