import { adsAllowed } from "./ads";
import { toModePublic, type ModePublic } from "./chat-mode";
import type { VisitorProfile } from "./visitor-profile";

export function publicModeFromProfile(profile: VisitorProfile): ModePublic {
  const adsEnabled = adsAllowed(profile.chatMode);
  return toModePublic({
    chatMode: profile.chatMode,
    ageConfirmed: profile.ageConfirmed,
    ageConfirmedAt: profile.ageConfirmedAt,
    adsEnabled,
  });
}
