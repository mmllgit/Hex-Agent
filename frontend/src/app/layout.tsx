import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOL 海克斯大乱斗助手",
  description: "英雄联盟海克斯大乱斗国服 AI Agent 攻略系统",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-lol-dark antialiased">{children}</body>
    </html>
  );
}
