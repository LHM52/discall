"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { defaultRtcConfiguration, hasCustomTurn } from "@/lib/room/ice";
import {
  isPeerConnectionUsable,
  isSdpMlineOrderError,
  parseChatMessage,
  pickCurrentPresence,
  toParticipant,
} from "@/lib/room/helpers";
import type {
  BroadcastMessage,
  CallStatePayload,
  ChatMessage,
  Participant,
  PresencePayload,
  PresenceTrack,
} from "@/lib/room/types";

type UseRoomCallArgs = {
  roomId: string;
  nickname: string;
  router: { push: (href: string) => void };
};

export function useRoomCall({ roomId, nickname, router }: UseRoomCallArgs) {
  const [isJoined, setIsJoined] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [status, setStatus] = useState("대기 중");
  const [error, setError] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const [participantMediaStates, setParticipantMediaStates] = useState<
    Record<string, { cameraOn: boolean; screenSharing: boolean }>
  >({});

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micOnRef = useRef(true);
  const cameraOnRef = useRef(false);
  const screenSharingRef = useRef(false);
  const focusedIdRef = useRef<string | null>(null);
  const isJoinedRef = useRef(false);
  const joinedAtRef = useRef(new Date().toISOString());

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const videoSendersRef = useRef<Map<string, RTCRtpSender>>(new Map());
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const pendingIceCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>(
    {},
  );
  const pendingPresenceSyncTimerRef = useRef<number | null>(null);
  const pendingPresenceSyncPayloadRef = useRef<{
    pList: Participant[];
    mediaStates: Record<string, { cameraOn: boolean; screenSharing: boolean }>;
  } | null>(null);
  const consecutiveEmptySyncsRef = useRef(0);
  const recentlyRemovedRef = useRef<Record<string, number>>({});
  const pendingBroadcastsRef = useRef<BroadcastMessage[]>([]);
  const pendingPresenceUpdatesRef = useRef<Partial<PresenceTrack>[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelReadyRef = useRef(false);
  const makingOfferRef = useRef<Record<string, boolean>>({});
  const ignoreOfferRef = useRef<Record<string, boolean>>({});
  const isSettingRemoteDescriptionRef = useRef<Record<string, boolean>>({});

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const myId = useRef(Math.random().toString(36).substring(2, 15));

  const startLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: false,
      });
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error("Media access error:", err);
      setStatus("마이크 권한 오류");
      setError("마이크 권한이 필요합니다. 브라우저 설정을 확인해주세요.");
      return null;
    }
  }, []);

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setCameraOn(false);
    setScreenSharing(false);
    cameraOnRef.current = false;
    screenSharingRef.current = false;
  }, []);

  const updatePresence = useCallback(
    async (overrides: Partial<PresenceTrack> = {}) => {
      if (!channelRef.current || !channelReadyRef.current) {
        pendingPresenceUpdatesRef.current.push(overrides);
        return;
      }
      const presence: PresenceTrack = {
        id: myId.current,
        nickname,
        joinedAt: joinedAtRef.current,
        status: isJoinedRef.current ? "calling" : "online",
        cameraOn: cameraOnRef.current,
        screenSharing: screenSharingRef.current,
        ...overrides,
      };
      try {
        console.debug("[updatePresence] tracking presence:", presence);
        await channelRef.current.track(presence);
        console.debug("[updatePresence] track ok for", presence.id);
      } catch (err) {
        console.error("[updatePresence] track failed", err, presence);
        throw err;
      }
    },
    [nickname],
  );

  const sendBroadcast = useCallback(async (payload: BroadcastMessage) => {
    if (!channelRef.current || !channelReadyRef.current) {
      pendingBroadcastsRef.current.push(payload);
      return;
    }

    try {
      const result = await channelRef.current.send(payload);
      if (result !== "ok") {
        console.warn("Realtime send failed, queuing payload", result, payload);
        pendingBroadcastsRef.current.push(payload);
      }
    } catch (err) {
      console.warn("Realtime send failed, queuing payload", err, payload);
      pendingBroadcastsRef.current.push(payload);
    }
  }, []);

  const flushPendingPresenceUpdates = useCallback(() => {
    const queued = [...pendingPresenceUpdatesRef.current];
    pendingPresenceUpdatesRef.current = [];
    queued.forEach((overrides) => {
      void updatePresence(overrides);
    });
  }, [updatePresence]);

  const flushPendingBroadcasts = useCallback(() => {
    if (!channelRef.current) return;
    const queued = [...pendingBroadcastsRef.current];
    pendingBroadcastsRef.current = [];
    queued.forEach((queuedPayload) => {
      void sendBroadcast(queuedPayload);
    });
  }, [sendBroadcast]);

  const broadcastMediaState = useCallback(
    (camera: boolean, screen: boolean) => {
      void sendBroadcast({
        type: "broadcast",
        event: "media-state-update",
        payload: {
          from: myId.current,
          cameraOn: camera,
          screenSharing: screen,
        },
      });
      void updatePresence({ cameraOn: camera, screenSharing: screen });
    },
    [sendBroadcast, updatePresence],
  );

  const broadcastCallState = useCallback(
    (callStatus: Participant["status"], camera: boolean, screen: boolean) => {
      void sendBroadcast({
        type: "broadcast",
        event: "call-state-update",
        payload: {
          from: myId.current,
          nickname,
          joinedAt: joinedAtRef.current,
          status: callStatus,
          cameraOn: camera,
          screenSharing: screen,
        },
      });
    },
    [nickname, sendBroadcast],
  );

  const cleanupPeer = useCallback((remoteId: string) => {
    const pc = pcsRef.current.get(remoteId);
    if (pc) {
      pc.close();
      pcsRef.current.delete(remoteId);
    }

    videoSendersRef.current.delete(remoteId);
    dataChannelsRef.current.delete(remoteId);
    delete pendingIceCandidatesRef.current[remoteId];
    delete makingOfferRef.current[remoteId];
    delete ignoreOfferRef.current[remoteId];
    delete isSettingRemoteDescriptionRef.current[remoteId];

    setRemoteStreams((prev) => {
      if (!prev[remoteId]) return prev;
      const next = { ...prev };
      delete next[remoteId];
      return next;
    });

    setParticipantMediaStates((prev) => {
      if (!prev[remoteId]) return prev;
      const next = { ...prev };
      delete next[remoteId];
      return next;
    });

    if (focusedIdRef.current === remoteId) {
      setFocusedId(null);
    }
  }, []);

  const createPeerConnection = useCallback(
    async (
      remoteId: string,
      opts?: { suppressLocalOffer?: boolean },
    ): Promise<RTCPeerConnection | null> => {
      let pc = pcsRef.current.get(remoteId);
      if (isPeerConnectionUsable(pc)) return pc as RTCPeerConnection;

      const suppressLocalOffer = opts?.suppressLocalOffer ?? false;

      cleanupPeer(remoteId);

      pc = new RTCPeerConnection(defaultRtcConfiguration);
      // Log ICE servers used by this peer to verify TURN presence in bundled config
      try {
        console.debug(
          `[pc.create] ${remoteId} iceServers:`,
          pc.getConfiguration().iceServers,
        );
      } catch (e) {
        console.debug("[pc.create] unable to read iceServers", e);
      }
      pcsRef.current.set(remoteId, pc);

      makingOfferRef.current[remoteId] = false;
      ignoreOfferRef.current[remoteId] = false;
      isSettingRemoteDescriptionRef.current[remoteId] = false;
      pendingIceCandidatesRef.current[remoteId] = [];

      let audioTransceiver: RTCRtpTransceiver;
      let videoTransceiver: RTCRtpTransceiver;

      try {
        audioTransceiver = pc.addTransceiver("audio", {
          direction: "sendrecv",
        });
        videoTransceiver = pc.addTransceiver("video", {
          direction: "sendrecv",
        });
        videoSendersRef.current.set(remoteId, videoTransceiver.sender);

        const dc = pc.createDataChannel("chat", { negotiated: true, id: 0 });
        dc.onmessage = (e) => {
          const data = parseChatMessage(e.data);
          if (data) setMessages((prev) => [...prev, data]);
        };
        dataChannelsRef.current.set(remoteId, dc);
      } catch (err) {
        console.error("Transceiver/DataChannel setup error", err);
        cleanupPeer(remoteId);
        return null;
      }

      const attachLocalTracks = async () => {
        if (!localStreamRef.current) return;

        // Guard: ensure this pc is still the active one for remoteId
        if (
          pcsRef.current.get(remoteId) !== pc ||
          !isPeerConnectionUsable(pc)
        ) {
          throw new Error("Peer connection closed before attaching tracks");
        }

        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          try {
            if (
              audioTransceiver?.sender &&
              pcsRef.current.get(remoteId) === pc &&
              isPeerConnectionUsable(pc)
            ) {
              await audioTransceiver.sender.replaceTrack(audioTrack);
            }
          } catch (err) {
            console.warn("replaceTrack (audio) failed", err, remoteId);
            throw err;
          }
        }

        const videoTrack = screenSharingRef.current
          ? screenStreamRef.current?.getVideoTracks()[0] || null
          : cameraOnRef.current
            ? localStreamRef.current.getVideoTracks()[0] || null
            : null;
        try {
          if (
            videoTransceiver?.sender &&
            pcsRef.current.get(remoteId) === pc &&
            isPeerConnectionUsable(pc)
          ) {
            await videoTransceiver.sender.replaceTrack(videoTrack);
          }
        } catch (err) {
          console.warn("replaceTrack (video) failed", err, remoteId);
          throw err;
        }
      };

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          // detect whether candidate is a relay (TURN) or host/srflx
          const isRelay = String(candidate.candidate || "").includes(
            " typ relay",
          );
          console.debug(
            "[pc.onicecandidate] to:",
            remoteId,
            isRelay ? "relay candidate" : "candidate",
            candidate,
          );
          void sendBroadcast({
            type: "broadcast",
            event: "signal",
            payload: { candidate, from: myId.current, to: remoteId },
          });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStreams((prev) => {
          const stream = prev[remoteId] || new MediaStream();
          if (!stream.getTracks().some((t) => t.id === event.track.id)) {
            stream.addTrack(event.track);
          }
          return {
            ...prev,
            [remoteId]: new MediaStream(stream.getTracks()),
          };
        });
      };

      if (suppressLocalOffer) {
        try {
          await attachLocalTracks();
        } catch (err) {
          console.error("replaceTrack (initial) failed", err);
          cleanupPeer(remoteId);
          return null;
        }
      } else {
        let resolveTracksReady!: () => void;
        const tracksReady = new Promise<void>((res) => {
          resolveTracksReady = res;
        });

        let initialOfferSent = false;
        const sendInitialOfferAfterTracks = async () => {
          await tracksReady;
          if (initialOfferSent) return;
          if (pcsRef.current.get(remoteId) !== pc || !pc) return;
          if (!pc || !isPeerConnectionUsable(pc)) return;
          if (pc.localDescription) return;
          if (makingOfferRef.current[remoteId]) return;
          if (isSettingRemoteDescriptionRef.current[remoteId]) return;
          if (pc.signalingState !== "stable") return;

          initialOfferSent = true;
          try {
            makingOfferRef.current[remoteId] = true;
            const offer = await pc.createOffer();
            if (pc.signalingState !== "stable") return;
            await pc.setLocalDescription(offer);

            void sendBroadcast({
              type: "broadcast",
              event: "signal",
              payload: {
                description: pc.localDescription!,
                from: myId.current,
                to: remoteId,
              },
            });
          } catch (err) {
            console.error("Negotiationneeded error", err);
          } finally {
            makingOfferRef.current[remoteId] = false;
          }
        };

        pc.addEventListener(
          "negotiationneeded",
          () => {
            void sendInitialOfferAfterTracks();
          },
          { once: true },
        );

        try {
          await attachLocalTracks();
        } catch (err) {
          console.error("replaceTrack (initial) failed", err);
          resolveTracksReady();
          cleanupPeer(remoteId);
          return null;
        }
        resolveTracksReady();

        if (
          pcsRef.current.get(remoteId) === pc &&
          pc.signalingState === "stable" &&
          !pc.localDescription
        ) {
          void sendInitialOfferAfterTracks();
        }
      }

      // 추가 디버그용 이벤트 핸들러: 연결 상태/ICE 상태 로깅
      pc.onconnectionstatechange = () => {
        console.debug(
          `[pc.onconnectionstatechange] ${remoteId}:`,
          pc?.connectionState,
        );
      };
      pc.oniceconnectionstatechange = () => {
        console.debug(
          `[pc.oniceconnectionstatechange] ${remoteId}:`,
          pc?.iceConnectionState,
        );
      };
      pc.onsignalingstatechange = () => {
        console.debug(
          `[pc.onsignalingstatechange] ${remoteId}:`,
          pc?.signalingState,
        );
      };

      if (pcsRef.current.get(remoteId) !== pc || !isPeerConnectionUsable(pc)) {
        return null;
      }

      return pc;
    },
    [sendBroadcast, cleanupPeer],
  );

  const negotiatePeer = useCallback(
    async (pc: RTCPeerConnection, remoteId: string) => {
      if (!isPeerConnectionUsable(pc) || makingOfferRef.current[remoteId]) {
        return;
      }
      try {
        makingOfferRef.current[remoteId] = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        void sendBroadcast({
          type: "broadcast",
          event: "signal",
          payload: {
            description: pc.localDescription ?? undefined,
            from: myId.current,
            to: remoteId,
          },
        });
      } catch (err) {
        console.error("Negotiation error", err);
      } finally {
        makingOfferRef.current[remoteId] = false;
      }
    },
    [sendBroadcast],
  );

  const replaceVideoTrackForPeers = useCallback(
    async (track: MediaStreamTrack | null) => {
      const tasks = [...pcsRef.current.entries()].map(
        async ([remoteId, pc]) => {
          if (!isPeerConnectionUsable(pc)) {
            cleanupPeer(remoteId);
            return;
          }

          const sender = videoSendersRef.current.get(remoteId);
          if (!sender) return;

          try {
            await sender.replaceTrack(track);
          } catch (err) {
            console.warn("Video track replacement failed", remoteId, err);
            cleanupPeer(remoteId);
          }
        },
      );

      await Promise.all(tasks);
    },
    [cleanupPeer],
  );

  useEffect(() => {
    if (!nickname) {
      router.push("/");
      return;
    }

    let isMounted = true;

    const init = () => {
      if (!hasCustomTurn) {
        console.warn(
          "[useRoomCall] NEXT_PUBLIC_TURN_URLS not set — external peers may fail to establish media. Set NEXT_PUBLIC_TURN_URLS/NEXT_PUBLIC_TURN_USERNAME/NEXT_PUBLIC_TURN_CREDENTIAL and redeploy.",
        );
      }
      const channel = supabase.channel(`room-${roomId}`, {
        config: { broadcast: { self: false }, presence: { key: myId.current } },
      });

      channel
        .on("broadcast", { event: "signal" }, async ({ payload }) => {
          if (!isMounted || payload.to !== myId.current || !isJoinedRef.current)
            return;
          const { from, description, candidate } = payload;

          try {
            let pc: RTCPeerConnection | null | undefined =
              pcsRef.current.get(from);
            if (!isPeerConnectionUsable(pc)) {
              pc = await createPeerConnection(from, {
                suppressLocalOffer: description?.type === "offer",
              });
            }
            if (!pc) return;

            if (description) {
              const polite = myId.current < from;
              const offerCollision =
                description.type === "offer" &&
                (makingOfferRef.current[from] ||
                  isSettingRemoteDescriptionRef.current[from] ||
                  pc.signalingState !== "stable");

              ignoreOfferRef.current[from] = !polite && offerCollision;
              if (ignoreOfferRef.current[from]) return;

              isSettingRemoteDescriptionRef.current[from] = true;
              if (!isPeerConnectionUsable(pc)) return;

              let activePc = pc;
              try {
                await activePc.setRemoteDescription(description);
              } catch (sdpErr) {
                if (isSdpMlineOrderError(sdpErr)) {
                  console.warn(
                    "[webrtc] SDP m-line 불일치로 피어 재생성 후 재적용",
                    from,
                  );
                  cleanupPeer(from);
                  const fresh = await createPeerConnection(from, {
                    suppressLocalOffer: description?.type === "offer",
                  });
                  if (!fresh) {
                    isSettingRemoteDescriptionRef.current[from] = false;
                    return;
                  }
                  activePc = fresh;
                  await fresh.setRemoteDescription(description);
                } else {
                  throw sdpErr;
                }
              }
              isSettingRemoteDescriptionRef.current[from] = false;

              if (pendingIceCandidatesRef.current[from]?.length) {
                const candidates = pendingIceCandidatesRef.current[from];
                pendingIceCandidatesRef.current[from] = [];
                await Promise.all(
                  candidates.map(async (queuedCandidate) => {
                    try {
                      if (isPeerConnectionUsable(activePc)) {
                        await activePc.addIceCandidate(queuedCandidate);
                      }
                    } catch (err) {
                      if (!ignoreOfferRef.current[from]) {
                        console.error(
                          "Queued ICE candidate failed",
                          err,
                          queuedCandidate,
                        );
                      }
                    }
                  }),
                );
              }

              if (description.type === "offer") {
                const answer = await activePc.createAnswer();
                await activePc.setLocalDescription(answer);
                void sendBroadcast({
                  type: "broadcast",
                  event: "signal",
                  payload: {
                    description: activePc.localDescription ?? undefined,
                    from: myId.current,
                    to: from,
                  },
                });
              }
            } else if (candidate) {
              const remoteDescriptionExists =
                pc.remoteDescription && pc.remoteDescription.type;
              if (!remoteDescriptionExists) {
                pendingIceCandidatesRef.current[from] = [
                  ...(pendingIceCandidatesRef.current[from] || []),
                  candidate,
                ];
              } else {
                try {
                  if (isPeerConnectionUsable(pc)) {
                    await pc.addIceCandidate(candidate);
                  }
                } catch (err) {
                  if (!ignoreOfferRef.current[from]) throw err;
                }
              }
            }
          } catch (err) {
            console.error("Signaling error", err);
          } finally {
            if (from) isSettingRemoteDescriptionRef.current[from] = false;
          }
        })
        .on("broadcast", { event: "media-state-update" }, ({ payload }) => {
          if (!isMounted) return;
          const { from, cameraOn: cam, screenSharing: ss } = payload;
          setParticipantMediaStates((prev) => ({
            ...prev,
            [from]: { cameraOn: cam, screenSharing: ss },
          }));
        })
        .on("broadcast", { event: "call-state-update" }, ({ payload }) => {
          if (!isMounted) return;
          const {
            from,
            nickname: nn,
            joinedAt,
            status,
            cameraOn: cam,
            screenSharing: ss,
          } = payload as CallStatePayload;

          if (!from || from === myId.current) return;

          setParticipants((prev) => {
            const existing = prev.find((p) => p.id === from);
            const nextParticipant: Participant = {
              presence_ref: existing?.presence_ref ?? "",
              id: from,
              nickname: existing?.nickname ?? nn,
              joinedAt: existing?.joinedAt ?? joinedAt,
              status,
              cameraOn: cam,
              screenSharing: ss,
            };

            return [...prev.filter((p) => p.id !== from), nextParticipant].sort(
              (a, b) => a.joinedAt.localeCompare(b.joinedAt),
            );
          });

          if (status === "calling") {
            setParticipantMediaStates((prev) => ({
              ...prev,
              [from]: { cameraOn: cam, screenSharing: ss },
            }));

            if (isJoinedRef.current && !pcsRef.current.has(from)) {
              void createPeerConnection(from);
            }
          } else {
            cleanupPeer(from);
          }
        })
        .on("broadcast", { event: "chat" }, ({ payload }) => {
          if (!isMounted) return;
          setMessages((prev) => [...prev, payload]);
        })
        .on("presence", { event: "sync" }, async () => {
          if (!isMounted) return;
          const state = channel.presenceState();
          console.debug("[presence.sync] raw state:", state);
          const pList: Participant[] = [];
          const mediaStates: Record<
            string,
            { cameraOn: boolean; screenSharing: boolean }
          > = {};

          for (const key of Object.keys(state)) {
            const presences = state[key] as PresencePayload[];
            // skip ids that were just removed to avoid immediate re-add from
            // transient presence.sync states (tombstone behavior)
            const removedAt = recentlyRemovedRef.current[key];
            if (removedAt && Date.now() - removedAt < 2000) {
              // skip this presence for now
              continue;
            }
            const currentPresence = pickCurrentPresence(presences);
            const p = currentPresence
              ? toParticipant(currentPresence.id ?? key, currentPresence)
              : null;
            if (p) {
              pList.push(p);
              // Use participant id for comparisons and media-state mapping
              if (p.id !== myId.current) {
                if (p.status !== "calling") {
                  cleanupPeer(p.id);
                }

                if (isJoinedRef.current && p.status === "calling") {
                  mediaStates[p.id] = {
                    cameraOn: Boolean(p.cameraOn),
                    screenSharing: Boolean(p.screenSharing),
                  };

                  let pc: RTCPeerConnection | null | undefined =
                    pcsRef.current.get(p.id);
                  if (
                    !pc ||
                    pc.connectionState === "failed" ||
                    pc.connectionState === "disconnected"
                  ) {
                    if (pc) {
                      pc.close();
                      pcsRef.current.delete(p.id);
                    }
                    pc = await createPeerConnection(p.id);
                  }

                  if (pc && pc.signalingState === "stable") {
                    void negotiatePeer(pc, p.id);
                  }
                }
              }
            }
          }

          // Debounce presence.sync updates to avoid transient empty states.
          pendingPresenceSyncPayloadRef.current = { pList, mediaStates };
          if (pendingPresenceSyncTimerRef.current) {
            clearTimeout(pendingPresenceSyncTimerRef.current);
          }
          // use longer delay when payload is empty to avoid flashing UI
          const _delay = pList.length === 0 ? 1000 : 250;
          // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
          pendingPresenceSyncTimerRef.current = window.setTimeout(() => {
            const payload = pendingPresenceSyncPayloadRef.current;
            if (!payload) return;
            console.warn(
              "[presence.sync] setParticipants =>",
              payload.pList.map((x) => x.id),
            );

            // If payload is empty, don't immediately clear participants.
            // Only clear after seeing several consecutive empty syncs to avoid
            // transient network/order glitches causing UI flicker.
            if (payload.pList.length === 0) {
              consecutiveEmptySyncsRef.current += 1;
              const required = 3; // need 3 consecutive empties (~3s when using 1s delay)
              console.warn(
                `[presence.sync] empty payload (${consecutiveEmptySyncsRef.current}/${required}) - skipping clear`,
              );
              if (consecutiveEmptySyncsRef.current >= required) {
                setParticipants([]);
                setParticipantMediaStates((prev) => ({ ...prev }));
                consecutiveEmptySyncsRef.current = 0;
              }
            } else {
              // non-empty payload: reset counter and apply
              consecutiveEmptySyncsRef.current = 0;
              setParticipants(payload.pList);
              setParticipantMediaStates((prev) => ({
                ...prev,
                ...payload.mediaStates,
              }));
            }

            pendingPresenceSyncPayloadRef.current = null;
            pendingPresenceSyncTimerRef.current = null;
          }, _delay);
        })
        .on("presence", { event: "join" }, ({ newPresences }) => {
          if (!isMounted) return;
          newPresences.forEach((presence) => {
            const currentPresence = pickCurrentPresence([
              presence as PresencePayload,
            ]);
            const p = toParticipant(
              currentPresence?.id ?? "",
              currentPresence ?? {},
            );
            if (!p) return;
            if (p.id === myId.current) return;

            // clear any recent-removed tombstone when a real join happens
            if (recentlyRemovedRef.current[p.id]) {
              delete recentlyRemovedRef.current[p.id];
            }

            setParticipants((prev) => {
              const filtered = prev.filter((existing) => existing.id !== p.id);
              const next = [
                ...filtered,
                {
                  presence_ref: p.presence_ref,
                  id: p.id,
                  nickname: p.nickname,
                  joinedAt: p.joinedAt,
                  status: p.status || "online",
                  cameraOn: !!p.cameraOn,
                  screenSharing: !!p.screenSharing,
                },
              ];
              console.warn(
                "[presence.join] participants now =>",
                next.map((x) => x.id),
              );
              return next;
            });

            setParticipantMediaStates((prev) => ({
              ...prev,
              [p.id]: {
                cameraOn: !!p.cameraOn,
                screenSharing: !!p.screenSharing,
              },
            }));

            if (isJoinedRef.current && !pcsRef.current.has(p.id)) {
              // If we're in a call, proactively create a peer connection for
              // rejoined participants even if their presence.status hasn't
              // flipped to "calling" yet. This reduces a race where UI shows
              // a participant but media/track negotiation hasn't started.
              void createPeerConnection(p.id);
            }
          });
        })
        .on("presence", { event: "leave" }, ({ leftPresences }) => {
          if (!isMounted) return;
          leftPresences.forEach((presence) => {
            const p = presence as PresencePayload;
            if (!p.id) return;
            if (p.id === myId.current) return;
            const leftId = p.id;

            // mark as recently removed to prevent immediate re-adding from
            // a subsequent presence.sync transient state
            recentlyRemovedRef.current[leftId] = Date.now();

            setParticipants((prev) => {
              const next = prev.filter((item) => item.id !== leftId);
              console.warn(
                "[presence.leave] participants now =>",
                next.map((x) => x.id),
              );
              return next;
            });
            cleanupPeer(leftId);
          });
        });

      channel.subscribe(async (subStatus) => {
        if (!isMounted) return;
        if (subStatus === "SUBSCRIBED") {
          try {
            console.debug(
              "[channel.subscribe] SUBSCRIBED, presenceState:",
              channel.presenceState?.(),
            );
          } catch (e) {
            console.debug(
              "[channel.subscribe] SUBSCRIBED, presenceState read failed",
              e,
            );
          }
          channelReadyRef.current = true;
          channelRef.current = channel;
          setStatus("온라인");
          flushPendingBroadcasts();
          flushPendingPresenceUpdates();
          await channel.track({
            id: myId.current,
            nickname,
            joinedAt: joinedAtRef.current,
            status: isJoinedRef.current ? "calling" : "online",
            cameraOn: cameraOnRef.current,
            screenSharing: screenSharingRef.current,
          });
        } else if (subStatus === "CHANNEL_ERROR") {
          channelReadyRef.current = false;
          setStatus("연결 오류");
          setError("서버와의 연결이 끊어졌습니다.");
        } else if (subStatus === "CLOSED") {
          channelReadyRef.current = false;
        }
      });

      channelRef.current = channel;
    };

    init();

    return () => {
      isMounted = false;
      stopLocalStream();
      pcsRef.current.forEach((pc) => pc.close());
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (pendingPresenceSyncTimerRef.current) {
        clearTimeout(pendingPresenceSyncTimerRef.current);
        pendingPresenceSyncTimerRef.current = null;
      }
    };
  }, [
    roomId,
    nickname,
    router,
    createPeerConnection,
    cleanupPeer,
    stopLocalStream,
    flushPendingBroadcasts,
    flushPendingPresenceUpdates,
    negotiatePeer,
    sendBroadcast,
  ]);

  useEffect(() => {
    isJoinedRef.current = isJoined;
    if (isJoined) {
      const joinCall = async () => {
        const stream = await startLocalStream();
        if (stream && channelRef.current) {
          await updatePresence({ status: "calling" });
          broadcastCallState(
            "calling",
            cameraOnRef.current,
            screenSharingRef.current,
          );
          setStatus("통화 중");

          const state = channelRef.current.presenceState();
          const pending: Promise<RTCPeerConnection | null>[] = [];
          for (const key of Object.keys(state)) {
            if (key === myId.current) continue;
            const presences = state[key] as PresencePayload[];
            const currentPresence = pickCurrentPresence(presences);
            if (
              currentPresence?.status === "calling" &&
              currentPresence.id &&
              !pcsRef.current.has(currentPresence.id)
            ) {
              pending.push(createPeerConnection(currentPresence.id));
            }
          }
          await Promise.all(pending);
        }
      };
      void joinCall();
    } else {
      const leaveCallInternal = async () => {
        if (channelRef.current) {
          await updatePresence({
            status: "online",
            cameraOn: false,
            screenSharing: false,
          });
          broadcastCallState("online", false, false);
        }
        stopLocalStream();
        pcsRef.current.forEach((pc) => pc.close());
        pcsRef.current.clear();
        videoSendersRef.current.clear();
        dataChannelsRef.current.clear();
        setRemoteStreams({});
        setParticipantMediaStates({});
        setStatus("온라인");
      };
      void leaveCallInternal();
    }
  }, [
    isJoined,
    nickname,
    startLocalStream,
    stopLocalStream,
    createPeerConnection,
    updatePresence,
    broadcastCallState,
  ]);

  /** 통화 종료·온라인 전환 후에도 원격 스트림/포커스가 남는 경우 정리 */
  useEffect(() => {
    const callingRemoteIds = new Set(
      participants
        .filter((p) => p.id !== myId.current && p.status === "calling")
        .map((p) => p.id),
    );

    setRemoteStreams((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (!callingRemoteIds.has(id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setParticipantMediaStates((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (id === myId.current) continue;
        if (!callingRemoteIds.has(id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setFocusedId((fid) => {
      if (!fid || fid === myId.current) return fid;
      if (!callingRemoteIds.has(fid)) return null;
      return fid;
    });
  }, [participants]);

  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);
  useEffect(() => {
    cameraOnRef.current = cameraOn;
  }, [cameraOn]);
  useEffect(() => {
    screenSharingRef.current = screenSharing;
  }, [screenSharing]);
  useEffect(() => {
    focusedIdRef.current = focusedId;
  }, [focusedId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !micOn;
        setMicOn(!micOn);
      }
    }
  }, [micOn]);

  const toggleCamera = useCallback(async () => {
    if (!localStreamRef.current) return;
    if (!cameraOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        const track = stream.getVideoTracks()[0];
        localStreamRef.current.addTrack(track);
        await replaceVideoTrackForPeers(track);
        setCameraOn(true);
        cameraOnRef.current = true;
        broadcastMediaState(true, screenSharingRef.current);
      } catch (err) {
        console.error(err);
      }
    } else {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.stop();
        localStreamRef.current.removeTrack(track);
        await replaceVideoTrackForPeers(null);
        setCameraOn(false);
        cameraOnRef.current = false;
        broadcastMediaState(false, screenSharingRef.current);
      }
    }
  }, [cameraOn, replaceVideoTrackForPeers, broadcastMediaState]);

  const stopScreenShare = useCallback(() => {
    const videoTrack = cameraOnRef.current
      ? localStreamRef.current?.getVideoTracks()[0] || null
      : null;
    void replaceVideoTrackForPeers(videoTrack);
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenSharing(false);
    screenSharingRef.current = false;
    if (focusedIdRef.current === myId.current) setFocusedId(null);
    broadcastMediaState(cameraOnRef.current, false);
  }, [broadcastMediaState, replaceVideoTrackForPeers]);

  const toggleScreenShare = useCallback(async () => {
    if (!localStreamRef.current) return;
    if (!screenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { max: 1920 },
            height: { max: 1080 },
            frameRate: { ideal: 60, max: 60 },
          },
          audio: false,
        });
        const track = stream.getVideoTracks()[0];
        if (track && "contentHint" in track) {
          try {
            track.contentHint = "motion";
          } catch {
            /* 일부 브라우저 미지원 */
          }
        }
        screenStreamRef.current = stream;
        await replaceVideoTrackForPeers(track);
        track.onended = () => stopScreenShare();
        setScreenSharing(true);
        screenSharingRef.current = true;
        setFocusedId(myId.current);
        broadcastMediaState(cameraOnRef.current, true);
      } catch (err) {
        console.error(err);
      }
    } else {
      stopScreenShare();
    }
  }, [
    screenSharing,
    replaceVideoTrackForPeers,
    stopScreenShare,
    broadcastMediaState,
  ]);

  const sendMessage = useCallback(() => {
    if (!messageText.trim()) return;
    const msg: ChatMessage = {
      sender: nickname,
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    void sendBroadcast({
      type: "broadcast",
      event: "chat",
      payload: msg,
    });
    setMessages((prev) => [...prev, msg]);
    setMessageText("");
  }, [messageText, nickname, sendBroadcast]);

  const leaveCall = useCallback(() => {
    router.push("/");
  }, [router]);

  const toggleJoin = useCallback(() => {
    setIsJoined((j) => !j);
  }, []);

  const handleFocus = useCallback((id: string) => {
    setFocusedId((cur) => (cur === id ? null : id));
  }, []);

  const selfParticipant: Participant = useMemo(
    () =>
      participants.find((p) => p.id === myId.current) ?? {
        presence_ref: "",
        id: myId.current,
        nickname,
        joinedAt: joinedAtRef.current,
        status: isJoined ? "calling" : "online",
        cameraOn,
        screenSharing,
      },
    [participants, nickname, isJoined, cameraOn, screenSharing],
  );

  const stageParticipants = useMemo(() => {
    const remoteStageParticipants = participants
      .filter((p) => p.id !== myId.current && p.status === "calling")
      .sort((a, b) => {
        const aSharing = participantMediaStates[a.id]?.screenSharing ? 0 : 1;
        const bSharing = participantMediaStates[b.id]?.screenSharing ? 0 : 1;
        return aSharing - bSharing || a.joinedAt.localeCompare(b.joinedAt);
      });
    return [...remoteStageParticipants, selfParticipant];
  }, [participants, participantMediaStates, selfParticipant]);

  const focusedParticipant = useMemo(
    () => stageParticipants.find((p) => p.id === focusedId) ?? null,
    [stageParticipants, focusedId],
  );

  const sideParticipants = useMemo(
    () =>
      focusedParticipant
        ? stageParticipants.filter((p) => p.id !== focusedParticipant.id)
        : [],
    [stageParticipants, focusedParticipant],
  );

  const stageParticipantIds = useMemo(
    () => stageParticipants.map((p) => p.id).join("|"),
    [stageParticipants],
  );

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    if (screenSharing && screenStreamRef.current) {
      el.srcObject = screenStreamRef.current;
    } else if (cameraOn && localStreamRef.current) {
      el.srcObject = localStreamRef.current;
    } else {
      el.srcObject = null;
    }
  }, [cameraOn, screenSharing, focusedId]);

  useEffect(() => {
    if (
      focusedId &&
      !stageParticipantIds.split("|").filter(Boolean).includes(focusedId)
    ) {
      setFocusedId(null);
    }
  }, [focusedId, stageParticipantIds]);

  return {
    roomId,
    nickname,
    myClientId: myId.current,
    isJoined,
    micOn,
    cameraOn,
    screenSharing,
    participants,
    messages,
    messageText,
    setMessageText,
    status,
    error,
    focusedId,
    remoteStreams,
    participantMediaStates,
    stageParticipants,
    focusedParticipant,
    sideParticipants,
    localVideoRef,
    chatEndRef,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    toggleJoin,
    leaveCall,
    handleFocus,
    sendMessage,
  };
}
