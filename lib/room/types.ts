export type ChatMessage = {
  sender: string;
  content: string;
  timestamp: string;
};

export type Participant = {
  presence_ref: string;
  id: string;
  nickname: string;
  joinedAt: string;
  status: "online" | "calling";
  cameraOn?: boolean;
  screenSharing?: boolean;
};

export type PresenceTrack = {
  id: string;
  nickname: string;
  joinedAt: string;
  status: Participant["status"];
  cameraOn: boolean;
  screenSharing: boolean;
};

export type SignalPayload = {
  from: string;
  to: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export type MediaStatePayload = {
  from: string;
  cameraOn: boolean;
  screenSharing: boolean;
};

export type CallStatePayload = {
  from: string;
  nickname: string;
  joinedAt: string;
  status: Participant["status"];
  cameraOn: boolean;
  screenSharing: boolean;
};

export type BroadcastMessage =
  | { type: "broadcast"; event: "signal"; payload: SignalPayload }
  | {
      type: "broadcast";
      event: "media-state-update";
      payload: MediaStatePayload;
    }
  | { type: "broadcast"; event: "call-state-update"; payload: CallStatePayload }
  | { type: "broadcast"; event: "chat"; payload: ChatMessage };

export type PresencePayload = Partial<PresenceTrack> & {
  presence_ref?: string;
};
