import { createClient } from "@supabase/supabase-js";

// 자동으로 .env.local, .env 로드 시도 (설치되어 있으면 자동 반영)
try {
    const dotenv = await import("dotenv");
    // 먼저 .env.local, 그다음 .env
    dotenv.config({ path: ".env.local" });
    dotenv.config();
    console.debug("[simulate] dotenv loaded (.env.local/.env)");
} catch (e) {
    // dotenv 미설치인 경우엔 무시 — 수동으로 env를 설정해 주세요
    console.debug("[simulate] dotenv not available, skipping auto-load");
}

const [, , roomId, nicknameArg = "bot", clientIdArg, statusArg = "calling"] = process.argv;
if (!roomId) {
    console.error("Usage: node tools/simulateParticipant.mjs <roomId> [nickname] [clientId] [calling|online]");
    process.exit(1);
}
const nickname = nicknameArg;
const clientId = clientIdArg ?? `bot-${Math.random().toString(36).slice(2, 8)}`;
let callStatus = statusArg === "online" ? "online" : "calling";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("환경변수 NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되어 있지 않습니다.");
    process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
    const channel = supabase.channel(`room-${roomId}`, {
        config: { broadcast: { self: true }, presence: { key: clientId } },
    });

    channel.on("broadcast", (ev) => {
        console.log("[broadcast]", ev);
    });

    channel.on("presence", { event: "sync" }, () => {
        try {
            console.log("[presence.sync] keys=", Object.keys(channel.presenceState()));
        } catch (e) {
            console.warn("[presence.sync] read error", e);
        }
    });

    channel.on("presence", { event: "join" }, ({ newPresences }) => {
        console.log("[presence.join]", newPresences);
    });

    channel.on("presence", { event: "leave" }, ({ leftPresences }) => {
        console.log("[presence.leave]", leftPresences);
    });

    await channel.subscribe(async (status) => {
        console.log("channel subscribe status:", status);
        if (status === "SUBSCRIBED") {
            console.log("tracking presence:", clientId, nickname, callStatus);
            await channel.track({
                id: clientId,
                nickname,
                joinedAt: new Date().toISOString(),
                status: callStatus,
                cameraOn: false,
                screenSharing: false,
            });

            await channel.send({
                type: "broadcast",
                event: "call-state-update",
                payload: {
                    from: clientId,
                    nickname,
                    joinedAt: new Date().toISOString(),
                    status: callStatus,
                    cameraOn: false,
                    screenSharing: false,
                },
            });

            console.log("시뮬레이터 준비됨. Enter: toggle calling/online, 'exit' 종료.");
        }
    });

    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", async (data) => {
        const cmd = data.toString().trim();
        if (cmd === "") {
            callStatus = callStatus === "calling" ? "online" : "calling";
            console.log("토글 상태 ->", callStatus);
            await channel.track({ id: clientId, nickname, joinedAt: new Date().toISOString(), status: callStatus, cameraOn: false, screenSharing: false });
            await channel.send({ type: "broadcast", event: "call-state-update", payload: { from: clientId, nickname, joinedAt: new Date().toISOString(), status: callStatus, cameraOn: false, screenSharing: false } });
        } else if (cmd === "exit" || cmd === "quit") {
            console.log("종료합니다.");
            try {
                await channel.untrack();
            } catch (e) { }
            process.exit(0);
        } else {
            console.log("명령 없음. Enter: 토글, exit: 종료");
        }
    });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
