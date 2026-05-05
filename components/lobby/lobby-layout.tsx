import type { ReactNode } from "react";

/** 홈 로비와 동일한 전체 배경·중앙 정렬 */
export function LobbyScreen({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#313338] px-4 text-[#dbdee1]">
      {children}
    </main>
  );
}

/** 홈 로비 카드(패널) — 방 대기·로딩에도 재사용 */
export function LobbyCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[480px] rounded-lg bg-[#2b2d31] p-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
      {children}
    </div>
  );
}
