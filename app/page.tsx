"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LobbyCard, LobbyScreen } from "@/components/lobby/lobby-layout";
import {
  lobbyInputClassName,
  lobbyPrimaryButtonClassName,
} from "@/components/lobby/input-classes";

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomId, setRoomId] = useState(
    `room-${Math.random().toString(36).slice(2, 8)}`,
  );

  const enterRoom = () => {
    if (!nickname.trim() || !roomId.trim()) {
      return;
    }
    router.push(
      `/room/${encodeURIComponent(roomId)}?nickname=${encodeURIComponent(nickname)}`,
    );
  };

  return (
    <LobbyScreen>
      <LobbyCard>
        <h1 className="mb-2 text-2xl font-bold text-white">환영합니다!</h1>
        <p className="mb-6 text-[#b5bac1]">
          닉네임과 방 ID를 입력하여 통화를 시작하세요.
        </p>

        <div className="mb-5 text-left">
          <label className="mb-2 block text-xs font-bold uppercase text-[#b5bac1]">
            닉네임
          </label>
          <input
            className={lobbyInputClassName}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요"
            autoFocus
          />
        </div>

        <div className="mb-5 text-left">
          <label className="mb-2 block text-xs font-bold uppercase text-[#b5bac1]">
            방 ID
          </label>
          <input
            className={lobbyInputClassName}
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="room-xxxx"
          />
        </div>

        <button
          type="button"
          className={lobbyPrimaryButtonClassName}
          onClick={enterRoom}
          disabled={!nickname.trim() || !roomId.trim()}
        >
          로비로 이동
        </button>
      </LobbyCard>
    </LobbyScreen>
  );
}
