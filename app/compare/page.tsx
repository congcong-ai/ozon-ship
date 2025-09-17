"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch } from "lucide-react";

type ComparePayload = {
  ts: number;
  input: { unit: "kg" | "g"; weight: number; dims: { l: number; w: number; h: number } };
  items: { id: string; name: string; group: string; totalPriceCNY: number | null; available: boolean; reason?: string }[];
};

export default function ComparePage() {
  const [payload, setPayload] = useState<ComparePayload | null>(null);
  const router = useRouter();

  useEffect(() => {
    // 直接重定向到首页，compare 功能已移除
    router.replace("/");
    const raw = localStorage.getItem("compare_items");
    if (raw) {
      try {
        setPayload(JSON.parse(raw));
      } catch (e) {}
    }
  }, []);

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <PackageSearch className="h-5 w-5 text-primary" />
          <span>比较</span>
        </div>
      </div>
      {!payload ? (
        <p className="text-sm text-muted-foreground">暂无比较数据。在计算页勾选渠道后点击“比较”按钮即可在此查看。</p>
      ) : (
        <div>
          <div className="text-sm text-muted-foreground">
            输入：{payload.input.weight}
            {payload.input.unit}，尺寸 {payload.input.dims.l}×{payload.input.dims.w}×{payload.input.dims.h} (cm)
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">渠道</th>
                  <th className="px-3 py-2 font-medium">分组</th>
                  <th className="px-3 py-2 font-medium">价格(CNY)</th>
                  <th className="px-3 py-2 font-medium">可寄</th>
                  <th className="px-3 py-2 font-medium">备注</th>
                </tr>
              </thead>
              <tbody>
                {payload.items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="px-3 py-2">{it.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{it.group}</td>
                    <td className="px-3 py-2">{it.totalPriceCNY != null ? it.totalPriceCNY.toFixed(2) : "—"}</td>
                    <td className="px-3 py-2">
                      <span className={it.available ? "text-green-600" : "text-red-600"}>{it.available ? "可寄" : "不可寄"}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{it.reason || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
