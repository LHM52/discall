const parseTurnServers = () => {
  const servers: RTCIceServer[] = [];

  // 기본 STUN
  servers.push({ urls: ["stun:stun.l.google.com:19302"] });

  // NEXT_PUBLIC_TURN_URLS 환경변수로 TURN 서버 목록을 제공할 수 있습니다.
  // 여러 URL은 콤마 또는 세미콜론으로 구분 가능. 예:
  // "turn:turn1.example.com:3478?transport=udp,turns:turn2.example.com:5349?transport=tcp"
  const turnUrlsRaw = process.env.NEXT_PUBLIC_TURN_URLS;
  const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnPass = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  const parseList = (raw?: string) => {
    if (!raw) return [] as string[];
    return raw
      .split(/[,;]+/) // allow comma or semicolon
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const turnUrls = parseList(turnUrlsRaw);

  if (turnUrls.length > 0) {
    // If user provided URLs but no credential, warn at build/runtime.
    if (
      (!turnUser || !turnPass) &&
      turnUrls.some((u) => u.startsWith("turn:"))
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        "[parseTurnServers] NEXT_PUBLIC_TURN_URLS provided but NEXT_PUBLIC_TURN_USERNAME/CREDENTIAL missing; ephemeral TURN may fail.",
      );
    }

    servers.push({
      urls: turnUrls,
      username: turnUser,
      credential: turnPass,
    });
  } else {
    // No custom TURN configured: warn so operator notices production misconfig.
    // eslint-disable-next-line no-console
    console.warn(
      "[parseTurnServers] No NEXT_PUBLIC_TURN_URLS set — using fallback public TURN. In production, set NEXT_PUBLIC_TURN_URLS/NEXT_PUBLIC_TURN_USERNAME/NEXT_PUBLIC_TURN_CREDENTIAL and redeploy.",
    );

    // 기존의 공용 TURN(제한적)도 보조로 남겨둡니다.
    servers.push({
      urls: ["turn:openrelay.metered.ca:80"],
      username: "openrelayproject",
      credential: "openrelayproject",
    });
  }

  return servers;
};

// Export a small helper so tests or runtime checks can assert custom TURN presence
export const hasCustomTurn = Boolean(process.env.NEXT_PUBLIC_TURN_URLS);

export const defaultRtcConfiguration: RTCConfiguration = {
  iceServers: parseTurnServers(),
};
