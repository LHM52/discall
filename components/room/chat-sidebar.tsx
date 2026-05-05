"use client";

import type { Ref } from "react";
import type { ChatMessage } from "@/lib/room/types";

export function ChatSidebar({
  roomId,
  messages,
  messageText,
  onMessageChange,
  onSend,
  chatEndRef,
}: {
  roomId: string;
  messages: ChatMessage[];
  messageText: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  chatEndRef: Ref<HTMLDivElement>;
}) {
  return (
    <aside className="flex w-[300px] flex-col border-l border-[#1e1f22] bg-[#2b2d31]">
      <div className="flex h-12 items-center px-4 text-sm font-bold text-white shadow-[0_1px_0_rgba(0,0,0,0.2)]">
        {roomId} 서버 채팅
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="scrollbar-discord flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={`${m.timestamp}-${m.sender}-${i}-${m.content.slice(0, 24)}`}
                className="flex flex-col"
              >
                <div className="mb-0.5 flex items-baseline gap-2">
                  <span className="text-[0.95rem] font-semibold text-white">
                    {m.sender}
                  </span>
                  <span className="text-xs text-[#949ba4]">{m.timestamp}</span>
                </div>
                <div className="text-[0.95rem] leading-snug text-[#dbdee1]">
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
        <div className="border-t border-[#1e1f22] p-4">
          <input
            className="w-full rounded-lg border-0 bg-[#383a40] px-4 py-3 text-[#dbdee1] outline-none"
            placeholder={`${roomId}에 메시지 보내기`}
            value={messageText}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSend();
            }}
          />
        </div>
      </div>
    </aside>
  );
}
