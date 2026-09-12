import { HomePortal } from "@/components/home-portal";
import { listPublicCharacters } from "@/lib/characters";

export default function HomePage() {
  return <HomePortal initialCharacters={listPublicCharacters()} />;
}
