"use client";

import React from "react";
import { Button } from "@/components/ui/button";

const LS_KEY = "ozon-ship:global-notice:v1:dismissed";

export default function GlobalNotice() {
  const [mounted, setMounted] = React.useState(false);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    try {
      const dismissed = typeof window !== "undefined" && window.localStorage.getItem(LS_KEY) === "1";
      setVisible(!dismissed);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!mounted || !visible) return null;

  const onClose = () => {
    try {
      window.localStorage.setItem(LS_KEY, "1");
    } catch {}
    setVisible(false);
  };

  return (
    <div className="w-full border-b bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-2 text-xs sm:text-sm flex items-center gap-3">
        <span className="font-medium">体验期提示：</span>
        <span className="opacity-90">
          本项目处于公开体验阶段，功能仍在持续打磨，运费/售价计算可能存在偏差，仅供参考。
          欢迎你反馈问题或建议，帮助我们更快改进。
        </span>
        <a
          href="https://xixisys-group.mikecrm.com/YqMhORX"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto hidden sm:inline-flex"
        >
          <Button size="sm" className="h-8">提交反馈</Button>
        </a>
        <button
          aria-label="关闭提示"
          className="ml-2 shrink-0 rounded-md px-2 py-1 text-amber-900/70 hover:bg-amber-100 dark:text-amber-100/80 dark:hover:bg-amber-900"
          onClick={onClose}
        >
          关闭
        </button>
      </div>
    </div>
  );
}
