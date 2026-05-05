import { Suspense } from "react";
import { LobbyCard, LobbyScreen } from "@/components/lobby/lobby-layout";
import { RoomView } from "./RoomView";

function RoomLoading() {
  return (
    <LobbyScreen>
      <LobbyCard>
        <p className="text-[#b5bac1]">방을 불러오는 중…</p>
      </LobbyCard>
    </LobbyScreen>
  );
}

export default function RoomPage({
  params,
}: {
  params: { roomId: string };
}) {
  return (
    <Suspense fallback={<RoomLoading />}>
      <RoomView roomId={params.roomId} />
    </Suspense>
  );
}
