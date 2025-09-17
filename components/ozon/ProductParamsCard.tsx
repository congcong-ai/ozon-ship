"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OzonGroup, OzonGroupRule } from "@/types/ozon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProductParamsCard({
  weightUnit,
  setWeightUnit,
  weightG,
  setWeightG,
  dims,
  setDims,
  activeGroup,
  activeRule,
}: {
  weightUnit: "g" | "kg";
  setWeightUnit: (u: "g" | "kg") => void;
  weightG: number;
  setWeightG: (g: number) => void;
  dims: { l: number; w: number; h: number };
  setDims: (d: { l: number; w: number; h: number }) => void;
  activeGroup: OzonGroup;
  activeRule: OzonGroupRule | null;
}) {
  const [weightInput, setWeightInput] = useState<string | null>(null);
  const [lenInput, setLenInput] = useState<string | null>(null);
  const [widInput, setWidInput] = useState<string | null>(null);
  const [heiInput, setHeiInput] = useState<string | null>(null);

  const { sum, longest, volKg, divisor, overLimit } = useMemo(() => {
    const l = Number.isFinite(dims.l) ? Math.max(0, dims.l) : 0;
    const w = Number.isFinite(dims.w) ? Math.max(0, dims.w) : 0;
    const h = Number.isFinite(dims.h) ? Math.max(0, dims.h) : 0;
    const s = l + w + h;
    const m = Math.max(l, w, h);
    const d = activeRule?.dimsLimit?.volumetric_divisor || 12000;
    const vol = (l * w * h) / Math.max(1e-9, d);
    const over = !!(activeRule?.dimsLimit) && (s > (activeRule!.dimsLimit!.sum_cm_max + 1e-9) || m > (activeRule!.dimsLimit!.longest_cm_max + 1e-9));
    return { sum: s, longest: m, volKg: vol, divisor: d, overLimit: over };
  }, [dims.l, dims.w, dims.h, activeRule?.dimsLimit?.sum_cm_max, activeRule?.dimsLimit?.longest_cm_max, activeRule?.dimsLimit?.volumetric_divisor]);

  // 是否为“物理重量与体积重取大者”计费
  const isDimBilling = activeRule?.billing === "max_of_physical_and_dimensional";

  return (
    <Card className="shadow-none h-full min-h-[150px]">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base">商品参数</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="grid grid-cols-3 gap-2 items-end">
          <div className="col-span-2">
            <Input
              id="weight"
              type="number"
              placeholder="输入重量"
              value={weightInput ?? String(weightUnit === "g" ? weightG : Number((weightG / 1000).toFixed(3)))}
              onChange={(e) => {
                const s = e.target.value;
                setWeightInput(s);
                if (s === "") return; // 允许清空
                const v = Number(s);
                if (!Number.isNaN(v)) {
                  const grams = weightUnit === "g" ? v : v * 1000;
                  setWeightG(Math.max(0, grams));
                }
              }}
              onBlur={() => setWeightInput(null)}
            />
          </div>
          <div className="col-span-1">
            <Select value={weightUnit} onValueChange={(v) => setWeightUnit(v as "g" | "kg")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="单位" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="g">克(g)</SelectItem>
                <SelectItem value="kg">千克(kg)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1" />
        </div>
        <div className="mt-3">
          <Label className="mb-1">尺寸 (cm)</Label>
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">L</span>
              <Input
                className="pl-5"
                type="number"
                value={lenInput ?? String(dims.l)}
                onChange={(e) => {
                  const s = e.target.value;
                  setLenInput(s);
                  if (s === "") return;
                  const v = Number(s);
                  if (!Number.isNaN(v)) setDims({ ...dims, l: v });
                }}
                onBlur={() => setLenInput(null)}
              />
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">W</span>
              <Input
                className="pl-5"
                type="number"
                value={widInput ?? String(dims.w)}
                onChange={(e) => {
                  const s = e.target.value;
                  setWidInput(s);
                  if (s === "") return;
                  const v = Number(s);
                  if (!Number.isNaN(v)) setDims({ ...dims, w: v });
                }}
                onBlur={() => setWidInput(null)}
              />
            </div>
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">H</span>
              <Input
                className="pl-5"
                type="number"
                value={heiInput ?? String(dims.h)}
                onChange={(e) => {
                  const s = e.target.value;
                  setHeiInput(s);
                  if (s === "") return;
                  const v = Number(s);
                  if (!Number.isNaN(v)) setDims({ ...dims, h: v });
                }}
                onBlur={() => setHeiInput(null)}
              />
            </div>
          </div>
        </div>
        {/* <p className="mt-1 text-[11px] text-muted-foreground">用于平台体积计费（任一边 ≥ 40cm）。</p> */}
        {/* 当前货件组的价格/重量限制 */}
        {/* {activeRule ? (
          <div className="mt-2 text-[12px] text-muted-foreground">
            <div>
              <span>当前货件组：</span>
              <span className="font-medium text-foreground">{activeGroup}</span>
            </div>
            <div className="mt-0.5">
              价格范围：₽ {activeRule.priceRub.min} ~ ₽ {activeRule.priceRub.max}；
              重量范围：{activeRule.weightG.min} ~ {activeRule.weightG.max} g（{(activeRule.weightG.min/1000).toFixed(3)} ~ {(activeRule.weightG.max/1000).toFixed(3)} kg）
            </div>
          </div>
        ) : null} */}

        {/* 体积计费提示框：仅在“取大者计费”时显示（无论是否超限） */}
        {isDimBilling ? (
          <div className="mt-2 rounded-md border bg-accent/20 text-[12px] px-2 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">当前货件组：</span>
              <span className="font-medium">{activeGroup}</span>
            </div>
            <div className="mt-1 text-muted-foreground">
              你的尺寸：{dims.l} × {dims.w} × {dims.h} cm（和 = {sum.toFixed(1)} cm，最长边 = {longest.toFixed(1)} cm）
            </div>
            <div className="mt-1">
              <span className="text-muted-foreground">体积重预估：</span>
              <span>{volKg.toFixed(3)} kg</span>
              <span className="text-muted-foreground">（按 长×宽×高 ÷ {divisor}）</span>
            </div>
            <div className="mt-1 text-muted-foreground">
              计费重量取大者：max(实际重 {weightUnit === "kg" ? ((weightG/1000).toFixed(3)+" kg") : `${weightG} g`}, 体积重 {volKg.toFixed(3)} kg)
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
