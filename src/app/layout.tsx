import type { Metadata } from "next";
import { Noto_Sans_KR, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Intervuddy — 면접 준비 도우미",
  description:
    "AI 기반 면접 준비 도우미. 자기소개서 분석, 예상 질문 생성, 모의 면접 연습으로 체계적인 면접 준비를 도와드립니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body
        className={`${notoSansKR.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-iv-bg text-iv-text`}
      >
        {children}
      </body>
    </html>
  );
}
