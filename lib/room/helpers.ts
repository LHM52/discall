import type {
  ChatMessage,
  Participant,
  PresencePayload,
  PresenceTrack,
} from "./types";

export function toParticipant(
  key: string,
  presence: PresencePayload,
): Participant | null {
  if (!presence.id || !presence.nickname || !presence.joinedAt) {
    return null;
  }

  return {
    presence_ref: presence.presence_ref ?? "",
    id: key,
    nickname: presence.nickname,
    joinedAt: presence.joinedAt,
    status: presence.status === "calling" ? "calling" : "online",
    cameraOn: Boolean(presence.cameraOn),
    screenSharing: Boolean(presence.screenSharing),
  };
}

export function pickCurrentPresence(
  presences: PresencePayload[] | undefined,
): PresencePayload | null {
  if (!presences?.length) return null;

  const callingPresence = [...presences]
    .reverse()
    .find((presence) => presence.status === "calling");

  return callingPresence ?? presences[presences.length - 1] ?? null;
}

export function parseChatMessage(value: string): ChatMessage | null {
  try {
    const parsed = JSON.parse(value) as Partial<ChatMessage>;
    if (
      typeof parsed.sender === "string" &&
      typeof parsed.content === "string" &&
      typeof parsed.timestamp === "string"
    ) {
      return parsed as ChatMessage;
    }
  } catch (err) {
    console.warn("Chat parse error", err);
  }

  return null;
}

export function getVideoGridClass(count: number) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 md:grid-cols-2";
  if (count <= 4) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 6) return "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";
}

export function getTileSizeClass(count: number) {
  if (count <= 1) return "max-w-[900px]";
  if (count === 2) return "max-w-[520px]";
  if (count <= 4) return "max-w-[420px]";
  return "max-w-[360px]";
}

export function isPeerConnectionUsable(
  pc: RTCPeerConnection | undefined,
): boolean {
  return Boolean(
    pc &&
      pc.signalingState !== "closed" &&
      pc.connectionState !== "closed" &&
      pc.connectionState !== "failed",
  );
}

/** replaceTrack 이후 재협상 offer가 기존 m-line 순서와 맞지 않을 때 브라우저가 던지는 오류 */
export function isSdpMlineOrderError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  if (err.name !== "InvalidAccessError" && err.name !== "OperationError") {
    return false;
  }
  return /m-line|subsequent offer|order.*offer|doesn't match/i.test(
    err.message,
  );
}
