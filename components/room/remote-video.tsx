"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type MediaState = { cameraOn: boolean; screenSharing: boolean } | undefined;

export function RemoteVideo({
  stream,
  nickname,
  isFocused,
  hasFocus,
  onFocus,
  mediaState,
  className,
  compact = false,
}: {
  stream: MediaStream | undefined;
  nickname: string;
  isFocused: boolean;
  hasFocus: boolean;
  onFocus: () => void;
  mediaState: MediaState;
  className?: string;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [mediaEpoch, setMediaBump] = useState(0);

  const trackIds = useMemo(
    () =>
      stream
        ?.getVideoTracks()
        .map((t) => t.id)
        .join(",") ?? "",
    [stream],
  );

  const audioTrackIds = useMemo(
    () =>
      stream
        ?.getAudioTracks()
        .map((t) => t.id)
        .join(",") ?? "",
    [stream],
  );

  const isMediaActive = Boolean(
    mediaState?.cameraOn || mediaState?.screenSharing,
  );
  const hasVideo = isMediaActive;

  useEffect(() => {
    const videoEl = videoRef.current;
    const audioEl = audioRef.current;
    if (!videoEl || !audioEl) return;

    const vTracks = stream?.getVideoTracks() ?? [];
    const aTracks = stream?.getAudioTracks() ?? [];

    videoEl.srcObject =
      vTracks.length > 0 ? new MediaStream(vTracks) : null;
    audioEl.srcObject =
      aTracks.length > 0 ? new MediaStream(aTracks) : null;

    const playSafe = (el: HTMLMediaElement) =>
      el.play().catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("미디어 재생 실패:", err);
        }
      });

    if (vTracks.length) void playSafe(videoEl);
    if (aTracks.length) void playSafe(audioEl);
  }, [stream, isMediaActive, trackIds, audioTrackIds, mediaEpoch]);

  useEffect(() => {
    const bump = () => setMediaBump((n) => n + 1);
    stream?.addEventListener("addtrack", bump);
    stream?.addEventListener("removetrack", bump);
    const tracks = [...(stream?.getVideoTracks() ?? []), ...(stream?.getAudioTracks() ?? [])];
    tracks.forEach((track) => {
      track.addEventListener("mute", bump);
      track.addEventListener("unmute", bump);
      track.addEventListener("ended", bump);
    });
    return () => {
      stream?.removeEventListener("addtrack", bump);
      stream?.removeEventListener("removetrack", bump);
      tracks.forEach((track) => {
        track.removeEventListener("mute", bump);
        track.removeEventListener("unmute", bump);
        track.removeEventListener("ended", bump);
      });
    };
  }, [stream, trackIds, audioTrackIds]);

  return (
    <div
      className={cn(
        "group relative flex aspect-video w-full overflow-hidden rounded-lg border-2 border-transparent bg-black transition-all duration-300",
        isFocused && "border-[#5865f2]",
        hasFocus && !isFocused && "opacity-80",
        compact && "rounded-md",
        className,
      )}
      onClick={onFocus}
    >
      <audio ref={audioRef} autoPlay className="hidden" />

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "h-full w-full object-cover",
          !hasVideo && "pointer-events-none absolute opacity-0",
        )}
      />

      {!hasVideo && (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#2b2d31]">
          <div
            className={cn(
              "mb-3 grid place-items-center rounded-full bg-[#5865f2] text-white",
              compact ? "h-14 w-14 text-2xl" : "h-24 w-24 text-4xl",
            )}
          >
            {nickname.slice(0, 1)}
          </div>
          <div className={cn("font-medium", compact && "text-sm")}>
            {nickname}
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-sm">
        {nickname}
        {mediaState?.screenSharing && " (화면 공유 중)"}
      </div>
      <span className="pointer-events-none absolute right-3 top-3 z-10 rounded bg-black/60 px-3 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
        {isFocused ? "축소" : "확대"}
      </span>
    </div>
  );
}
