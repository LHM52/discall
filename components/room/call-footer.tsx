"use client";

import { cn } from "@/lib/utils";

function IconMicOn() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

function IconMicOff() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.17l5.98 6zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.34 3 3 3 .22 0 .44-.03.64-.08l1.65 1.65c-.7.35-1.47.57-2.29.62V21h2v-2.1c1.23-.13 2.36-.59 3.3-1.3l2.03 2.03L21 18.73 4.27 3zM12 16c-2.76 0-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c1.15-.17 2.21-.6 3.12-1.23L12.01 12.6c-.01.01-.01.01-.01.02v3.38z" />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
    </svg>
  );
}

function IconScreen() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
    </svg>
  );
}

function IconHangup() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
    </svg>
  );
}

function IconJoin() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 00-1.02.24l-2.2 2.2a15.05 15.05 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1.02c-.37-1.12-.57-2.32-.57-3.57 0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1zM19 12h2a9 9 0 00-9-9v2a7 7 0 017 7z" />
      <path d="M15 12h2a5 5 0 00-5-5v2a3 3 0 013 3z" />
    </svg>
  );
}

function IconLeaveRoom() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42A6.92 6.92 0 0119 12c0 3.87-3.13 7-7 7s-7-3.13-7-7a6.92 6.92 0 012.59-5.41L6.17 5.17A8.99 8.99 0 003 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
    </svg>
  );
}

export function CallFooter({
  isJoined,
  micOn,
  cameraOn,
  screenSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreen,
  onToggleJoin,
  onLeaveRoom,
}: {
  isJoined: boolean;
  micOn: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreen: () => void;
  onToggleJoin: () => void;
  onLeaveRoom: () => void;
}) {
  return (
    <footer className="fixed bottom-6 left-4 z-30 flex flex-col items-center justify-center gap-2 rounded-full bg-[#232428]/95 p-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)] md:left-[260px]">
      {isJoined ? (
        <>
          <button
            type="button"
            className={cn(
              "grid h-12 w-12 place-items-center rounded-full bg-[#313338] text-[#dbdee1] transition-colors hover:bg-[#383a40] hover:text-white [&_svg]:h-5 [&_svg]:w-5",
              !micOn && "bg-white text-[#313338]",
            )}
            onClick={onToggleMic}
            title={micOn ? "마이크 끄기" : "마이크 켜기"}
          >
            {micOn ? <IconMicOn /> : <IconMicOff />}
          </button>
          <button
            type="button"
            className={cn(
              "grid h-12 w-12 place-items-center rounded-full bg-[#313338] text-[#dbdee1] transition-colors hover:bg-[#383a40] hover:text-white [&_svg]:h-5 [&_svg]:w-5",
              cameraOn && "bg-white text-[#313338]",
            )}
            onClick={onToggleCamera}
            title={cameraOn ? "카메라 끄기" : "카메라 켜기"}
          >
            <IconCamera />
          </button>
          <button
            type="button"
            className={cn(
              "grid h-12 w-12 place-items-center rounded-full bg-[#313338] text-[#dbdee1] transition-colors hover:bg-[#383a40] hover:text-white [&_svg]:h-5 [&_svg]:w-5",
              screenSharing && "bg-white text-[#313338]",
            )}
            onClick={onToggleScreen}
            title={screenSharing ? "화면 공유 중지" : "화면 공유"}
          >
            <IconScreen />
          </button>
          <button
            type="button"
            className="grid h-12 w-12 place-items-center rounded-full bg-[#da373c] text-white transition-colors hover:bg-[#a1282c] [&_svg]:h-5 [&_svg]:w-5"
            onClick={onToggleJoin}
            title="통화 종료"
          >
            <IconHangup />
          </button>
        </>
      ) : (
        <button
          type="button"
          className="grid h-12 w-12 place-items-center rounded-full bg-[#23a559] text-white transition-colors hover:bg-[#1a7f45] [&_svg]:h-5 [&_svg]:w-5"
          onClick={onToggleJoin}
          title="통화 참여"
        >
          <IconJoin />
        </button>
      )}
      <button
        type="button"
        className="grid h-12 w-12 place-items-center rounded-full bg-[#313338] text-[#dbdee1] transition-colors hover:bg-[#383a40] hover:text-white [&_svg]:h-5 [&_svg]:w-5"
        onClick={onLeaveRoom}
        title="방 나가기"
      >
        <IconLeaveRoom />
      </button>
    </footer>
  );
}
