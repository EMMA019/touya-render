/** Kairi InputArea composer rules, reused by the 燈夜 chat screen. */

export const COMPOSER_MIN_PX = 28;
export const COMPOSER_MAX_PX = 160;

const MOBILE_UA =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export function isMobileChatInput(
  env: { userAgent?: string; pointerCoarse?: boolean; innerWidth?: number } = {},
): boolean {
  if (typeof window === "undefined" && env.userAgent == null && env.innerWidth == null) {
    return false;
  }
  const userAgent = env.userAgent ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);
  const pointerCoarse =
    env.pointerCoarse ??
    (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const innerWidth = env.innerWidth ?? (typeof window === "undefined" ? 1024 : window.innerWidth);
  return MOBILE_UA.test(userAgent) || Boolean(pointerCoarse) || innerWidth <= 768;
}

/** Desktop Enter sends. Mobile Enter is always a newline. IME Enter never sends. */
export function shouldSendOnEnter(input: {
  key: string;
  shiftKey: boolean;
  isComposing?: boolean;
  keyCode?: number;
  mobile: boolean;
}): boolean {
  if (input.isComposing || input.keyCode === 229) return false;
  if (input.mobile) return false;
  return input.key === "Enter" && !input.shiftKey;
}

export function composerHeightPx(scrollHeight: number): number {
  return Math.min(Math.max(scrollHeight, COMPOSER_MIN_PX), COMPOSER_MAX_PX);
}

export function resizeComposer(textarea: HTMLTextAreaElement | null): void {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${composerHeightPx(textarea.scrollHeight)}px`;
}
