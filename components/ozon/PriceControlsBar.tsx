"use client";

import * as React from "react";
import Slider from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import type { DeliveryMode } from "@/types/ozon";
import { HelpCircle } from "lucide-react";
import { carrierName } from "@/lib/carrier_names";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PriceControlsBar({
  sliderRange,
  sliderPrice,
  setSliderPrice,
  priceInput,
  setPriceInput,
  sliderBreakdown,
  chartTriple,
  rubPerCny,
  activeGroup,
  danger = false,
  dangerMessage = null,
  demandModel = 'none',
  setDemandModel,
  demandStats = null,
  ceEpsilon = 1.8,
  setCeEpsilon,
  cePrefP0 = null,
  setCePrefP0,
  recommendPriceCE = null,
  recommendPriceLOG = null,
  logisticP10 = null,
  setLogisticP10,
  logisticP90 = null,
  setLogisticP90,
}: {
  sliderRange: { min: number; max: number };
  sliderPrice: number | null;
  setSliderPrice: (v: number) => void;
  priceInput: string | null;
  setPriceInput: (s: string | null) => void;
  sliderBreakdown: {
    margin: number;
    profit_cny: number;
    intl_logistics_rub: number;
  } | null;
  chartTriple: { carrier: string; tier: string; delivery: DeliveryMode };
  rubPerCny: number;
  activeGroup: string;
  danger?: boolean;
  dangerMessage?: string | null;
  demandModel?: 'none' | 'ce' | 'logistic';
  setDemandModel?: (m: 'none' | 'ce' | 'logistic') => void;
  demandStats?: { q_norm: number; pi_norm_cny: number } | null;
  ceEpsilon?: number;
  setCeEpsilon?: (v: number) => void;
  cePrefP0?: number | null;
  setCePrefP0?: (v: number | null) => void;
  recommendPriceCE?: number | null;
  recommendPriceLOG?: number | null;
  logisticP10?: number | null;
  setLogisticP10?: (v: number | null) => void;
  logisticP90?: number | null;
  setLogisticP90?: (v: number | null) => void;
}) {
  const [epsInput, setEpsInput] = React.useState<string>(() => (Number.isFinite(ceEpsilon as number) ? String(ceEpsilon) : ""));
  const [p0Input, setP0Input] = React.useState<string>(() => (cePrefP0 == null ? "" : String(cePrefP0)));
  const [logP10Input, setLogP10Input] = React.useState<string>(() => (logisticP10 == null ? "" : String(logisticP10)));
  const [logP90Input, setLogP90Input] = React.useState<string>(() => (logisticP90 == null ? "" : String(logisticP90)));
  const [moreOpen, setMoreOpen] = React.useState<boolean>(false);
  const [helpCEOpen, setHelpCEOpen] = React.useState<boolean>(false);
  const [helpLOGOpen, setHelpLOGOpen] = React.useState<boolean>(false);
  const [priceCnyInput, setPriceCnyInput] = React.useState<string | null>(null);
  React.useEffect(() => { setEpsInput(Number.isFinite(ceEpsilon as number) ? String(ceEpsilon) : ""); }, [ceEpsilon]);
  React.useEffect(() => { setP0Input(cePrefP0 == null ? "" : String(cePrefP0)); }, [cePrefP0]);
  React.useEffect(() => { setLogP10Input(logisticP10 == null ? "" : String(logisticP10)); }, [logisticP10]);
  React.useEffect(() => { setLogP90Input(logisticP90 == null ? "" : String(logisticP90)); }, [logisticP90]);
  function deliveryZh(d: DeliveryMode) {
    if (d === "door") return "上门配送";
    // 其余视为自提
    return "取货点";
  }
  function toggleModel(kind: 'ce' | 'logistic') {
    if (!setDemandModel) return;
    if (demandModel === kind) setDemandModel('none');
    else setDemandModel(kind);
  }
  // 双输入框（₽/¥）显示与提交工具
  const rubDisplay = priceInput ?? (typeof sliderPrice==='number' ? sliderPrice.toFixed(2) : "");
  const rubNumber = Number(priceInput ?? (typeof sliderPrice==='number' ? sliderPrice : NaN));
  const cnyDerived = (rubPerCny > 0 && isFinite(rubNumber)) ? (rubNumber / rubPerCny).toFixed(2) : "";
  const cnyDisplay = priceCnyInput ?? cnyDerived;
  function commitRubFromString(s: string) {
    if (!sliderRange) return;
    if (s.trim() === "") { setPriceInput(null); setPriceCnyInput(null); return; }
    const v = Number(s);
    const bad = Number.isNaN(v) || !isFinite(v);
    if (bad) { setPriceInput(null); return; }
    const vv = Math.round(v*100)/100;
    const clamped = Math.min(sliderRange.max, Math.max(sliderRange.min, vv));
    setSliderPrice(clamped);
    setPriceInput(null);
    setPriceCnyInput(null);
  }
  function commitCnyFromString(s: string) {
    if (!sliderRange) return;
    if (s.trim() === "") { setPriceCnyInput(null); setPriceInput(null); return; }
    const c = Number(s);
    const bad = Number.isNaN(c) || !isFinite(c) || !(rubPerCny > 0);
    if (bad) { setPriceCnyInput(null); return; }
    const rub = Math.round(c * rubPerCny * 100) / 100;
    const clamped = Math.min(sliderRange.max, Math.max(sliderRange.min, rub));
    setSliderPrice(clamped);
    setPriceInput(null);
    setPriceCnyInput(null);
  }
  const defaultP0 = (sliderRange.min + sliderRange.max) / 2;
  return (
    <div>
      {/* 突出显示的滑块区：浅色强调底 + 边框 + 阴影 + 更大留白 */}
      <div className="rounded-lg border border-accent/40 bg-accent/20 shadow-sm px-4 sm:px-6 py-7 sm:py-8 my-6">
        <div className="flex items-end justify-between text-xs text-muted-foreground mb-3">
          <span>₽ {sliderRange.min}</span>
          <span>₽ {sliderRange.max}</span>
        </div>
        <div>
          <Slider
            variant={danger ? 'danger' : 'default'}
            value={[sliderPrice ?? sliderRange.min]}
            min={sliderRange.min}
            max={sliderRange.max}
            step={0.01}
            onValueChange={(v)=> {
              if (!v || v.length === 0 || typeof v[0] !== 'number' || !isFinite(v[0])) return;
              setSliderPrice(Math.round(v[0]*100)/100);
            }}
          />
        </div>
      </div>
      <div className="mt-4 sm:mt-5 flex flex-col gap-3 text-sm">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          {/* 左：售价输入区（更明显的卡片样式） */}
          <div className={"rounded-md border bg-white shadow-sm p-3 sm:p-2 " + (danger ? "border-red-400" : "border-slate-200")}> 
            <div className="text-[12px] text-slate-600 mb-1">售价</div>
            <div className="flex items-center gap-2">
              {/* ₽ 输入 */}
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500">₽</span>
                <Input
                  className={"h-8 w-28 pl-5 " + (danger ? "border-red-500 text-red-600 focus-visible:ring-red-500" : "")}
                  type="number"
                  step="0.01"
                  value={rubDisplay}
                  onChange={(e)=>{ setPriceInput(e.target.value); setPriceCnyInput(null); }}
                  onKeyDown={(e)=>{
                    if (e.key === 'Enter') { e.preventDefault(); commitRubFromString((e.target as HTMLInputElement).value); }
                  }}
                  onBlur={(e)=>{ commitRubFromString((e.target as HTMLInputElement).value); }}
                />
              </div>
              <span className="text-slate-400">=</span>
              {/* ¥ 输入 */}
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500">¥</span>
                <Input
                  className={"h-8 w-28 pl-5 " + (danger ? "border-red-500 text-red-600 focus-visible:ring-red-500" : "")}
                  type="number"
                  step="0.01"
                  value={cnyDisplay}
                  onChange={(e)=>{
                    const val = e.target.value;
                    setPriceCnyInput(val);
                    const v = Number(val);
                    if (!Number.isNaN(v) && isFinite(v) && rubPerCny > 0) {
                      const rub = Math.round(v * rubPerCny * 100) / 100;
                      setPriceInput(String(rub));
                    }
                  }}
                  onKeyDown={(e)=>{
                    if (e.key === 'Enter') { e.preventDefault(); commitCnyFromString((e.target as HTMLInputElement).value); }
                  }}
                  onBlur={(e)=>{ commitCnyFromString((e.target as HTMLInputElement).value); }}
                />
              </div>
            </div>
          </div>

          {/* 右：信息区（与左侧明显分隔） */}
          {sliderBreakdown && (
            <div className="flex-1 sm:pl-4 sm:border-l sm:border-slate-200">
              {/* 桌面版：原有多行文本展示 */}
              <div className="text-sm hidden sm:block">
                <div>
                  利润率：{(sliderBreakdown.margin*100).toFixed(2)}% · 利润：₽ {(sliderBreakdown.profit_cny * rubPerCny).toFixed(2)} / ¥ {sliderBreakdown.profit_cny.toFixed(2)}
                </div>
                {demandModel !== 'none' && demandStats ? (
                  <div>
                    销量（相对）：{demandStats.q_norm.toFixed(3)} · 总利润（相对，¥）：{demandStats.pi_norm_cny.toFixed(2)}
                  </div>
                ) : null}
                <div>
                  货件分组：{activeGroup} · 国际物流费（{carrierName(chartTriple.carrier)} / {chartTriple.tier} / {deliveryZh(chartTriple.delivery)}）：₽ {sliderBreakdown.intl_logistics_rub.toFixed(2)}
                </div>
              </div>
              {/* 移动版：四行列表展示 */}
              <ul className="text-sm list-disc list-inside space-y-0.5 sm:hidden">
                <li>利润率：{(sliderBreakdown.margin*100).toFixed(2)}%</li>
                <li>利润：₽ {(sliderBreakdown.profit_cny * rubPerCny).toFixed(2)} / ¥ {sliderBreakdown.profit_cny.toFixed(2)}</li>
                <li>货件分组：{activeGroup}</li>
                <li>国际物流费（{carrierName(chartTriple.carrier)} / {chartTriple.tier} / {deliveryZh(chartTriple.delivery)}）：₽ {sliderBreakdown.intl_logistics_rub.toFixed(2)}</li>
              </ul>
              {demandModel !== 'none' && demandStats ? (
                <div className="text-xs text-slate-600 sm:hidden mt-1">
                  销量（相对）：{demandStats.q_norm.toFixed(3)} · 总利润（相对，¥）：{demandStats.pi_norm_cny.toFixed(2)}
                </div>
              ) : null}
            </div>
          )}
        </div>
        {dangerMessage && demandModel === 'none' && (
          <div className="w-full text-xs sm:text-sm text-red-700 mt-1">
            {dangerMessage}
          </div>
        )}
        {/* 销量模型切换与参数（带浅色背景，风格与滑杆区一致） */}
        <div className="w-full mt-2">
          <div className="rounded-md border border-accent/40 bg-accent/20 px-3 py-2">
            <div className="flex flex-col gap-2 text-[12px] text-slate-700">
              {/* 桌面版：横排布局 */}
              <div className="hidden sm:inline-flex items-center gap-3 flex-wrap">
                <span className="text-slate-600">结合销量，预测总利润：</span>

                <div className="inline-flex items-center gap-2 select-none">
                  <input type="checkbox" checked={demandModel === 'ce'} onChange={()=> toggleModel('ce')} />
                  <span className="shrink-0 inline-flex items-center gap-1">
                    <span className="whitespace-nowrap">模型1：常数弹性</span>
                    <span className="relative inline-flex items-center group" tabIndex={0} onClick={()=> setHelpCEOpen(true)}>
                      <HelpCircle className="h-4 w-4 text-slate-500 cursor-help" />
                      <div className="absolute z-40 hidden sm:group-hover:block sm:group-focus-within:block top-6 left-0 sm:left-0 sm:right-auto w-[280px] rounded-md border bg-white p-3 shadow-md text-[12px] leading-5">
                      <div className="font-medium mb-1">常数弹性模型（Constant Elasticity）</div>
                      <div>假设销量 q(P) 与价格 P 满足 q(P) = (P / P0)^(-ε)，其中 ε &gt; 0。</div>
                      <div className="mt-1">直观解释：当 ε = 1.8 时，价格提高 10%，销量大约下降 18%；反之降价 10%，销量约上升 18%。</div>
                      <div className="mt-1">参数设置：
                        <br/>• ε（弹性）：反映价格变化对销量的敏感度，建议 1.0~3.0；
                        <br/>• P0（参考价）：决定曲线在价格轴上的“基准位置”。默认取当前区间中值，便于在缺少历史数据时取得稳健推断。
                      </div>
                      <div className="mt-1">关于 P0：
                        <br/>• 若有历史成交价数据，建议取“历史成交的中位价/稳定价位”；
                        <br/>• 若为新品无历史，可用“区间中值”或“同品类主流价格”作为初始；
                        <br/>• 调大 P0 会让曲线整体“右移”（同一售价对应更高相对销量预期），调小 P0 相反。
                      </div>
                      <div className="text-slate-500 mt-1">适用性：对“价格-销量”关系近似满足幂律的品类较可靠；对强促销/库存约束/上新等场景仅作粗略参考。</div>
                      </div>
                    </span>
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 select-none">
                  <input type="checkbox" checked={demandModel === 'logistic'} onChange={()=> toggleModel('logistic')} />
                  <span className="shrink-0 inline-flex items-center gap-1">
                    <span className="whitespace-nowrap">模型2：逻辑斯蒂</span>
                    <span className="relative inline-flex items-center group" tabIndex={0} onClick={()=> setHelpLOGOpen(true)}>
                      <HelpCircle className="h-4 w-4 text-slate-500 cursor-help" />
                      <div className="absolute z-40 hidden sm:group-hover:block sm:group-focus-within:block top-6 left-0 sm:left-0 sm:right-auto w-[280px] rounded-md border bg-white p-3 shadow-md text-[12px] leading-5">
                      <div className="font-medium mb-1">逻辑斯蒂模型（Logistic）</div>
                      <div>假设销量 q(P) = 1 / (1 + exp(k · (P - Pmid)))，呈 S 型：低价销量接近上限，高价销量接近 0。</div>
                      <div className="mt-1">本页估计方式：使用全局价格区间的 10% 与 90% 两点来确定斜率 k 与中位 Pmid，确保曲线连续平滑（避免分段跳变）。</div>
                      <div className="mt-1">举例：若区间为 1000~2000，则 P10≈1100、P90≈1900，中位约 1500，P 上升越过 1500 后销量下降加速。</div>
                      <div className="mt-1">可调参数（可选）：
                        <br/>• P10 / P90：销量从高位向低位过渡的 10% 与 90% 位置，用于确定斜率与中位点（留空则用系统默认）。
                      </div>
                      <div className="text-slate-500 mt-1">适用性：对“低价饱和—中段拐点—高价流量稀薄”的品类较可靠；若强活动/曝光不随价变时，参考意义降低。</div>
                      </div>
                    </span>
                  </span>
                </div>

                <button className="ml-1 text-[12px] text-slate-600 hover:underline" onClick={()=> setMoreOpen(true)}>更多模型</button>
              </div>

              {/* 移动版：四行布局 */}
              <div className="sm:hidden flex flex-col gap-2">
                <span className="text-slate-600">结合销量，预测总利润：</span>
                <div className="inline-flex items-center gap-2 select-none">
                  <input type="checkbox" checked={demandModel === 'ce'} onChange={()=> toggleModel('ce')} />
                  <span className="shrink-0 inline-flex items-center gap-1">
                    <span className="whitespace-nowrap">模型1：常数弹性</span>
                    <span className="relative inline-flex items-center group" tabIndex={0} onClick={()=> setHelpCEOpen(true)}>
                      <HelpCircle className="h-4 w-4 text-slate-500 cursor-help" />
                      <div className="absolute z-40 hidden sm:group-hover:block sm:group-focus-within:block top-6 left-0 w-[280px] rounded-md border bg-white p-3 shadow-md text-[12px] leading-5">
                      <div className="font-medium mb-1">常数弹性模型（Constant Elasticity）</div>
                      <div>假设销量 q(P) 与价格 P 满足 q(P) = (P / P0)^(-ε)，其中 ε &gt; 0。</div>
                      <div className="mt-1">直观解释：当 ε = 1.8 时，价格提高 10%，销量大约下降 18%；反之降价 10%，销量约上升 18%。</div>
                      <div className="mt-1">参数设置：
                        <br/>• ε（弹性）：反映价格变化对销量的敏感度，建议 1.0~3.0；
                        <br/>• P0（参考价）：决定曲线在价格轴上的“基准位置”。默认取当前区间中值，便于在缺少历史数据时取得稳健推断。
                      </div>
                      <div className="mt-1">关于 P0：
                        <br/>• 若有历史成交价数据，建议取“历史成交的中位价/稳定价位”；
                        <br/>• 若为新品无历史，可用“区间中值”或“同品类主流价格”作为初始；
                        <br/>• 调大 P0 会让曲线整体“右移”（同一售价对应更高相对销量预期），调小 P0 相反。
                      </div>
                      <div className="text-slate-500 mt-1">适用性：对“价格-销量”关系近似满足幂律的品类较可靠；对强促销/库存约束/上新等场景仅作粗略参考。</div>
                      </div>
                    </span>
                  </span>
                </div>
                {/* 第二行：模型2 */}
                <div className="inline-flex items-center gap-2 select-none">
                  <input type="checkbox" checked={demandModel === 'logistic'} onChange={()=> toggleModel('logistic')} />
                  <span className="shrink-0 inline-flex items-center gap-1">
                    <span className="whitespace-nowrap">模型2：逻辑斯蒂</span>
                    <span className="relative inline-flex items-center group" tabIndex={0} onClick={()=> setHelpLOGOpen(true)}>
                      <HelpCircle className="h-4 w-4 text-slate-500 cursor-help" />
                      <div className="absolute z-40 hidden sm:group-hover:block sm:group-focus-within:block top-6 left-0 w-[280px] rounded-md border bg-white p-3 shadow-md text-[12px] leading-5">
                      <div className="font-medium mb-1">逻辑斯蒂模型（Logistic）</div>
                      <div>假设销量 q(P) = 1 / (1 + exp(k · (P - Pmid)))，呈 S 型：低价销量接近上限，高价销量接近 0。</div>
                      <div className="mt-1">本页估计方式：使用全局价格区间的 10% 与 90% 两点来确定斜率 k 与中位 Pmid，确保曲线连续平滑（避免分段跳变）。</div>
                      <div className="mt-1">举例：若区间为 1000~2000，则 P10≈1100、P90≈1900，中位约 1500，P 上升越过 1500 后销量下降加速。</div>
                      <div className="mt-1">可调参数（可选）：
                        <br/>• P10 / P90：销量从高位向低位过渡的 10% 与 90% 位置，用于确定斜率与中位点（留空则用系统默认）。
                      </div>
                      <div className="text-slate-500 mt-1">适用性：对“低价饱和—中段拐点—高价流量稀薄”的品类较可靠；若强活动/曝光不随价变时，参考意义降低。</div>
                      </div>
                    </span>
                  </span>
                </div>
                {/* 第四行：更多模型 */}
                <div>
                  <button className="text-[12px] text-slate-600 hover:underline" onClick={()=> setMoreOpen(true)}>更多模型</button>
                </div>
              </div>

              {/* 模型1参数：仅在 CE 选中时显示 */}
              {demandModel === 'ce' && (
                <div className="inline-flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-1">
                    <span>ε：</span>
                    <Input
                      className="h-7 w-20"
                      type="number"
                      step="0.1"
                      min={1.0}
                      max={5.0}
                      value={epsInput}
                      onChange={(e)=> { setEpsInput(e.target.value); }}
                      onKeyDown={(e)=>{
                        if (e.key === 'Enter') {
                          const v = Number(epsInput);
                          if (!setCeEpsilon || Number.isNaN(v)) return;
                          const clamped = Math.max(0.5, Math.min(5.0, v));
                          setCeEpsilon(clamped);
                        }
                      }}
                      onBlur={()=>{
                        const v = Number(epsInput);
                        if (!setCeEpsilon || Number.isNaN(v)) return;
                        const clamped = Math.max(0.5, Math.min(5.0, v));
                        setCeEpsilon(clamped);
                      }}
                    />
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <span>P0：</span>
                    <Input
                      className="h-7 w-28"
                      type="number"
                      step="0.01"
                      placeholder={defaultP0.toFixed(2)}
                      value={p0Input}
                      onChange={(e)=>{ setP0Input(e.target.value); }}
                      onKeyDown={(e)=>{
                        if (e.key === 'Enter') {
                          if (!setCePrefP0) return;
                          const t = p0Input.trim();
                          if (t === "") { setCePrefP0(null); return; }
                          const v = Number(t);
                          if (Number.isNaN(v)) return;
                          const vv = Math.round(v*100)/100;
                          const clamped = Math.min(sliderRange.max, Math.max(sliderRange.min, vv));
                          setCePrefP0(clamped);
                        }
                      }}
                      onBlur={()=>{
                        if (!setCePrefP0) return;
                        const t = p0Input.trim();
                        if (t === "") { setCePrefP0(null); return; }
                        const v = Number(t);
                        if (Number.isNaN(v)) return;
                        const vv = Math.round(v*100)/100;
                        const clamped = Math.min(sliderRange.max, Math.max(sliderRange.min, vv));
                        setCePrefP0(clamped);
                      }}
                    />
                    <span className="text-muted-foreground">（为空则用区间中值）</span>
                  </div>
                </div>
              )}
              {/* 模型2参数：仅在 Logistic 选中时显示 */}
              {demandModel === 'logistic' && (
                <div className="inline-flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-1">
                    <span>P10：</span>
                    <Input
                      className="h-7 w-28"
                      type="number"
                      step="0.01"
                      placeholder={(sliderRange.min + 0.1 * (sliderRange.max - sliderRange.min)).toFixed(2)}
                      value={logP10Input}
                      onChange={(e)=> setLogP10Input(e.target.value)}
                      onKeyDown={(e)=>{
                        if (e.key === 'Enter') {
                          if (!setLogisticP10) return;
                          const t = logP10Input.trim();
                          if (t === "") { setLogisticP10(null); return; }
                          const v = Number(t); if (Number.isNaN(v)) return; setLogisticP10(v);
                        }
                      }}
                      onBlur={() => {
                        if (!setLogisticP10) return;
                        const t = logP10Input.trim();
                        if (t === "") { setLogisticP10(null); return; }
                        const v = Number(t); if (Number.isNaN(v)) return; setLogisticP10(v);
                      }}
                    />
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <span>P90：</span>
                    <Input
                      className="h-7 w-28"
                      type="number"
                      step="0.01"
                      placeholder={(sliderRange.min + 0.9 * (sliderRange.max - sliderRange.min)).toFixed(2)}
                      value={logP90Input}
                      onChange={(e)=> setLogP90Input(e.target.value)}
                      onKeyDown={(e)=>{
                        if (e.key === 'Enter') {
                          if (!setLogisticP90) return;
                          const t = logP90Input.trim();
                          if (t === "") { setLogisticP90(null); return; }
                          const v = Number(t); if (Number.isNaN(v)) return; setLogisticP90(v);
                        }
                      }}
                      onBlur={() => {
                        if (!setLogisticP90) return;
                        const t = logP90Input.trim();
                        if (t === "") { setLogisticP90(null); return; }
                        const v = Number(t); if (Number.isNaN(v)) return; setLogisticP90(v);
                      }}
                    />
                  </div>
                  <span className="text-muted-foreground">（留空则用区间 10%/90% 默认）</span>
                </div>
              )}
              {/* 推荐价提示：仅在勾选任一销量模型时显示 */}
              {demandModel !== 'none' && (
                <div className="text-[12px] text-slate-600">
                  <div>模型1（常数弹性）最大总利润推荐价：{typeof recommendPriceCE === 'number' ? `₽ ${recommendPriceCE.toFixed(2)}` : '—'}</div>
                  <div>模型2（逻辑斯蒂）最大总利润推荐价：{typeof recommendPriceLOG === 'number' ? `₽ ${recommendPriceLOG.toFixed(2)}` : '—'}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* 模型说明 Dialog（移动端） */}
      <Dialog open={helpCEOpen} onOpenChange={setHelpCEOpen}>
        <DialogContent className="sm:hidden max-w-[92vw]">
          <DialogHeader>
            <DialogTitle>常数弹性模型（Constant Elasticity）</DialogTitle>
          </DialogHeader>
          <div className="text-[13px] leading-6 text-slate-700">
            假设销量 q(P) 与价格 P 满足 q(P) = (P / P0)^(-ε)，其中 ε &gt; 0。
            <div className="mt-2">直观解释：当 ε = 1.8 时，价格提高 10%，销量大约下降 18%；反之降价 10%，销量约上升 18%。</div>
            <div className="mt-2">参数设置：
              <br/>• ε（弹性）：反映价格变化对销量的敏感度，建议 1.0~3.0；
              <br/>• P0（参考价）：决定曲线在价格轴上的“基准位置”。默认取当前区间中值，便于在缺少历史数据时取得稳健推断。
            </div>
            <div className="mt-2">关于 P0：
              <br/>• 若有历史成交价数据，建议取“历史成交的中位价/稳定价位”；
              <br/>• 若为新品无历史，可用“区间中值”或“同品类主流价格”作为初始；
              <br/>• 调大 P0 会让曲线整体“右移”（同一售价对应更高相对销量预期），调小 P0 相反。
            </div>
            <div className="text-slate-500 mt-2">适用性：对“价格-销量”关系近似满足幂律的品类较可靠；对强促销/库存约束/上新等场景仅作粗略参考。</div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={()=> setHelpCEOpen(false)}>好的</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={helpLOGOpen} onOpenChange={setHelpLOGOpen}>
        <DialogContent className="sm:hidden max-w-[92vw]">
          <DialogHeader>
            <DialogTitle>逻辑斯蒂模型（Logistic）</DialogTitle>
          </DialogHeader>
          <div className="text-[13px] leading-6 text-slate-700">
            假设销量 q(P) = 1 / (1 + exp(k · (P - Pmid)))，呈 S 型：低价销量接近上限，高价销量接近 0。
            <div className="mt-2">本页估计方式：使用全局价格区间的 10% 与 90% 两点来确定斜率 k 与中位 Pmid，确保曲线连续平滑（避免分段跳变）。</div>
            <div className="mt-2">举例：若区间为 1000~2000，则 P10≈1100、P90≈1900，中位约 1500，P 上升越过 1500 后销量下降加速。</div>
            <div className="mt-2">可调参数（可选）：
              <br/>• P10 / P90：销量从高位向低位过渡的 10% 与 90% 位置，用于确定斜率与中位点（留空则用系统默认）。
            </div>
            <div className="text-slate-500 mt-2">适用性：对“低价饱和—中段拐点—高价流量稀薄”的品类较可靠；若强活动/曝光不随价变时，参考意义降低。</div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={()=> setHelpLOGOpen(false)}>好的</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 更多模型 Dialog */}
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>想要更多销量模型？</DialogTitle>
          </DialogHeader>
          <div className="text-sm leading-6 text-slate-700">
            我们正在逐步引入更多适配不同品类/阶段的销量模型（如：分段线性、指数衰减、价格阈值跳变、时序回归含节假日/活动因素、导入你自己的历史数据拟合等）。
            <br/>如果你愿意与我们共创，请与我们联系，告诉我们你的场景与数据需求，我们会优先为你打磨最有价值的模型，并向全体用户开放，帮助更多卖家更好地定价。
          </div>
          <div className="text-xs text-slate-500">你可以点击右下角“反馈”按钮留言，或发送邮件至 peter@xixisys.com</div>
          <div className="flex justify-end">
            <Button size="sm" onClick={()=> setMoreOpen(false)}>好的</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
