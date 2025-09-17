"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch } from "lucide-react";

type HistoryItem = {
  ts: number;
  input: { unit: "kg" | "g"; weight: number; dims: { l: number; w: number; h: number } };
  top: { id: string; name: string; price: number | null }[];
};

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    // 直接重定向到首页，历史功能已移除
    router.replace("/");
    const raw = localStorage.getItem("calc_history");
    if (raw) {
      try {
        setItems(JSON.parse(raw));
      } catch (e) {}
    }
  }, []);

  function clearHistory() {
    localStorage.removeItem("calc_history");
    setItems([]);
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <PackageSearch className="h-5 w-5 text-primary" />
          <span>历史记录</span>
        </div>
        {items.length > 0 && (
          <button className="text-sm text-red-600 underline" onClick={clearHistory}>清空</button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">暂无历史。进行一次计算并点击“比较”后将自动记录最近搜索。</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((h, idx) => (
            <li key={idx} className="rounded-lg border p-3">
              <div className="text-sm text-muted-foreground">
                {new Date(h.ts).toLocaleString()} — 重量 {h.input.weight}{h.input.unit}，尺寸 {h.input.dims.l}×{h.input.dims.w}×{h.input.dims.h} (cm)
              </div>
              <div className="mt-2 text-sm">
                Top：{h.top.map((t) => `${t.name}${t.price != null ? `￥${t.price.toFixed(2)}` : "—"}`).join("， ")}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
