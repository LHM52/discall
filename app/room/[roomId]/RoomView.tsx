"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRoomCall } from "@/hooks/useRoomCall";
import { CallFooter } from "@/components/room/call-footer";
import { ChatSidebar } from "@/components/room/chat-sidebar";
import { ParticipantSidebar } from "@/components/room/participant-sidebar";
import { RoomErrorPanel } from "@/components/room/room-error-panel";
import { VideoStage } from "@/components/room/video-stage";

export function RoomView({ roomId }: { roomId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nickname = searchParams.get("nickname") ?? "익명";

  const room = useRoomCall({ roomId, nickname, router });

  if (room.error) {
    return (
      <RoomErrorPanel message={room.error} onBack={() => router.push("/")} />
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#313338] text-[#dbdee1]">
      <div className="flex flex-1 overflow-hidden">
        <ParticipantSidebar
          participants={room.participants}
          myClientId={room.myClientId}
          micOn={room.micOn}
          focusedId={room.focusedId}
          onSelectParticipant={room.handleFocus}
        />

        <VideoStage
          nickname={room.nickname}
          myClientId={room.myClientId}
          isJoined={room.isJoined}
          status={room.status}
          cameraOn={room.cameraOn}
          screenSharing={room.screenSharing}
          focusedId={room.focusedId}
          stageParticipants={room.stageParticipants}
          focusedParticipant={room.focusedParticipant}
          sideParticipants={room.sideParticipants}
          remoteStreams={room.remoteStreams}
          participantMediaStates={room.participantMediaStates}
          localVideoRef={room.localVideoRef}
          onFocusTile={room.handleFocus}
          onJoinClick={room.toggleJoin}
        />

        <ChatSidebar
          roomId={room.roomId}
          messages={room.messages}
          messageText={room.messageText}
          onMessageChange={room.setMessageText}
          onSend={room.sendMessage}
          chatEndRef={room.chatEndRef}
        />
      </div>

      <CallFooter
        isJoined={room.isJoined}
        micOn={room.micOn}
        cameraOn={room.cameraOn}
        screenSharing={room.screenSharing}
        onToggleMic={room.toggleMic}
        onToggleCamera={room.toggleCamera}
        onToggleScreen={room.toggleScreenShare}
        onToggleJoin={room.toggleJoin}
        onLeaveRoom={room.leaveCall}
      />
    </div>
  );
}
