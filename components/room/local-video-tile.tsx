"use client";

import type { Ref } from "react";
import { cn } from "@/lib/utils";

type AvatarSize = "compact" | "default" | "grid";

const avatarClass: Record<AvatarSize, string> = {
  compact: "mb-3 h-14 w-14 text-2xl",
  default: "mb-3 h-24 w-24 text-4xl",
  grid: "mb-4 h-[120px] w-[120px] text-5xl",
};

export function LocalVideoTile({
  nickname,
  cameraOn,
  screenSharing,
  focusedId,
  myClientId,
  localVideoRef,
  compact,
  className,
  avatarSize = "default",
  onFocus,
}: {
  nickname: string;
  cameraOn: boolean;
  screenSharing: boolean;
  focusedId: string | null;
  myClientId: string;
  localVideoRef: Ref<HTMLVideoElement>;
  compact?: boolean;
  className?: string;
  avatarSize?: AvatarSize;
  onFocus: () => void;
}) {
  const isFocused = focusedId === myClientId;
  const hasFocus = Boolean(focusedId);

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
      {cameraOn || screenSharing ? (
        <video
          key={screenSharing ? "screen" : cameraOn ? "camera" : "video"}
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#2b2d31]">
          <div
            className={cn(
              "grid place-items-center rounded-full bg-[#5865f2] text-white",
              avatarClass[avatarSize],
            )}
          >
            {nickname.slice(0, 1)}
          </div>
          <div
            className={cn(
              "font-medium",
              compact && "text-sm",
              avatarSize === "grid" && "text-base",
            )}
          >
            {nickname} (나)
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-sm">
        {nickname} {screenSharing && "(화면 공유 중)"}
      </div>
      <span className="pointer-events-none absolute right-3 top-3 z-10 rounded bg-black/60 px-3 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
        {isFocused ? "축소" : "확대"}
      </span>
    </div>
  );
}
