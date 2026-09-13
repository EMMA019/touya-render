import { adsAllowed } from "./ads";
import {
  effectiveChatMode,
  effectiveStoredMode,
  toModePublic,
  type ModePublic,
} from "./chat-mode";
import type { VisitorProfile } from "./visitor-profile";

export function publicModeFromProfile(
  profile: VisitorProfile,
  affinityLevel?: number | null,
): ModePublic {
  const chatMode =
    affinityLevel === undefined || affinityLevel === null
      ? effectiveStoredMode(profile.chatMode, profile.ageConfirmed)
      : effectiveChatMode(profile.chatMode, profile.ageConfirmed, affinityLevel);
  return toModePublic({
    chatMode,
    ageConfirmed: profile.ageConfirmed,
    ageConfirmedAt: profile.ageConfirmedAt,
    adsEnabled: adsAllowed(chatMode),
    affinityLevel,
  });
}
