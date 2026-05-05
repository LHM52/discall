"use client";

import { cn } from "@/lib/utils";
import type { Participant } from "@/lib/room/types";

export function ParticipantSidebar({
  participants,
  myClientId,
  micOn,
  focusedId,
  onSelectParticipant,
}: {
  participants: Participant[];
  myClientId: string;
  micOn: boolean;
  focusedId: string | null;
  onSelectParticipant: (id: string) => void;
}) {
  return (
    <aside className="flex w-60 flex-col border-r border-[#1e1f22] bg-[#2b2d31]">
      <div className="flex h-12 items-center px-4 text-sm font-bold text-white shadow-[0_1px_0_rgba(0,0,0,0.2)]">
        참여자 — {participants.length}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {participants.map((p) => (
          <button
            key={p.id}
            type="button"
            className="mb-0.5 flex w-full cursor-pointer items-center rounded p-2 text-left text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]"
            onClick={() => onSelectParticipant(p.id)}
          >
            <div
              className={cn(
                "relative mr-3 grid h-8 w-8 place-items-center rounded-full bg-[#5865f2] text-xs font-semibold text-white",
                p.id === myClientId &&
                  micOn &&
                  "shadow-[0_0_0_2px_#23a559]",
                focusedId === p.id && "shadow-[0_0_0_2px_#5865f2]",
              )}
            >
              {p.nickname.slice(0, 1)}
              <div
                className={cn(
                  "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#2b2d31]",
                  p.status === "calling" ? "bg-[#23a559]" : "bg-[#80848e]",
                )}
              />
            </div>
            <span>
              {p.nickname} {p.id === myClientId && "(나)"}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
