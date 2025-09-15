"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Slider from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Dialog 已拆分至独立组件
import { PackageSearch, Search } from "lucide-react";
import { bestPricingWithAutoLoad, loadAllCarrierRates, OZON_GROUP_RULES, computeProfitForPrice, priceRangeForMargin } from "@/lib/ozon_pricing";
import type { DeliveryMode, OzonPricingParams, ResultItem, OzonGroup } from "@/types/ozon";
import PriceChart from "@/components/ozon/price-chart";
import { useOzonChart } from "@/hooks/useOzonChart";
import ProductParamsCard from "@/components/ozon/ProductParamsCard";
import ProfitCostCard from "@/components/ozon/ProfitCostCard";
import LogisticsFilterCard from "@/components/ozon/LogisticsFilterCard";
import FxToolbar from "@/components/ozon/FxToolbar";
import SearchBar from "@/components/ozon/SearchBar";
import ResultSummary from "@/components/ozon/ResultSummary";
import CandidatesCard from "@/components/ozon/CandidatesCard";
import ChartLegend from "@/components/ozon/ChartLegend";
import SettingsDialog from "@/components/ozon/SettingsDialog";
import DetailsDialog from "@/components/ozon/DetailsDialog";
import PriceControlsBar from "@/components/ozon/PriceControlsBar";
import PriceChartCard from "@/components/ozon/PriceChartCard";

// 组别颜色映射（保持跨渲染稳定）
const GROUP_COLORS: Record<OzonGroup, string> = {
  "Extra Small": "#0ea5e9",   // sky-500
  Budget: "#06b6d4",          // cyan-500
  Small: "#22c55e",           // green-500
  Big: "#eab308",             // amber-500
  "Premium Small": "#ef4444", // red-500
  "Premium Big": "#a855f7",   // purple-500
};


export default function OzonPage() {
  const LS_KEY = "ozon_page_state_v1";
  const rates = useMemo(() => loadAllCarrierRates(), []);
  const carriers = useMemo(() => Array.from(new Set(rates.map((r) => r.carrier))), [rates]);
  const [carrier, setCarrier] = useState<string>("");
  const tiers = useMemo(() => {
    const list = rates.filter((r) => !carrier || r.carrier === carrier).map((r) => r.tier);
    return Array.from(new Set(list));
  }, [rates, carrier]);
  const [tier, setTier] = useState<string>("");
  const [delivery, setDelivery] = useState<DeliveryMode | "">("");

  // 商品参数
  const [weightG, setWeightG] = useState<number>(100);
  const [dims, setDims] = useState<{ l: number; w: number; h: number }>({ l: 20, w: 10, h: 5 });
  const [costCny, setCostCny] = useState<number>(5);

  // 费率参数
  const [commission, setCommission] = useState(0.12);
  const [acquiring, setAcquiring] = useState(0.019);
  const [fx, setFx] = useState(0.012);
  const [fxIncludeIntl, setFxIncludeIntl] = useState(true); // 默认包含国际物流费
  const [lastmileRate, setLastmileRate] = useState(0.02);
  const [lastmileMin, setLastmileMin] = useState(15);
  const [lastmileMax, setLastmileMax] = useState(200);
  const [maxMargin, setMaxMargin] = useState<number>(1); // 100%
  const [minMargin, setMinMargin] = useState<number>(0.1); // 10%
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // 汇率（RUB/CNY）
  const [rubPerCny, setRubPerCny] = useState<number>(11.830961);
  const [rubFxMode, setRubFxMode] = useState<'auto'|'manual'>('auto');
  const [rubPerCnyInput, setRubPerCnyInput] = useState<string | null>(null);
  const [loadingFx, setLoadingFx] = useState(false);
  const [fxUpdatedAt, setFxUpdatedAt] = useState<string | null>(null);
  const [fxSource, setFxSource] = useState<string | null>(null);
  const [fxError, setFxError] = useState<string | null>(null);

  // 结果
  const [best, setBest] = useState<ResultItem | null>(null);
  const [top, setTop] = useState<ResultItem[]>([]);
  const [sortKey, setSortKey] = useState<"margin" | "price" | "receipt">("margin");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const ALL = "__ALL__";
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "table">("list");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState<ResultItem | null>(null);
  const [weightUnit, setWeightUnit] = useState<"g" | "kg">("g");
  // 字符串态输入，允许清空
  const [weightInput, setWeightInput] = useState<string | null>(null);
  const [lenInput, setLenInput] = useState<string | null>(null);
  const [widInput, setWidInput] = useState<string | null>(null);
  const [heiInput, setHeiInput] = useState<string | null>(null);
  const [minMarginInput, setMinMarginInput] = useState<string | null>(null);
  const [maxMarginInput, setMaxMarginInput] = useState<string | null>(null);
  const [costInput, setCostInput] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string | null>(null);

  // 售价滑块与利润率曲线
  const [sliderPrice, setSliderPrice] = useState<number | null>(null);
  const [sliderRange, setSliderRange] = useState<{ min: number; max: number } | null>(null);
  const [customItem, setCustomItem] = useState<ResultItem | null>(null);
  // 曲线组模式：auto 跟随 best；或显式锁定到某一组
  const [groupMode, setGroupMode] = useState<'auto' | OzonGroup>("auto");

  // 本地记忆重量单位
  useEffect(() => {
    try {
      const u = localStorage.getItem("ozon_weight_unit");
      if (u === "g" || u === "kg") setWeightUnit(u as "g" | "kg");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("ozon_weight_unit", weightUnit);
    } catch {}
  }, [weightUnit]);

  // 读取页面状态（刷新后恢复）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw || "{}");
      if (typeof s.weightG === 'number') setWeightG(s.weightG);
      if (s.dims && typeof s.dims.l === 'number' && typeof s.dims.w === 'number' && typeof s.dims.h === 'number') setDims(s.dims);
      if (typeof s.costCny === 'number') setCostCny(s.costCny);
      if (typeof s.commission === 'number') setCommission(s.commission);
      if (typeof s.acquiring === 'number') setAcquiring(s.acquiring);
      if (typeof s.fx === 'number') setFx(s.fx);
      if (typeof s.fxIncludeIntl === 'boolean') setFxIncludeIntl(s.fxIncludeIntl);
      if (typeof s.lastmileRate === 'number') setLastmileRate(s.lastmileRate);
      if (typeof s.lastmileMin === 'number') setLastmileMin(s.lastmileMin);
      if (typeof s.lastmileMax === 'number') setLastmileMax(s.lastmileMax);
      if (typeof s.minMargin === 'number') setMinMargin(s.minMargin);
      if (typeof s.maxMargin === 'number') setMaxMargin(s.maxMargin);
      if (typeof s.rubPerCny === 'number') setRubPerCny(s.rubPerCny);
      if (s.rubFxMode === 'auto' || s.rubFxMode === 'manual') setRubFxMode(s.rubFxMode);
      if (typeof s.carrier === 'string') setCarrier(s.carrier);
      if (typeof s.tier === 'string') setTier(s.tier);
      if (typeof s.delivery === 'string') setDelivery(s.delivery);
      if (typeof s.weightUnit === 'string' && (s.weightUnit === 'g' || s.weightUnit === 'kg')) setWeightUnit(s.weightUnit);
      if (typeof s.sliderPrice === 'number') setSliderPrice(s.sliderPrice);
      if (typeof s.sortKey === 'string' && (s.sortKey === 'margin' || s.sortKey === 'price' || s.sortKey === 'receipt')) setSortKey(s.sortKey);
      if (typeof s.sortOrder === 'string' && (s.sortOrder === 'asc' || s.sortOrder === 'desc')) setSortOrder(s.sortOrder);
      if (typeof s.viewMode === 'string' && (s.viewMode === 'list' || s.viewMode === 'table')) setViewMode(s.viewMode);
      if (typeof s.query === 'string') setQuery(s.query);
      if (typeof s.groupMode === 'string') {
        const allowed: OzonGroup[] = [
          "Extra Small","Budget","Small","Big","Premium Small","Premium Big"
        ];
        if (s.groupMode === 'auto') setGroupMode('auto');
        else if (allowed.includes(s.groupMode as OzonGroup)) setGroupMode(s.groupMode as OzonGroup);
      }
    } catch {}
  }, []);

  // 写入页面状态（关键输入变更时）
  useEffect(() => {
    try {
      const s = {
        weightG,
        dims,
        costCny,
        commission,
        acquiring,
        fx,
        fxIncludeIntl,
        lastmileRate,
        lastmileMin,
        lastmileMax,
        minMargin,
        maxMargin,
        rubPerCny,
        rubFxMode,
        carrier,
        tier,
        delivery,
        weightUnit,
        sliderPrice,
        sortKey,
        sortOrder,
        viewMode,
        query,
        groupMode,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(s));
    } catch {}
  }, [weightG, dims.l, dims.w, dims.h, costCny, commission, acquiring, fx, fxIncludeIntl, lastmileRate, lastmileMin, lastmileMax, minMargin, maxMargin, rubPerCny, rubFxMode, carrier, tier, delivery, weightUnit, sliderPrice, sortKey, sortOrder, viewMode, query, groupMode]);

  // 汇率拉取：先尝试 exchangerate.host，失败回退 open.er-api.com
  async function refreshFx() {
    setFxError(null);
    setLoadingFx(true);
    try {
      let ok = false;
      // 1) exchangerate.host
      try {
        const res = await fetch("https://api.exchangerate.host/latest?base=CNY&symbols=RUB");
        if (res.ok) {
          const data = await res.json();
          const v = data?.rates?.RUB;
          if (typeof v === "number" && isFinite(v)) {
            setRubPerCny(v);
            setFxSource("exchangerate.host");
            setFxUpdatedAt(new Date().toLocaleString());
            ok = true;
          }
        }
      } catch {}
      // 2) fallback: open.er-api.com
      if (!ok) {
        const res2 = await fetch("https://open.er-api.com/v6/latest/CNY");
        if (res2.ok) {
          const data2 = await res2.json();
          const v2 = data2?.rates?.RUB;
          if (typeof v2 === "number" && isFinite(v2)) {
            setRubPerCny(v2);
            const ts = data2?.time_last_update_utc || new Date().toUTCString();
            setFxSource("open.er-api.com");
            setFxUpdatedAt(new Date(ts).toLocaleString());
            ok = true;
          }
        }
      }
      if (!ok) {
        setFxError("汇率未更新，请稍后重试");
      }
    } catch (e) {
      setFxError("汇率刷新失败，请检查网络");
    } finally {
      setLoadingFx(false);
    }
  }

  // 自动刷新：仅在自动模式下进行（rubFxMode 变化时触发一次）
  useEffect(() => {
    if (rubFxMode === 'auto') refreshFx();
  }, [rubFxMode]);

  // 若本地无有效汇率，且处于自动模式，才触发一次刷新
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) { if (rubFxMode === 'auto') refreshFx(); return; }
      const s = JSON.parse(raw || "{}");
      if ((typeof s?.rubPerCny !== 'number' || !isFinite(s.rubPerCny) || s.rubPerCny <= 0) && rubFxMode === 'auto') {
        refreshFx();
      }
    } catch {
      if (rubFxMode === 'auto') refreshFx();
    }
  }, [rubFxMode]);

  // 自动计算：当任一参数变化时即时刷新；仅在结果变化时更新状态
  useEffect(() => {
    const params: OzonPricingParams = {
      weight_g: weightG,
      dims_cm: dims,
      cost_cny: costCny,
      commission,
      acquiring,
      fx,
      last_mile: { rate: lastmileRate, min_rub: lastmileMin, max_rub: lastmileMax },
      rub_per_cny: rubPerCny,
      fx_include_intl: fxIncludeIntl,
      min_margin: (typeof minMargin === "number") ? minMargin : undefined,
      max_margin: (typeof maxMargin === "number" && maxMargin > 0) ? maxMargin : undefined,
      carrier: carrier || undefined,
      tier: tier || undefined,
      delivery: (delivery || undefined) as any,
    };
    const out = bestPricingWithAutoLoad(params, 4);
    setBest((prev)=>{
      const changed = !prev || !out.best || prev.price_rub !== out.best.price_rub || prev.carrier!==out.best.carrier || prev.tier!==out.best.tier || prev.delivery!==out.best.delivery;
      return changed ? out.best : prev;
    });
    setTop((prev)=>{
      const sameLen = prev.length === out.top.length;
      const sameAll = sameLen && prev.every((v,i)=> v.price_rub===out.top[i].price_rub && v.carrier===out.top[i].carrier && v.tier===out.top[i].tier && v.delivery===out.top[i].delivery);
      return sameAll ? prev : out.top;
    });
  }, [weightG, dims.l, dims.w, dims.h, costCny, commission, acquiring, fx, lastmileRate, lastmileMin, lastmileMax, rubPerCny, fxIncludeIntl, minMargin, maxMargin, carrier, tier, delivery]);

  // 选取用于曲线与滑块的“激活费率 + 组”
  const feasibleGroups = useMemo<OzonGroup[]>(() => {
    return OZON_GROUP_RULES
      .filter((r) => weightG >= r.weightG.min && weightG <= r.weightG.max)
      .map((r) => r.group as OzonGroup);
  }, [weightG]);

  const activeGroup = useMemo<OzonGroup>(() => {
    if (groupMode && groupMode !== "auto" && feasibleGroups.includes(groupMode)) return groupMode as OzonGroup;
    if (best) return best.group;
    return feasibleGroups[0];
  }, [groupMode, best, feasibleGroups]);

  // 根据售价按平台价分段推断组（并校验重量是否可行）
  function groupFromPrice(price: number): OzonGroup | null {
    const hit = OZON_GROUP_RULES.find(r => price >= r.priceRub.min && price <= r.priceRub.max && weightG >= r.weightG.min && weightG <= r.weightG.max);
    return hit ? (hit.group as OzonGroup) : null;
  }

  // 按当前售价动态推断组（优先用于滑块联动显示与计算）
  const groupAtSliderPrice = useMemo<OzonGroup>(() => {
    if (sliderPrice === null) return activeGroup;
    const g = groupFromPrice(sliderPrice);
    return g ?? activeGroup;
  }, [sliderPrice, activeGroup, weightG]);

  // 为图表锁定 carrier/tier/delivery 三元组（优先使用用户选择，否则回退到 best），避免滑动或点击点导致端点变化
  const chartTriple = useMemo(() => {
    const pickCarrier = carrier || best?.carrier || (rates[0]?.carrier ?? "");
    const sample = rates.find(r => r.carrier === pickCarrier) || rates[0] || null;
    const pickTier = tier || best?.tier || (sample?.tier ?? "");
    const pickDelivery = (delivery || best?.delivery || (sample?.delivery ?? "pickup")) as DeliveryMode;
    return { carrier: pickCarrier, tier: pickTier, delivery: pickDelivery };
  }, [carrier, tier, delivery, best?.carrier, best?.tier, best?.delivery, rates]);

  const activeRates = useMemo(() => {
    return rates
      .filter((r) => r.group === activeGroup)
      .filter((r) => !carrier || r.carrier === carrier)
      .filter((r) => !tier || r.tier === tier)
      .filter((r) => !delivery || r.delivery === delivery);
  }, [rates, activeGroup, carrier, tier, delivery]);

  const activeRate = useMemo(() => {
    if (best) {
      const m = activeRates.find((r) => r.carrier === best.carrier && r.tier === best.tier && r.delivery === best.delivery);
      if (m) return m;
    }
    return activeRates[0] || null;
  }, [activeRates, best]);

  // 方案B：针对当前滑块售价与组，动态选取“该组内利润率最高”的费率（三元组）
  const rateAtSliderPrice = useMemo(() => {
    if (sliderPrice === null) return null;
    const candidateRates = rates.filter(r => r.group === groupAtSliderPrice);
    if (candidateRates.length === 0) return null;
    const params: OzonPricingParams = {
      weight_g: weightG,
      dims_cm: dims,
      cost_cny: costCny,
      commission,
      acquiring,
      fx,
      last_mile: { rate: lastmileRate, min_rub: lastmileMin, max_rub: lastmileMax },
      rub_per_cny: rubPerCny,
      fx_include_intl: fxIncludeIntl,
    } as OzonPricingParams;
    let bestRate = candidateRates[0];
    let bestMargin = -Infinity;
    for (const r of candidateRates) {
      const b = computeProfitForPrice(sliderPrice, groupAtSliderPrice, r.pricing, params);
      if (b.margin > bestMargin) { bestMargin = b.margin; bestRate = r; }
    }
    return bestRate || null;
  }, [sliderPrice, rates, groupAtSliderPrice, weightG, dims.l, dims.w, dims.h, costCny, commission, acquiring, fx, lastmileRate, lastmileMin, lastmileMax, rubPerCny, fxIncludeIntl]);

  // 顶部显示条优先使用“动态最优费率”的三元组；若无则回退到稳定的 chartTriple
  const chartTripleForControls = useMemo(() => {
    if (rateAtSliderPrice) return { carrier: rateAtSliderPrice.carrier, tier: rateAtSliderPrice.tier, delivery: rateAtSliderPrice.delivery };
    return chartTriple;
  }, [rateAtSliderPrice?.carrier, rateAtSliderPrice?.tier, rateAtSliderPrice?.delivery, chartTriple.carrier, chartTriple.tier, chartTriple.delivery]);


  // 记录上一次的组与最低利润率，用于决定是否需要自动吸附到“10%端点”
  const snapRef = useRef<{ g: OzonGroup | null; mm: number | undefined }>({ g: null, mm: undefined });

  // 程序性更新标记：用于避免 setSliderPrice 导致的自动切组循环
  const progRef = useRef<boolean>(false);

  // 使用 Hook 计算拼接曲线与全局端点（强制包含端点，保证铺满宽度）
  const chartParams: OzonPricingParams = {
    weight_g: weightG,
    dims_cm: dims,
    cost_cny: costCny,
    commission,
    acquiring,
    fx,
    last_mile: { rate: lastmileRate, min_rub: lastmileMin, max_rub: lastmileMax },
    rub_per_cny: rubPerCny,
    fx_include_intl: fxIncludeIntl,
    min_margin: (typeof minMargin === 'number'? minMargin : undefined),
    max_margin: (typeof maxMargin === 'number' && maxMargin>0 ? maxMargin : undefined),
  } as OzonPricingParams;
  const chartSets = useOzonChart({
    feasibleGroups,
    rates,
    chartTriple,
    params: chartParams,
    minMargin,
    maxMargin,
    groupColors: GROUP_COLORS,
  });

  // 计算滑块可用价格区间：直接采用图表端点（全局并集的左右端），确保两者一致且与点击组无关
  useEffect(() => {
    if (!chartSets.sets.length) { setSliderRange(null); return; }
    const range = {
      min: Math.round(chartSets.globalMin * 100) / 100,
      max: Math.round(chartSets.globalMax * 100) / 100,
    };
    setSliderRange(range);
    const prev = snapRef.current;
    const changed = prev.mm !== minMargin;
    snapRef.current = { g: null, mm: minMargin };
    // 初次或阈值变化时吸附到区间内，且仅在数值改变时更新
    if (sliderPrice === null || changed) {
      if (sliderPrice !== range.min) { progRef.current = true; setSliderPrice(range.min); setTimeout(()=>{ progRef.current=false; }, 0); }
    } else {
      const next = Math.min(range.max, Math.max(range.min, Math.round(sliderPrice * 100) / 100));
      if (Math.abs(next - sliderPrice) > 1e-9) { progRef.current = true; setSliderPrice(next); setTimeout(()=>{ progRef.current=false; }, 0); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartSets.globalMin, chartSets.globalMax, minMargin]);

  // 监听 sliderPrice，按售价自动切组
  useEffect(() => {
    if (sliderPrice === null) return;
    if (groupMode !== 'auto') return;
    if (progRef.current) return; // 程序性更新不触发自动切组
    const g = groupFromPrice(sliderPrice);
    if (g && g !== activeGroup) setGroupMode(g);
  }, [sliderPrice, weightG, groupMode, activeGroup]);


  // 已移除 groupOrder：统一按全局区间绘制，不做图上边缘自动换段



  const sliderBreakdown = useMemo(() => {
    if (sliderPrice === null || !rateAtSliderPrice || !groupAtSliderPrice) return null;
    const params: OzonPricingParams = {
      weight_g: weightG,
      dims_cm: dims,
      cost_cny: costCny,
      commission,
      acquiring,
      fx,
      last_mile: { rate: lastmileRate, min_rub: lastmileMin, max_rub: lastmileMax },
      rub_per_cny: rubPerCny,
      fx_include_intl: fxIncludeIntl,
    } as OzonPricingParams;
    return computeProfitForPrice(sliderPrice, groupAtSliderPrice, rateAtSliderPrice.pricing, params);
  }, [sliderPrice, rateAtSliderPrice?.carrier, rateAtSliderPrice?.tier, rateAtSliderPrice?.delivery, groupAtSliderPrice, weightG, dims.l, dims.w, dims.h, costCny, commission, acquiring, fx, lastmileRate, lastmileMin, lastmileMax, rubPerCny, fxIncludeIntl]);

  const displayRows = useMemo(() => {
    const rows = [...top];
    rows.sort((a, b) => {
      let av = 0, bv = 0;
      if (sortKey === "margin") { av = a.breakdown.margin; bv = b.breakdown.margin; }
      else if (sortKey === "price") { av = a.price_rub; bv = b.price_rub; }
      else { av = a.breakdown.receipt_rub; bv = b.breakdown.receipt_rub; }
      const diff = av - bv;
      return sortOrder === "desc" ? -diff : diff;
    });
    return rows;
  }, [top, sortKey, sortOrder]);

  // 同价利润比较（对当前 sliderPrice），用于回答“同价谁利润更高”
  const samePriceCompare = useMemo(() => {
    if (sliderPrice === null || !activeRate) return [] as { group: OzonGroup; margin: number | null; allowed: boolean }[];
    const params: OzonPricingParams = {
      weight_g: weightG,
      dims_cm: dims,
      cost_cny: costCny,
      commission,
      acquiring,
      fx,
      last_mile: { rate: lastmileRate, min_rub: lastmileMin, max_rub: lastmileMax },
      rub_per_cny: rubPerCny,
      fx_include_intl: fxIncludeIntl,
    } as OzonPricingParams;
    const list: { group: OzonGroup; margin: number | null; allowed: boolean }[] = [];
    for (const g of feasibleGroups) {
      const rate = rates
        .filter((r) => r.group === g)
        .filter((r) => r.carrier === activeRate.carrier && r.tier === activeRate.tier && r.delivery === activeRate.delivery)[0];
      if (!rate) { list.push({ group: g, margin: null, allowed: false }); continue; }
      const rule = OZON_GROUP_RULES.find(r=> r.group === g)!;
      const allowed = sliderPrice >= rule.priceRub.min && sliderPrice <= rule.priceRub.max;
      const b = computeProfitForPrice(sliderPrice, g, rate.pricing, params);
      list.push({ group: g, margin: b.margin, allowed });
    }
    return list;
  }, [sliderPrice, activeRate?.carrier, activeRate?.tier, activeRate?.delivery, feasibleGroups.join(','), rates, weightG, dims.l, dims.w, dims.h, costCny, commission, acquiring, fx, lastmileRate, lastmileMin, lastmileMax, rubPerCny, fxIncludeIntl]);

  // 当前滑块对应的“即时详情”（不需要点击应用）
  const currentItem = useMemo(() => {
    if (sliderPrice === null || !rateAtSliderPrice || !groupAtSliderPrice) return null;
    const params: OzonPricingParams = {
      weight_g: weightG,
      dims_cm: dims,
      cost_cny: costCny,
      commission,
      acquiring,
      fx,
      last_mile: { rate: lastmileRate, min_rub: lastmileMin, max_rub: lastmileMax },
      rub_per_cny: rubPerCny,
      fx_include_intl: fxIncludeIntl,
    } as OzonPricingParams;
    const breakdown = computeProfitForPrice(sliderPrice, groupAtSliderPrice, rateAtSliderPrice.pricing, params);
    const item: ResultItem = {
      price_rub: sliderPrice,
      group: groupAtSliderPrice,
      carrier: rateAtSliderPrice.carrier,
      tier: rateAtSliderPrice.tier,
      delivery: rateAtSliderPrice.delivery,
      breakdown,
      safe_range: null,
      constraint_ok: true,
    };
    return item;
  }, [sliderPrice, rateAtSliderPrice?.carrier, rateAtSliderPrice?.tier, rateAtSliderPrice?.delivery, groupAtSliderPrice, weightG, dims.l, dims.w, dims.h, costCny, commission, acquiring, fx, lastmileRate, lastmileMin, lastmileMax, rubPerCny, fxIncludeIntl]);

  const viewRows = useMemo(()=>{
    const q = query.trim().toLowerCase();
    if (!q) return displayRows;
    return displayRows.filter(r =>
      [r.carrier, r.tier, r.delivery, r.group, String(r.price_rub)].join(" ").toLowerCase().includes(q)
    );
  }, [displayRows, query]);

  function toggleSort(key: "margin" | "price" | "receipt") {
    if (sortKey === key) setSortOrder((o) => (o === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortOrder("desc"); }
  }

  function isBestRow(r: ResultItem) {
    if (!best) return false;
    return r.carrier === best.carrier && r.tier === best.tier && r.delivery === best.delivery && r.price_rub === best.price_rub;
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <PackageSearch className="h-5 w-5 text-primary" />
          <span>Ozon 最优售价计算器</span>
        </div>
        <Button variant="outline" onClick={()=>setSettingsOpen(true)}>更多设置</Button>
      </div>
      <p className="text-sm text-muted-foreground">填写上方参数，自动计算推荐售价与候选方案。</p>

      {/* 顶部参数区域（等宽三卡）：商品参数(重量+尺寸) / 利润与成本 / 物流选择 */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3 items-stretch">
        <div className="col-span-1">
          <ProductParamsCard
            weightUnit={weightUnit}
            setWeightUnit={setWeightUnit}
            weightG={weightG}
            setWeightG={setWeightG}
            dims={dims}
            setDims={setDims}
            sliderRange={sliderRange}
            setSliderPrice={(p)=> setSliderPrice(p)}
          />
        </div>
        <div className="col-span-1">
          <ProfitCostCard
            minMargin={minMargin}
            setMinMargin={setMinMargin}
            maxMargin={maxMargin}
            setMaxMargin={setMaxMargin}
            costCny={costCny}
            setCostCny={setCostCny}
          />
        </div>
        <div className="col-span-1">
          <LogisticsFilterCard
            carriers={carriers}
            tiers={tiers}
            carrier={carrier}
            setCarrier={(v)=> { setCarrier(v); setTier(""); }}
            tier={tier}
            setTier={setTier}
            delivery={delivery}
            setDelivery={setDelivery}
            feasibleGroups={feasibleGroups}
          />
        </div>
      </section>

      {/* 第二行：搜索与过滤（全宽） */}
      <section className="grid grid-cols-1">
        <SearchBar query={query} setQuery={setQuery} />
      </section>

      {activeRate && sliderRange ? (
        <PriceChartCard
          chart={chartSets}
          sliderRange={sliderRange}
          sliderPrice={sliderPrice}
          onChangeSliderPrice={setSliderPrice}
          priceInput={priceInput}
          setPriceInput={setPriceInput}
          sliderBreakdown={sliderBreakdown}
          chartTriple={chartTripleForControls}
          rubPerCny={rubPerCny}
          activeGroup={groupAtSliderPrice}
          minMargin={minMargin}
          maxMargin={maxMargin}
          fxToolbar={{
            rubFxMode,
            setRubFxMode,
            rubPerCny,
            setRubPerCny,
            rubPerCnyInput,
            setRubPerCnyInput,
            loadingFx,
            refreshFx,
            fxSource,
            fxUpdatedAt,
          }}
        />
      ) : null}
      {/* 结果区：整屏宽度 */}
      <section className="space-y-4">
        <ResultSummary currentItem={currentItem} best={best} maxMargin={maxMargin} rubPerCny={rubPerCny} />

        <CandidatesCard
          rows={viewRows}
          totalCount={top.length}
          viewMode={viewMode}
          setViewMode={setViewMode}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onToggleSort={toggleSort}
          best={best}
          onOpenDetails={(t)=>{ setDetailsItem(t); setDetailsOpen(true); }}
        />
      </section>

      {/* 更多设置 Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        commission={commission}
        setCommission={setCommission}
        acquiring={acquiring}
        setAcquiring={setAcquiring}
        fx={fx}
        setFx={setFx}
        lastmileRate={lastmileRate}
        setLastmileRate={setLastmileRate}
        lastmileMin={lastmileMin}
        setLastmileMin={setLastmileMin}
        lastmileMax={lastmileMax}
        setLastmileMax={setLastmileMax}
        fxIncludeIntl={fxIncludeIntl}
        setFxIncludeIntl={setFxIncludeIntl}
        rubPerCny={rubPerCny}
        setRubPerCny={setRubPerCny}
        loadingFx={loadingFx}
        fxUpdatedAt={fxUpdatedAt}
        fxSource={fxSource}
        fxError={fxError}
        onRefreshFx={refreshFx}
      />

      {/* 详情 Dialog */}
      <DetailsDialog open={detailsOpen} onOpenChange={setDetailsOpen} item={detailsItem} />
    </div>
  );
}
