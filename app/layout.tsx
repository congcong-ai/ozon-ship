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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <GlobalNotice />
        <TopNav />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16 sm:pb-0">
          {children}
        </div>
        <MobileTabBar />
        <FeedbackFab />
      </body>
    </html>
  );
}
