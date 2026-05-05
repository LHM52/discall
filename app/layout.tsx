import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guest WebRTC Call",
  description:
    "Guest voice/video call with screen share and Supabase signaling.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
