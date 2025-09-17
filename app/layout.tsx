import "./globals.css";
import { ReactNode } from "react";
import MobileTabBar from "@/components/mobile-tab-bar";
import TopNav from "@/components/top-nav";
import GlobalNotice from "@/components/global/GlobalNotice";
import FeedbackFab from "@/components/global/FeedbackFab";

export const metadata = {
  title: "Ozon Ship Calculator",
  description: "China Post to Russia price calculator",
};

// 启用安全区支持
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-[100dvh] antialiased" suppressHydrationWarning>
        <GlobalNotice />
        <TopNav />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-[calc(env(safe-area-inset-bottom)+5rem)] sm:pb-0">
          {children}
        </div>
        <MobileTabBar />
        <FeedbackFab />
      </body>
    </html>
  );
}
