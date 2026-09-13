import { HomePortal } from "@/components/home-portal";
import { listPublicCharacters } from "@/lib/characters";
import { pickDailyFromRoster } from "@/lib/daily";

export default function HomePage() {
  const characters = listPublicCharacters();
  const daily = pickDailyFromRoster(characters, null);
  return <HomePortal initialCharacters={characters} initialDaily={daily} />;
}
