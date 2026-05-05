"use client";

import type { Ref } from "react";
import { cn } from "@/lib/utils";
import { getTileSizeClass, getVideoGridClass } from "@/lib/room/helpers";
import type { Participant } from "@/lib/room/types";
import { LobbyCard } from "@/components/lobby/lobby-layout";
import { lobbyPrimaryButtonClassName } from "@/components/lobby/input-classes";
import { LocalVideoTile } from "./local-video-tile";
import { RemoteVideo } from "./remote-video";

export function VideoStage({
  nickname,
  myClientId,
  isJoined,
  status,
  cameraOn,
  screenSharing,
  focusedId,
  stageParticipants,
  focusedParticipant,
  sideParticipants,
  remoteStreams,
  participantMediaStates,
  localVideoRef,
  onFocusTile,
  onJoinClick,
}: {
  nickname: string;
  myClientId: string;
  isJoined: boolean;
  status: string;
  cameraOn: boolean;
  screenSharing: boolean;
  focusedId: string | null;
  stageParticipants: Participant[];
  focusedParticipant: Participant | null;
  sideParticipants: Participant[];
  remoteStreams: Record<string, MediaStream>;
  participantMediaStates: Record<
    string,
    { cameraOn: boolean; screenSharing: boolean }
  >;
  localVideoRef: Ref<HTMLVideoElement>;
  onFocusTile: (id: string) => void;
  onJoinClick: () => void;
}) {
  const renderTile = (p: Participant, className?: string, compact = false) =>
    p.id === myClientId ? (
      <LocalVideoTile
        key={p.id}
        nickname={nickname}
        cameraOn={cameraOn}
        screenSharing={screenSharing}
        focusedId={focusedId}
        myClientId={myClientId}
        localVideoRef={localVideoRef}
        compact={compact}
        className={className}
        avatarSize={compact ? "compact" : "default"}
        onFocus={() => onFocusTile(myClientId)}
      />
    ) : (
      <RemoteVideo
        key={p.id}
        stream={remoteStreams[p.id]}
        nickname={p.nickname}
        isFocused={focusedId === p.id}
        hasFocus={Boolean(focusedId)}
        onFocus={() => onFocusTile(p.id)}
        mediaState={participantMediaStates[p.id]}
        className={className}
        compact={compact}
      />
    );

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-[#313338]">
      <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-[#23a559]">
        {status}
      </div>

      {!isJoined ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-[#313338] px-4 py-8">
          <LobbyCard>
            <div className="mx-auto mb-6 grid h-[120px] w-[120px] place-items-center rounded-full bg-[#5865f2] text-5xl text-white">
              {nickname.slice(0, 1)}
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">준비되셨나요?</h2>
            <p className="mb-8 text-[#b5bac1]">
              통화에 참여하려면 아래 버튼을 클릭하세요.
            </p>
            <button
              type="button"
              className={cn(
                lobbyPrimaryButtonClassName,
                "mx-auto max-w-[240px]",
              )}
              onClick={onJoinClick}
            >
              통화 참여하기
            </button>
          </LobbyCard>
        </div>
      ) : focusedParticipant ? (
        <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4 lg:flex-row">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            {renderTile(focusedParticipant, "max-h-full max-w-[1180px]")}
          </div>
          {sideParticipants.length > 0 && (
            <div className="grid max-h-[180px] shrink-0 grid-flow-col auto-cols-[180px] gap-3 overflow-x-auto lg:max-h-none lg:w-[220px] lg:grid-flow-row lg:auto-cols-auto lg:auto-rows-min lg:overflow-y-auto lg:overflow-x-hidden">
              {sideParticipants.map((p) =>
                renderTile(p, "max-w-[220px]", true),
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "grid flex-1 place-items-center gap-4 overflow-hidden p-4",
            getVideoGridClass(stageParticipants.length),
          )}
        >
          {stageParticipants.map((p) =>
            p.id === myClientId ? (
              <LocalVideoTile
                key={p.id}
                nickname={nickname}
                cameraOn={cameraOn}
                screenSharing={screenSharing}
                focusedId={focusedId}
                myClientId={myClientId}
                localVideoRef={localVideoRef}
                className={getTileSizeClass(stageParticipants.length)}
                avatarSize="grid"
                onFocus={() => onFocusTile(myClientId)}
              />
            ) : (
              <RemoteVideo
                key={p.id}
                stream={remoteStreams[p.id]}
                nickname={p.nickname}
                isFocused={focusedId === p.id}
                hasFocus={Boolean(focusedId)}
                onFocus={() => onFocusTile(p.id)}
                mediaState={participantMediaStates[p.id]}
                className={getTileSizeClass(stageParticipants.length)}
              />
            ),
          )}
        </div>
      )}
    </main>
  );
}
