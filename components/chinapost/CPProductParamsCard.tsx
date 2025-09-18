"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CPProductParamsCard({
  unit,
  setUnit,
  weightStr,
  setWeightStr,
  dims,
  setDims,
}: {
  unit: "kg" | "g";
  setUnit: (u: "kg" | "g") => void;
  weightStr: string;
  setWeightStr: (s: string) => void;
  dims: { l: number; w: number; h: number };
  setDims: (d: { l: number; w: number; h: number }) => void;
}) {
  return (
    <Card className="rounded-lg border p-4">
      <h2 className="mb-3 font-medium">商品参数</h2>
      <div className="space-y-4">
        {/* 重量 */}
        <div>
          <Label className="mb-2 block">重量</Label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={weightStr}
              placeholder="输入重量"
              onChange={(e) => setWeightStr(e.target.value)}
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <select value={unit} onChange={(e)=> setUnit(e.target.value as any)} className="rounded-md border px-2 py-2 text-sm">
              <option value="g">克(g)</option>
              <option value="kg">千克(kg)</option>
            </select>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">默认单位会自动记忆；输入支持两位小数。</p>
        </div>
        {/* 尺寸 */}
        <div>
          <Label className="mb-2 block">尺寸 (cm)</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input type="number" value={dims.l} onChange={(e)=> setDims({ ...dims, l: Number(e.target.value)||0 })} placeholder="L" />
            <Input type="number" value={dims.w} onChange={(e)=> setDims({ ...dims, w: Number(e.target.value)||0 })} placeholder="W" />
            <Input type="number" value={dims.h} onChange={(e)=> setDims({ ...dims, h: Number(e.target.value)||0 })} placeholder="H" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">用于 e特快 体积重计算（当任一边 ≥ 40cm）。</p>
        </div>
        {/* 属性已拆分为独立卡片 */}
      </div>
    </Card>
  );
}
