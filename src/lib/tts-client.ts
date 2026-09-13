import { apiUrl } from "./api-base";
import { anonymousHeaders } from "./anonymous-client";

let current: HTMLAudioElement | null = null;

export async function fetchTtsConfigured(): Promise<boolean> {
  try {
    const response = await fetch(apiUrl("/api/tts"), { headers: anonymousHeaders() });
    if (!response.ok) return false;
    const body = (await response.json()) as { configured?: boolean };
    return body.configured === true;
  } catch {
    return false;
  }
}

export function stopTtsPlayback() {
  if (!current) return;
  current.pause();
  current.removeAttribute("src");
  current.load();
  current = null;
}

export async function playTtsAudio(characterId: string, text: string): Promise<"ok" | "unavailable"> {
  const trimmed = text.trim();
  if (!trimmed) return "unavailable";

  const response = await fetch(apiUrl("/api/tts"), {
    method: "POST",
    headers: anonymousHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ characterId, text: trimmed }),
  });

  if (response.status === 503 || !response.ok) return "unavailable";

  const blob = await response.blob();
  if (!blob.size) return "unavailable";

  const url = URL.createObjectURL(blob);
  stopTtsPlayback();
  const audio = new Audio(url);
  current = audio;
  audio.onended = () => {
    URL.revokeObjectURL(url);
    if (current === audio) current = null;
  };
  audio.onerror = () => {
    URL.revokeObjectURL(url);
    if (current === audio) current = null;
  };
  try {
    await audio.play();
    return "ok";
  } catch {
    URL.revokeObjectURL(url);
    if (current === audio) current = null;
    return "unavailable";
  }
}
