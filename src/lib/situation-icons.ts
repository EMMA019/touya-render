import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  BookOpen,
  Briefcase,
  CloudRain,
  Coffee,
  ConciergeBell,
  Flower2,
  Ghost,
  HeartPulse,
  Library,
  Moon,
  Sparkles,
  Sunset,
  Trees,
} from "lucide-react";

const BY_COSTUME: Record<string, LucideIcon> = {
  halloween: Ghost,
  maid: ConciergeBell,
  nurse: HeartPulse,
  miko: Flower2,
  idol: Sparkles,
};

const BY_ID: Record<string, LucideIcon> = {
  "cafe-rain": Coffee,
  "rainy-walk": CloudRain,
  "office-after": Briefcase,
  bookstore: BookMarked,
  "rooftop-night": Moon,
  "park-bench": Trees,
  "penthouse-dusk": Sunset,
  "mansion-library": Library,
  "flower-dusk": Flower2,
  "riverside-lantern": CloudRain,
  "office-late": Briefcase,
  "station-platform": Moon,
  "river-night": Moon,
  darkroom: BookOpen,
  conservatory: Sunset,
  "stone-hall": Library,
  "night-cafe": Coffee,
  "shop-night": ConciergeBell,
  "quiet-cafe": Coffee,
  "garden-dusk": Trees,
  "editorial-night": BookOpen,
  "night-lounge": Sunset,
  "hotel-lounge": Sunset,
  "gallery-dusk": Library,
  "halloween-witch": Ghost,
  "halloween-vampire": Ghost,
  "halloween-rooftop": Ghost,
  "halloween-masquerade": Ghost,
  maid: ConciergeBell,
  nurse: HeartPulse,
  miko: Flower2,
  idol: Sparkles,
};

export function situationIcon(id: string, season?: string, costume?: string): LucideIcon {
  if (costume && BY_COSTUME[costume]) return BY_COSTUME[costume];
  if (season === "halloween") return Ghost;
  return BY_ID[id] ?? BookOpen;
}
