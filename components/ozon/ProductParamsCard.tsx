"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function ProductParamsCard({
  weightUnit,
  setWeightUnit,
  weightG,
  setWeightG,
  dims,
  setDims,
  sliderRange,
  setSliderPrice,
}: {
  weightUnit: "g" | "kg";
  setWeightUnit: (u: "g" | "kg") => void;
  weightG: number;
  setWeightG: (g: number) => void;
  dims: { l: number; w: number; h: number };
  setDims: (d: { l: number; w: number; h: number }) => void;
  sliderRange: { min: number; max: number } | null;
  setSliderPrice: (p: number) => void;
}) {
  const [weightInput, setWeightInput] = useState<string | null>(null);
  const [lenInput, setLenInput] = useState<string | null>(null);
  const [widInput, setWidInput] = useState<string | null>(null);
  const [heiInput, setHeiInput] = useState<string | null>(null);

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
          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!sliderRange) return;
                setSliderPrice(sliderRange.min);
              }}
            >
              定位到下限
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!sliderRange) return;
                setSliderPrice(sliderRange.max);
              }}
            >
              定位到上限
            </Button>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">默认按克计；切换单位仅影响显示，内部统一用克计算。</p>

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
          <p className="mt-1 text-[11px] text-muted-foreground">用于平台体积计费（任一边 ≥ 40cm）。</p>
        </div>
      </CardContent>
    </Card>
  );
}
