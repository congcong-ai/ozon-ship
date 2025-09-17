"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// Dialog 已拆分至独立组件
import { PackageSearch, Info } from "lucide-react";
import { bestPricing, OZON_GROUP_RULES, computeProfitForPrice, ALL_CARRIERS } from "@/lib/ozon_pricing";
import type { DeliveryMode, OzonPricingParams, ResultItem, OzonGroup, OzonRateTable } from "@/types/ozon";
import { loadAllCarrierRatesCached, loadCarrierRatesCachedStrict } from "@/lib/rates_cache";
import { computeListViaWorker } from "@/lib/worker_client";
import { useOzonChart } from "@/hooks/useOzonChart";
import type { ExtraLine } from "@/components/ozon/price-chart";
import dynamic from "next/dynamic";
import DimsLimitDialog from "@/components/ozon/DimsLimitDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { carrierName } from "@/lib/carrier_names";

// 组别颜色映射（保持跨渲染稳定）
const GROUP_COLORS: Record<OzonGroup, string> = {
  "Extra Small": "#0ea5e9",   // sky-500
  Budget: "#06b6d4",          // cyan-500
  Small: "#22c55e",           // green-500
  Big: "#eab308",             // amber-500
  "Premium Small": "#6366f1", // indigo-500（避免与“总利润”红线冲突）
  "Premium Big": "#a855f7",   // purple-500
};

// 动态导入重型组件，降低首屏 bundle 体积
const ProductParamsCard = dynamic(() => import("@/components/ozon/ProductParamsCard"), {
  loading: () => <div className="h-48 rounded-lg border bg-slate-50 animate-pulse" />,
});
const ProfitCostCard = dynamic(() => import("@/components/ozon/ProfitCostCard"), {
  loading: () => <div className="h-48 rounded-lg border bg-slate-50 animate-pulse" />,
});
const LogisticsFilterCard = dynamic(() => import("@/components/ozon/LogisticsFilterCard"), {
  loading: () => <div className="h-48 rounded-lg border bg-slate-50 animate-pulse" />,
});
const PriceChartCard = dynamic(() => import("@/components/ozon/PriceChartCard"), {
  loading: () => <div className="h-80 rounded-lg border bg-slate-50 animate-pulse" />,
});
const ResultSummary = dynamic(() => import("@/components/ozon/ResultSummary"), {
  loading: () => <div className="h-10 rounded bg-slate-50 animate-pulse" />,
});
const CarrierList = dynamic(() => import("@/components/ozon/CarrierList"), {
  loading: () => <div className="h-64 rounded border bg-slate-50 animate-pulse" />,
});
const ListFilterBar = dynamic(() => import("@/components/ozon/ListFilterBar"), {
  loading: () => <div className="h-10 rounded border bg-slate-50 animate-pulse" />,
});
const SettingsDialog = dynamic(() => import("@/components/ozon/SettingsDialog"), { ssr: false });
const DetailsDialog = dynamic(() => import("@/components/ozon/DetailsDialog"), { ssr: false });

// 数据来源链接常量（避免为了一个常量而引入整包 meta JSON）
const DATA_SOURCE_URL = "https://docs.ozon.ru/global/zh-hans/fulfillment/rfbs/logistic-settings/partner-delivery-ozon/?country=CN";

export default function OzonPage() {
  const LS_KEY = "ozon_page_state_v1";
  const [rates, setRates] = useState<OzonRateTable[]>([]);
  const carriers = useMemo(() => ALL_CARRIERS as unknown as string[], []);
  // 顶部“物流选择（可选）”——用于利润率曲线，仅限制图表
  const [chartCarrier, setChartCarrier] = useState<string>("");
  const chartTiers = useMemo(() => {
    const list = rates.filter((r) => !chartCarrier || r.carrier === chartCarrier).map((r) => r.tier);
    return Array.from(new Set(list));
  }, [rates, chartCarrier]);
  const [chartTier, setChartTier] = useState<string>("");
  const [chartDelivery, setChartDelivery] = useState<DeliveryMode | "">("");
  // 底部“列表筛选条”——用于承运商清单，独立于上方图表选择
  const [listCarrier, setListCarrier] = useState<string>("");
  const listTiers = useMemo(() => {
    const list = rates.filter((r) => !listCarrier || r.carrier === listCarrier).map((r) => r.tier);
    return Array.from(new Set(list));
  }, [rates, listCarrier]);
  const [listTier, setListTier] = useState<string>("");
  const [listDelivery, setListDelivery] = useState<DeliveryMode | "">("");

  // 商品参数
  const [weightG, setWeightG] = useState<number>(66);
  const [dims, setDims] = useState<{ l: number; w: number; h: number }>({ l: 20, w: 10, h: 5 });
  const [costCny, setCostCny] = useState<number>(66);

  // 费率参数
  const [commission, setCommission] = useState(0.12);
  const [acquiring, setAcquiring] = useState(0.019);
  const [fx, setFx] = useState(0.012);
  const [fxIncludeIntl, setFxIncludeIntl] = useState(true); // 默认包含国际物流费
  const [lastmileRate, setLastmileRate] = useState(0.02);
  const [lastmileMin, setLastmileMin] = useState(15);
  const [lastmileMax, setLastmileMax] = useState(200);
  const [maxMargin, setMaxMargin] = useState<number>(1.5); // 150%
  const [minMargin, setMinMargin] = useState<number>(0.1); // 10%
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [metaOpen, setMetaOpen] = useState<boolean>(false);
  // 销量模型：互斥（none/常数弹性/逻辑斯蒂）
  const [demandModel, setDemandModel] = useState<'none' | 'ce' | 'logistic'>("none");
  // 常数弹性参数
  const [ceEpsilon, setCeEpsilon] = useState<number>(1.8);
  const [cePrefP0, setCePrefP0] = useState<number | null>(null);
  // Logistic 可选参数：P10/P90（留空则用全局默认）
  const [logisticP10, setLogisticP10] = useState<number | null>(null);
  const [logisticP90, setLogisticP90] = useState<number | null>(null);
  // 方案详情弹框
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [detailsItem, setDetailsItem] = useState<ResultItem | null>(null);
  // 尺寸限制提示弹窗
  const [dimsOpen, setDimsOpen] = useState<boolean>(false);
  const [dimsInfo, setDimsInfo] = useState<{
    group: OzonGroup;
    rule: (typeof OZON_GROUP_RULES)[number];
    dims: { l: number; w: number; h: number };
    sum: number;
    longest: number;
    price: number;
    weightG: number;
  } | null>(null);
  const lastDimsKeyRef = useRef<string | null>(null);
  const dimsOverTimerRef = useRef<number | null>(null);

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
  const [top, setTop] = useState<ResultItem[]>([]); // 仅用于 best 回退，不再展示 Top 列表
  const ALL = "__ALL__";
  const [query, setQuery] = useState("");
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
  // 列表筛选用的分组过滤（空 = 使用当前售价推断的组）
  const [listGroupFilter, setListGroupFilter] = useState<OzonGroup | "">("");
  const [dataDates, setDataDates] = useState<{ carrier: string; date: string }[]>([]);
  // “查看更多”展开与手动计算状态
  const [listExpanded, setListExpanded] = useState<boolean>(false);
  const [computedList, setComputedList] = useState<ResultItem[]>([]);
  const [computingList, setComputingList] = useState<boolean>(false);
  const [allRatesReady, setAllRatesReady] = useState<boolean>(false);

  // 懒加载 Rate 数据（分阶段）：
  // 1) 先加载当前选择的承运商（若为空，则选第一个）以支持图表；
  // 2) 页面空闲时再加载全部（从缓存命中则几乎无开销）。
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const first = (chartCarrier && chartCarrier.length ? chartCarrier : (ALL_CARRIERS[0] as string));
        const one = await loadCarrierRatesCachedStrict(first);
        if (!cancelled) setRates(one);
      } catch {}
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 不做“全量预取”，仅在需要时按需加载（进一步分片）

  // 空闲预热：为提升“推荐结果”的全面性，在首屏稳定后后台预取全量承运商（命中缓存时几乎无网络/CPU开销）
  useEffect(() => {
    let cancelled = false;
    let fired = false;
    const preheat = async () => {
      if (fired) return; fired = true;
      try {
        const all = await loadAllCarrierRatesCached();
        if (cancelled) return;
        setRates(prev => (all.length > prev.length ? all : prev));
        setAllRatesReady(true);
      } catch {}
    };
    if (typeof (window as any).requestIdleCallback === 'function') {
      (window as any).requestIdleCallback(() => preheat());
    }
    // 无论如何在 ~1s 后确保触发一次
    const t = setTimeout(() => preheat(), 1000);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  // 当用户选择了新的承运商且当前 rates 尚未包含其数据时，按需加载并合并
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = chartCarrier;
      if (!id) return; // 空表示全部/未选
      const exists = rates.some(r => r.carrier === id);
      if (exists) return;
      try {
        const part = await loadCarrierRatesCachedStrict(id);
        if (!cancelled && part && part.length) {
          setRates(prev => [...prev, ...part]);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [chartCarrier, rates]);

  // 当底部列表筛选选择了某承运商时，按需加载其费率
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = listCarrier;
      if (!id) return;
      const exists = rates.some(r => r.carrier === id);
      if (exists) return;
      try {
        const part = await loadCarrierRatesCachedStrict(id);
        if (!cancelled && part && part.length) setRates(prev => [...prev, ...part]);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [listCarrier, rates]);

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
      if (typeof s.chartCarrier === 'string') setChartCarrier(s.chartCarrier);
      if (typeof s.chartTier === 'string') setChartTier(s.chartTier);
      if (typeof s.chartDelivery === 'string') setChartDelivery(s.chartDelivery);
      if (typeof s.listCarrier === 'string') setListCarrier(s.listCarrier);
      if (typeof s.listTier === 'string') setListTier(s.listTier);
      if (typeof s.listDelivery === 'string') setListDelivery(s.listDelivery);
      if (typeof s.weightUnit === 'string' && (s.weightUnit === 'g' || s.weightUnit === 'kg')) setWeightUnit(s.weightUnit);
      if (typeof s.sliderPrice === 'number') setSliderPrice(s.sliderPrice);
      // 移除排序/视图模式的恢复（不再使用候选方案列表）
      if (typeof s.query === 'string') setQuery(s.query);
      if (typeof s.groupMode === 'string') {
        const allowed: OzonGroup[] = [
          "Extra Small","Budget","Small","Big","Premium Small","Premium Big"
        ];
        if (s.groupMode === 'auto') setGroupMode('auto');
        else if (allowed.includes(s.groupMode as OzonGroup)) setGroupMode(s.groupMode as OzonGroup);
      }
      if (s.demandModel === 'none' || s.demandModel === 'ce' || s.demandModel === 'logistic') setDemandModel(s.demandModel);
      if (typeof s.ceEpsilon === 'number' && isFinite(s.ceEpsilon)) setCeEpsilon(s.ceEpsilon);
      if (typeof s.cePrefP0 === 'number' && isFinite(s.cePrefP0)) setCePrefP0(s.cePrefP0);
      if (typeof s.logisticP10 === 'number' && isFinite(s.logisticP10)) setLogisticP10(s.logisticP10);
      if (typeof s.logisticP90 === 'number' && isFinite(s.logisticP90)) setLogisticP90(s.logisticP90);
    } catch {}
  }, []);

  // 懒加载数据来源元信息（避免在首屏打包所有 meta JSON）
  useEffect(() => {
    if (!metaOpen) return;
    if (dataDates.length > 0) return;
    import("@/lib/ozon_data_meta").then((m) => {
      try { setDataDates(m.getAllDataDates()); } catch {}
    }).catch(() => {});
  }, [metaOpen, dataDates.length]);

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
        chartCarrier,
        chartTier,
        chartDelivery,
        listCarrier,
        listTier,
        listDelivery,
        weightUnit,
        sliderPrice,
        // 已移除排序/视图模式
        query,
        groupMode,
        demandModel,
        ceEpsilon,
        cePrefP0,
        logisticP10,
        logisticP90,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(s));
    } catch {}
  }, [weightG, dims.l, dims.w, dims.h, costCny, commission, acquiring, fx, fxIncludeIntl, lastmileRate, lastmileMin, lastmileMax, minMargin, maxMargin, rubPerCny, rubFxMode, chartCarrier, chartTier, chartDelivery, listCarrier, listTier, listDelivery, weightUnit, sliderPrice, query, groupMode, demandModel, ceEpsilon, cePrefP0, logisticP10, logisticP90]);

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

  // 自动计算：当任一参数变化且“全量承运商”已就绪时刷新；仅在结果变化时更新状态
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
      carrier: chartCarrier || undefined,
      tier: chartTier || undefined,
      delivery: (chartDelivery || undefined) as any,
    };
    if (!allRatesReady) return;
    const out = bestPricing(params, { candidates: rates }, 1);
    setBest((prev)=>{
      const changed = !prev || !out.best || prev.price_rub !== out.best.price_rub || prev.carrier!==out.best.carrier || prev.tier!==out.best.tier || prev.delivery!==out.best.delivery;
      return changed ? out.best : prev;
    });
    setTop((prev)=>{
      const sameLen = prev.length === out.top.length;
      const sameAll = sameLen && prev.every((v,i)=> v.price_rub===out.top[i].price_rub && v.carrier===out.top[i].carrier && v.tier===out.top[i].tier && v.delivery===out.top[i].delivery);
      return sameAll ? prev : out.top;
    });
  }, [allRatesReady, rates, weightG, dims.l, dims.w, dims.h, costCny, commission, acquiring, fx, lastmileRate, lastmileMin, lastmileMax, rubPerCny, fxIncludeIntl, minMargin, maxMargin, chartCarrier, chartTier, chartDelivery]);

  // 选取用于曲线与滑块的“激活费率 + 组”
  // 仅按重量可行的组
  const feasibleGroups = useMemo<OzonGroup[]>(() => {
    return OZON_GROUP_RULES
      .filter((r) => weightG >= r.weightG.min && weightG <= r.weightG.max)
      .map((r) => r.group as OzonGroup);
  }, [weightG]);

  // 按“重量 + 当前售价（若有）”可行的组（用于文案展示）
  const feasibleGroupsByWeightPrice = useMemo<OzonGroup[]>(() => {
    const byWeight = OZON_GROUP_RULES.filter(r => weightG >= r.weightG.min && weightG <= r.weightG.max);
    if (sliderPrice == null) return byWeight.map(r => r.group as OzonGroup);
    return byWeight.filter(r => sliderPrice >= r.priceRub.min && sliderPrice <= r.priceRub.max).map(r => r.group as OzonGroup);
  }, [weightG, sliderPrice]);

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
    const pickCarrier = chartCarrier || best?.carrier || (rates[0]?.carrier ?? "");
    const sample = rates.find(r => r.carrier === pickCarrier) || rates[0] || null;
    const pickTier = chartTier || best?.tier || (sample?.tier ?? "");
    const pickDelivery = (chartDelivery || best?.delivery || (sample?.delivery ?? "pickup")) as DeliveryMode;
    return { carrier: pickCarrier, tier: pickTier, delivery: pickDelivery };
  }, [chartCarrier, chartTier, chartDelivery, best?.carrier, best?.tier, best?.delivery, rates]);

  const activeRates = useMemo(() => {
    return rates
      .filter((r) => r.group === activeGroup)
      .filter((r) => !chartCarrier || r.carrier === chartCarrier)
      .filter((r) => !chartTier || r.tier === chartTier)
      .filter((r) => !chartDelivery || r.delivery === chartDelivery);
  }, [rates, activeGroup, chartCarrier, chartTier, chartDelivery]);

  const activeRate = useMemo(() => {
    if (best) {
      const m = activeRates.find((r) => r.carrier === best.carrier && r.tier === best.tier && r.delivery === best.delivery);
      if (m) return m;
    }
    return activeRates[0] || null;
  }, [activeRates, best]);

  // 用于“商品参数卡片”的实时限制提示：采用当前滑块推断的组
  const activeRuleAtSlider = useMemo(() => {
    return OZON_GROUP_RULES.find(r => r.group === groupAtSliderPrice) || null;
  }, [groupAtSliderPrice]);

  // 方案B：针对当前滑块售价与组，动态选取“该组内利润率最高”的费率（三元组）
  const rateAtSliderPrice = useMemo(() => {
    if (sliderPrice === null) return null;
    // 使用与图表一致的三元组，确保曲线与“当前售价详情”的渠道一致
    const chosen = rates.find(r => r.group === groupAtSliderPrice && r.carrier === chartTriple.carrier && r.tier === chartTriple.tier && r.delivery === chartTriple.delivery);
    if (!chosen) return null;
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
    // 仅返回所选三元组（不跨其他承运商）
    return chosen;
  }, [sliderPrice, rates, groupAtSliderPrice, chartTriple.carrier, chartTriple.tier, chartTriple.delivery]);

  // 顶部显示条优先使用“动态最优费率”的三元组；若无则回退到稳定的 chartTriple
  const chartTripleForControls = useMemo(() => {
    if (rateAtSliderPrice) return { carrier: rateAtSliderPrice.carrier, tier: rateAtSliderPrice.tier, delivery: rateAtSliderPrice.delivery };
    return chartTriple;
  }, [rateAtSliderPrice?.carrier, rateAtSliderPrice?.tier, rateAtSliderPrice?.delivery, chartTriple.carrier, chartTriple.tier, chartTriple.delivery]);


  // 记录上一次的组与最低利润率，用于决定是否需要自动吸附到“10%端点”
  const snapRef = useRef<{ g: OzonGroup | null; mm: number | undefined }>({ g: null, mm: undefined });

  // 程序性更新标记：用于避免 setSliderPrice 导致的自动切组循环
  const progRef = useRef<boolean>(false);

  // 最近一次 sliderPrice，用于判断“用户移动后自动收起列表”
  const lastSliderRef = useRef<number | null>(null);

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

  // 叠加曲线（销量/总利润）：仅在启用销量模型时计算
  const extraLines = useMemo<ExtraLine[] | undefined>(() => {
    if (demandModel === 'none') return undefined;
    if (!chartSets.sets.length) return undefined;
    const segments = (chartSets.xSegments && chartSets.xSegments.length)
      ? chartSets.xSegments
      : [{ priceMin: chartSets.globalMin, priceMax: chartSets.globalMax, xMin: 0, xMax: 600, group: activeGroup }];
    const vbH = 180; // 与 price-chart 保持一致
    const ε = ceEpsilon; // 可调弹性
    const P0 = (typeof cePrefP0 === 'number' && isFinite(cePrefP0) && cePrefP0 > 0)
      ? cePrefP0
      : Math.max(1, (chartSets.globalMin + chartSets.globalMax) / 2); // CE 模型参考价
    const LOG_K = Math.log(9); // 2*ln9 用于 logistic 斜率
    // 逻辑斯蒂：优先使用用户设置的 P10/P90，否则用全局 10%-90%
    const p10d = chartSets.globalMin + 0.1 * Math.max(0, chartSets.globalMax - chartSets.globalMin);
    const p90d = chartSets.globalMin + 0.9 * Math.max(0, chartSets.globalMax - chartSets.globalMin);
    const p10 = (typeof logisticP10 === 'number' && isFinite(logisticP10)) ? logisticP10 : p10d;
    const p90 = (typeof logisticP90 === 'number' && isFinite(logisticP90)) ? logisticP90 : p90d;
    const kG = (2*LOG_K) / Math.max(1e-6, p90 - p10);
    const pmidG = (p10 + p90) / 2;

    // 统一的参数构造
    const baseParams: OzonPricingParams = {
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

    type Sample = { x: number; price: number; q: number; u: number; pi: number };
    const samples: Sample[] = [];
    for (const seg of segments) {
      const N = 60;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const P = seg.priceMin + t * Math.max(0, seg.priceMax - seg.priceMin);
        if (!isFinite(P) || P <= 0) continue;
        const x = seg.xMin + t * Math.max(0, seg.xMax - seg.xMin);
        const g = seg.group || groupFromPrice(P) || activeGroup;
        // 三元组固定为 chartTriple
        const r = rates.find(r => r.group === g && r.carrier === chartTriple.carrier && r.tier === chartTriple.tier && r.delivery === chartTriple.delivery);
        const br = r ? computeProfitForPrice(Math.round(P * 100) / 100, g, r.pricing, baseParams) : null;
        const U = br ? br.profit_cny : 0;
        const qRaw = (demandModel === 'ce')
          ? Math.pow(P / P0, -ε)
          : (1 / (1 + Math.exp(kG * (P - pmidG))));
        const pi = Math.max(0, U * qRaw);
        samples.push({ x, price: P, q: qRaw, u: U, pi });
      }
    }
    if (!samples.length) return undefined;
    const qMax = Math.max(...samples.map(s => s.q));
    const piMax = Math.max(...samples.map(s => s.pi));
    const qPts = qMax > 0 ? samples.map(s => ({ x: s.x, y: vbH - (s.q / qMax) * (vbH - 20), price: s.price })) : [];
    const piPts = piMax > 0 ? samples.map(s => ({ x: s.x, y: vbH - (s.pi / piMax) * (vbH - 20), price: s.price })) : [];
    const out: ExtraLine[] = [];
    if (qPts.length >= 2) out.push({ points: qPts, color: "#111827", dash: "4 2", label: "销量(相对)", interactive: true });
    if (piPts.length >= 2) out.push({ points: piPts, color: "#ef4444", dash: "6 3", label: "总利润(相对)", interactive: true });
    return out.length ? out : undefined;
  }, [demandModel, chartSets.sets, chartSets.xSegments, chartSets.globalMin, chartSets.globalMax, sliderPrice, rates, chartTriple.carrier, chartTriple.tier, chartTriple.delivery, weightG, dims.l, dims.w, dims.h, costCny, commission, acquiring, fx, lastmileRate, lastmileMin, lastmileMax, rubPerCny, fxIncludeIntl, activeGroup, ceEpsilon, cePrefP0, logisticP10, logisticP90]);

  // 当前滑块位置的销量与总利润（归一化）数值
  const demandStats = useMemo<{ q_norm: number; pi_norm_cny: number } | null>(() => {
    if (demandModel === 'none') return null;
    if (sliderPrice == null || !isFinite(sliderPrice)) return null;
    const ε = ceEpsilon;
    const P0 = (typeof cePrefP0 === 'number' && isFinite(cePrefP0) && cePrefP0 > 0)
      ? cePrefP0
      : Math.max(1, (chartSets.globalMin + chartSets.globalMax) / 2);
    const g = groupAtSliderPrice;
    const r = rates.find(r => r.group === g && r.carrier === chartTriple.carrier && r.tier === chartTriple.tier && r.delivery === chartTriple.delivery);
    if (!r) return null;
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
    const br = computeProfitForPrice(sliderPrice, g, r.pricing, params);
    const LOG_K = Math.log(9);
    const q = (demandModel === 'ce')
      ? Math.pow(sliderPrice / P0, -ε)
      : (()=>{
          const p10d = chartSets.globalMin + 0.1 * Math.max(0, chartSets.globalMax - chartSets.globalMin);
          const p90d = chartSets.globalMin + 0.9 * Math.max(0, chartSets.globalMax - chartSets.globalMin);
          const p10 = (typeof logisticP10 === 'number' && isFinite(logisticP10)) ? logisticP10 : p10d;
          const p90 = (typeof logisticP90 === 'number' && isFinite(logisticP90)) ? logisticP90 : p90d;
          const k = (2*LOG_K) / Math.max(1e-6, p90 - p10);
          const pmid = (p10 + p90) / 2;
          return 1 / (1 + Math.exp(k * (sliderPrice - pmid)));
        })();
    const pi = Math.max(0, br.profit_cny * q);
    return { q_norm: q, pi_norm_cny: pi };
  }, [demandModel, sliderPrice, chartSets.globalMin, chartSets.globalMax, groupAtSliderPrice, rates, chartTriple.carrier, chartTriple.tier, chartTriple.delivery, weightG, dims.l, dims.w, dims.h, costCny, commission, acquiring, fx, lastmileRate, lastmileMin, lastmileMax, rubPerCny, fxIncludeIntl, ceEpsilon, cePrefP0, logisticP10, logisticP90]);

  // 总利润推荐价（π 最大）：基于当前承运商三元组，在全局区间按段采样求最大值
  const recommendPriceCE = useMemo<number | null>(() => {
    if (!chartSets.sets.length) return null;
    const segments = (chartSets.xSegments && chartSets.xSegments.length)
      ? chartSets.xSegments
      : [{ priceMin: chartSets.globalMin, priceMax: chartSets.globalMax, xMin: 0, xMax: 600, group: activeGroup }];
    const ε = ceEpsilon; const P0 = (typeof cePrefP0 === 'number' && isFinite(cePrefP0) && cePrefP0 > 0)? cePrefP0 : Math.max(1, (chartSets.globalMin + chartSets.globalMax) / 2);
    let bestP: number | null = null; let bestPi = -Infinity;
    for (const seg of segments) {
      const N = 120;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const P = seg.priceMin + t * Math.max(0, seg.priceMax - seg.priceMin);
        if (!isFinite(P) || P <= 0) continue;
        const g = seg.group || groupFromPrice(P) || activeGroup;
        const r = rates.find(r => r.group === g && r.carrier === chartTriple.carrier && r.tier === chartTriple.tier && r.delivery === chartTriple.delivery);
        if (!r) continue;
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
        const br = computeProfitForPrice(Math.round(P*100)/100, g, r.pricing, params);
        const q = Math.pow(P / P0, -ε);
        const pi = Math.max(0, br.profit_cny * q);
        if (pi > bestPi) { bestPi = pi; bestP = Math.round(P*100)/100; }
      }
    }
    return bestP;
  }, [chartSets.sets, chartSets.xSegments, chartSets.globalMin, chartSets.globalMax, rates, chartTriple.carrier, chartTriple.tier, chartTriple.delivery, weightG, dims.l, dims.w, dims.h, costCny, commission, acquiring, fx, lastmileRate, lastmileMin, lastmileMax, rubPerCny, fxIncludeIntl, activeGroup, ceEpsilon, cePrefP0]);

  const recommendPriceLOG = useMemo<number | null>(() => {
    if (!chartSets.sets.length) return null;
    const segments = (chartSets.xSegments && chartSets.xSegments.length)
      ? chartSets.xSegments
      : [{ priceMin: chartSets.globalMin, priceMax: chartSets.globalMax, xMin: 0, xMax: 600, group: activeGroup }];
    const LOG_K_BASE = Math.log(9);
    // P10/P90：优先用用户设置的值
    const p10d = chartSets.globalMin + 0.1 * Math.max(0, chartSets.globalMax - chartSets.globalMin);
    const p90d = chartSets.globalMin + 0.9 * Math.max(0, chartSets.globalMax - chartSets.globalMin);
    const p10 = (typeof logisticP10 === 'number' && isFinite(logisticP10)) ? logisticP10 : p10d;
    const p90 = (typeof logisticP90 === 'number' && isFinite(logisticP90)) ? logisticP90 : p90d;
    const kG = (2*LOG_K_BASE) / Math.max(1e-6, p90 - p10);
    const pmidG = (p10 + p90) / 2;
    let bestP: number | null = null; let bestPi = -Infinity;
    for (const seg of segments) {
      const N = 120;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const P = seg.priceMin + t * Math.max(0, seg.priceMax - seg.priceMin);
        if (!isFinite(P) || P <= 0) continue;
        const g = seg.group || groupFromPrice(P) || activeGroup;
        const r = rates.find(r => r.group === g && r.carrier === chartTriple.carrier && r.tier === chartTriple.tier && r.delivery === chartTriple.delivery);
        if (!r) continue;
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
        const br = computeProfitForPrice(Math.round(P*100)/100, g, r.pricing, params);
        const q = 1 / (1 + Math.exp(kG * (P - pmidG)));
        const pi = Math.max(0, br.profit_cny * q);
        if (pi > bestPi) { bestPi = pi; bestP = Math.round(P*100)/100; }
      }
    }
    return bestP;
  }, [chartSets.sets, chartSets.xSegments, chartSets.globalMin, chartSets.globalMax, rates, chartTriple.carrier, chartTriple.tier, chartTriple.delivery, weightG, dims.l, dims.w, dims.h, costCny, commission, acquiring, fx, lastmileRate, lastmileMin, lastmileMax, rubPerCny, fxIncludeIntl, activeGroup, logisticP10, logisticP90]);

  const recommendPrice = useMemo<number | null>(() => {
    if (demandModel === 'ce') return recommendPriceCE;
    if (demandModel === 'logistic') return recommendPriceLOG;
    return null;
  }, [demandModel, recommendPriceCE, recommendPriceLOG]);

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

  // 当“价格滑动杆/曲线”导致售价变化时，若列表已展开，则自动收起为“查看更多”
  useEffect(() => {
    if (!listExpanded) { lastSliderRef.current = sliderPrice; return; }
    // 忽略程序性更新（例如区间吸附、阈值变化引发的设置）
    if (progRef.current) { lastSliderRef.current = sliderPrice; return; }
    if (sliderPrice !== lastSliderRef.current) {
      setListExpanded(false);
    }
    lastSliderRef.current = sliderPrice;
  }, [sliderPrice, listExpanded]);


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

  // 尺寸超限检测：当“售价+重量”确定组后，若当前尺寸超过该组限制，则弹窗提示
  useEffect(() => {
    if (!activeRuleAtSlider?.dimsLimit) return;
    const { sum_cm_max, longest_cm_max } = activeRuleAtSlider.dimsLimit;
    const l = dims.l, w = dims.w, h = dims.h;
    const sum = (isFinite(l)?l:0) + (isFinite(w)?w:0) + (isFinite(h)?h:0);
    const longest = Math.max(isFinite(l)?l:0, isFinite(w)?w:0, isFinite(h)?h:0);
    const over = sum > sum_cm_max + 1e-9 || longest > longest_cm_max + 1e-9;
    const key = `${groupAtSliderPrice}|${sum_cm_max}|${longest_cm_max}|${l}|${w}|${h}`;
    // 清除上一个定时器
    if (dimsOverTimerRef.current) { clearTimeout(dimsOverTimerRef.current); dimsOverTimerRef.current = null; }
    if (over && lastDimsKeyRef.current !== key) {
      setDimsInfo({ group: groupAtSliderPrice, rule: activeRuleAtSlider, dims: { l, w, h }, sum: Math.round(sum*100)/100, longest: Math.round(longest*100)/100, price: sliderPrice ?? 0, weightG });
      // 延迟3秒再弹框，避免用户输入过程频繁打断
      dimsOverTimerRef.current = window.setTimeout(() => {
        setDimsOpen(true);
        lastDimsKeyRef.current = key;
      }, 3000);
    }
  }, [sliderPrice, groupAtSliderPrice, dims.l, dims.w, dims.h, weightG, activeRuleAtSlider?.dimsLimit?.sum_cm_max, activeRuleAtSlider?.dimsLimit?.longest_cm_max]);

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
      eta_days: rateAtSliderPrice.eta_days,
      battery_allowed: rateAtSliderPrice.battery_allowed,
    };
    return item;
  }, [sliderPrice, rateAtSliderPrice?.carrier, rateAtSliderPrice?.tier, rateAtSliderPrice?.delivery, groupAtSliderPrice, weightG, dims.l, dims.w, dims.h, costCny, commission, acquiring, fx, lastmileRate, lastmileMin, lastmileMax, rubPerCny, fxIncludeIntl]);

  // 手动触发计算：仅在点击“更新列表/计算”时计算当前售价下的列表
  const handleRecomputeList = async () => {
    if (sliderPrice === null) { setComputedList([]); return; }
    setComputingList(true);
    const gPick = listGroupFilter || groupAtSliderPrice;
    const rule = OZON_GROUP_RULES.find(r => r.group === gPick);
    const inGroupRange = !rule || (sliderPrice >= rule.priceRub.min && sliderPrice <= rule.priceRub.max && weightG >= rule.weightG.min && weightG <= rule.weightG.max);
    // 确保已加载所需承运商数据
    let baseRates: OzonRateTable[] = [];
    if (listCarrier) {
      baseRates = await loadCarrierRatesCachedStrict(listCarrier);
    } else {
      baseRates = await loadAllCarrierRatesCached();
    }
    // 不再按“档位/配送”预过滤，统一计算出全量，后续仅在前端做过滤
    const allRates = baseRates;
    const list = await computeListViaWorker({
      sliderPrice,
      group: gPick,
      rates: allRates,
      params: {
        weight_g: weightG,
        dims_cm: dims,
        cost_cny: costCny,
        commission,
        acquiring,
        fx,
        last_mile: { rate: lastmileRate, min_rub: lastmileMin, max_rub: lastmileMax },
        rub_per_cny: rubPerCny,
        fx_include_intl: fxIncludeIntl,
      } as OzonPricingParams,
    });
    const rs = list.slice().sort((a,b)=> b.breakdown.margin - a.breakdown.margin || a.price_rub - b.price_rub);
    setComputedList(inGroupRange ? rs : []);
    setComputingList(false);
  };

  // 展开瞬间自动计算；后续筛选变更仅在前端过滤已计算结果，不触发重算
  useEffect(() => {
    if (!listExpanded) return;
    handleRecomputeList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listExpanded]);

  // 基于搜索关键字对“已计算结果”做前端筛选（轻量操作，无需重算）
  const filteredComputedList = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = computedList
      .filter(r => !listCarrier || r.carrier === listCarrier)
      .filter(r => !listTier || r.tier === listTier)
      .filter(r => !listDelivery || r.delivery === listDelivery)
      .filter(r => !listGroupFilter || r.group === listGroupFilter);
    return q ? base.filter(r => [r.carrier, r.tier, r.delivery, r.group].join(" ").toLowerCase().includes(q)) : base;
  }, [computedList, query, listCarrier, listTier, listDelivery, listGroupFilter]);

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <PackageSearch className="h-5 w-5 text-primary" />
          <span>Ozon运费计算器 - 合作物流</span>
        </div>
      </div>
      <div className="text-sm text-muted-foreground flex flex-col gap-1">
        {/* <p>填写下方参数，滑动价格，自动推荐物流商，并计算利润情况。</p> */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); setMetaOpen(true); }}
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
            aria-label="查看数据来源与更新时间"
            title="查看数据来源与更新时间"
          >
            <Info className="h-4 w-4" />
            <span>数据来源与更新时间</span>
          </a>
          <span className="ml-auto text-xs text-slate-500 italic">提示：我们尽力提供准确、实用的估算，但结果仅供参考，不构成任何承诺或建议；据此做出的决策及后果由您自行承担。继续使用即表示您已阅读并同意本提示。</span>
        </div>
      </div>

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
            activeGroup={groupAtSliderPrice}
            activeRule={activeRuleAtSlider}
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
            sliderRange={sliderRange}
            setSliderPrice={(p)=> setSliderPrice(p)}
          />
        </div>
        <div className="col-span-1">
          <LogisticsFilterCard
            carriers={carriers}
            tiers={chartTiers}
            carrier={chartCarrier}
            setCarrier={(v)=> { setChartCarrier(v); setChartTier(""); }}
            tier={chartTier}
            setTier={setChartTier}
            delivery={chartDelivery}
            setDelivery={setChartDelivery}
            feasibleGroups={feasibleGroupsByWeightPrice}
          />
        </div>
      </section>

      {/* 移除顶部的搜索框 */}

      {activeRate && sliderRange ? (
        <PriceChartCard
          chart={chartSets}
          sliderRange={sliderRange!}
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
          demandModel={demandModel}
          setDemandModel={setDemandModel}
          extraLines={extraLines}
          legendExtras={[
            { label: "单件利润率（各组）", color: "#334155" },
            ...(extraLines ? [
              { label: "销量（相对）", color: "#111827", dash: "4 2" },
              { label: "总利润（相对）", color: "#ef4444", dash: "6 3" },
            ] : [])
          ]}
          demandStats={demandStats}
          recommendPrice={demandModel ? recommendPrice : null}
          ceEpsilon={ceEpsilon}
          setCeEpsilon={setCeEpsilon}
          cePrefP0={cePrefP0}
          setCePrefP0={setCePrefP0}
          recommendPriceCE={recommendPriceCE}
          recommendPriceLOG={recommendPriceLOG}
          logisticP10={logisticP10}
          setLogisticP10={setLogisticP10}
          logisticP90={logisticP90}
          setLogisticP90={setLogisticP90}
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
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : null}
      {/* 结果区：整屏宽度 */}
      <section className="space-y-4">
        <ResultSummary currentItem={currentItem} best={best} maxMargin={maxMargin} rubPerCny={rubPerCny} loadingBest={!allRatesReady} />

        {!listExpanded ? (
          <div className="flex justify-center">
            <Button onClick={() => setListExpanded(true)}>查看更多</Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">
                售价 {sliderPrice !== null ? `₽ ${sliderPrice.toFixed(2)}` : "-"} 时所有物流商运费及对应利润情况
              </h2>
              {/* 移除“更新列表/计算”按钮，改为自动计算 */}
            </div>
            {/* 列表筛选条：搜索 + 承运商/档位/配送/分组（仅前端过滤，不触发重算） */}
            <ListFilterBar
              query={query}
              setQuery={setQuery}
              carriers={carriers}
              tiers={listTiers}
              feasibleGroups={feasibleGroups}
              carrier={listCarrier}
              setCarrier={(v)=> { setListCarrier(v); setListTier(""); }}
              tier={listTier}
              setTier={setListTier}
              delivery={listDelivery}
              setDelivery={setListDelivery}
              group={listGroupFilter || ""}
              setGroup={setListGroupFilter}
            />
            {computingList ? (
              <div className="text-sm text-muted-foreground">计算中...</div>
            ) : null}
            {computedList.length === 0 && !computingList ? (
              <div className="text-sm text-muted-foreground">当前售价下无可显示的承运商</div>
            ) : null}
            <CarrierList
              items={filteredComputedList}
              rubPerCny={rubPerCny}
              onOpenDetails={(it: ResultItem) => { setDetailsItem(it); setDetailsOpen(true); }}
            />
          </>
        )}
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
      />

      {/* 数据来源与更新时间 */}
      <Dialog open={metaOpen} onOpenChange={setMetaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>数据来源与更新时间</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">数据来源：</span>
              <a href={DATA_SOURCE_URL} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline ml-1">
                {DATA_SOURCE_URL}
              </a>
            </div>
            <div className="max-h-[60vh] overflow-auto">
              <div className="font-medium mb-1">各承运商数据时间</div>
              <ul className="space-y-1">
                {dataDates.map(({ carrier, date }) => (
                  <li key={carrier} className="flex items-center justify-between">
                    <span>{carrierName(carrier)}</span>
                    <span className="text-muted-foreground">{date}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 方案详情弹框 */}
      <DetailsDialog open={detailsOpen} onOpenChange={(v)=>{ setDetailsOpen(v); if(!v) setDetailsItem(null); }} item={detailsItem} />
      {/* 尺寸限制提示弹窗 */}
      <DimsLimitDialog open={dimsOpen} onOpenChange={setDimsOpen} info={dimsInfo} />
    </div>
  );
}
