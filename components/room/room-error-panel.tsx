"use client";

export function RoomErrorPanel({
  message,
  onBack,
}: {
  message: string;
  onBack: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#313338] px-4 text-[#dbdee1]">
      <div className="w-full max-w-[480px] rounded-lg bg-[#2b2d31] p-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
        <h1 className="mb-2 text-2xl font-bold text-[#da373c]">오류</h1>
        <p>{message}</p>
        <button
          type="button"
          className="mt-6 w-full rounded-[3px] bg-[#5865f2] p-2.5 font-medium text-white transition-colors hover:bg-[#4752c4]"
          onClick={onBack}
        >
          돌아가기
        </button>
      </div>
    </main>
  );
}
