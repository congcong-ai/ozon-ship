import { Service, PricingInput, ServiceWithComputed } from "@/types/shipping";

export async function fetchServices(): Promise<Service[]> {
  // 静态模式：直接从打包进来的 JSON 读取（便于 Next export）
  if (process.env.NEXT_PUBLIC_USE_STATIC_DATA === "true") {
    const data = (await import("@/data/chinapost_russia.json")) as any;
    return (data.services || []) as Service[];
  }
  // 动态模式：从 API 读取（需要 Node 运行时）；失败时回退到静态数据
  try {
    const res = await fetch("/api/services", { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { services: Service[] };
      return json.services;
    } else {
      if (typeof window !== 'undefined') console.warn("/api/services 响应非 2xx，使用本地静态数据回退。status=", res.status);
    }
  } catch (err) {
    if (typeof window !== 'undefined') console.warn("/api/services 请求失败，使用本地静态数据回退。", err);
  }
  const data = (await import("@/data/chinapost_russia.json")) as any;
  return (data.services || []) as Service[];
}

function toGrams(input: { unit: "kg" | "g"; weight: number }) {
  return input.unit === "kg" ? Math.round(input.weight * 1000) : Math.round(input.weight);
}

function volumetricWeightGrams(dims: { l: number; w: number; h: number }) {
  // l*w*h / 6000 (cm) -> kg; convert to grams
  const kg = (dims.l * dims.w * dims.h) / 6000;
  return Math.ceil(kg * 1000);
}

function computeWeightForService(s: Service, input: PricingInput) {
  let w = toGrams({ unit: input.unit, weight: input.weight });

  // e特快：若任一边 >= 40cm，按体积重
  if (s.dimensional_weight_rule) {
    const anyGE40 = input.dims.l >= 40 || input.dims.w >= 40 || input.dims.h >= 40;
    if (anyGE40) {
      w = Math.max(w, volumetricWeightGrams(input.dims));
    }
  }
  return w;
}

function checkDimsForService(s: Service, input: PricingInput): string | null {
  const L = Math.max(0, input.dims.l || 0);
  const W = Math.max(0, input.dims.w || 0);
  const H = Math.max(0, input.dims.h || 0);
  const sum = L + W + H;
  const longest = Math.max(L, W, H);
  // 1) 简单“三边和 + 最长边”限制
  if (s.dims_limit) {
    const { sum_cm_max, longest_cm_max } = s.dims_limit;
    if ((typeof sum_cm_max === 'number' && sum > sum_cm_max) || (typeof longest_cm_max === 'number' && longest > longest_cm_max)) {
      const parts: string[] = [];
      if (typeof sum_cm_max === 'number' && sum > sum_cm_max) parts.push(`三边和 ${sum.toFixed(1)}cm > ${sum_cm_max}cm`);
      if (typeof longest_cm_max === 'number' && longest > longest_cm_max) parts.push(`最长边 ${longest.toFixed(1)}cm > ${longest_cm_max}cm`);
      return `尺寸超限（${parts.join("，")}）`;
    }
  }
  // 2) 多套尺寸标准（任一满足则合规）
  if (s.dims_options && Array.isArray(s.dims_options) && s.dims_options.length) {
    const sorted = [L, W, H].sort((a, b) => b - a);
    const sumTwo = sorted[0] + sorted[1];
    let ok = false;
    for (const opt of s.dims_options) {
      const sideOk = typeof opt.any_side_max_cm === 'number' ? (L <= opt.any_side_max_cm && W <= opt.any_side_max_cm && H <= opt.any_side_max_cm) : true;
      const sum2Ok = typeof opt.two_largest_sum_max_cm === 'number' ? (sumTwo <= opt.two_largest_sum_max_cm) : true;
      if (sideOk && sum2Ok) { ok = true; break; }
    }
    if (!ok) {
      return `尺寸不满足任一标准（两边之和=${sumTwo.toFixed(1)}cm）`;
    }
  }
  return null;
}

function isProhibited(s: Service, input: PricingInput): string | null {
  if (input.battery && (s.prohibited || []).some((p) => p.includes("电池"))) {
    return "该渠道禁止寄送含电池商品";
  }
  // 简化：液体/气体限制仅在渠道描述出现时拦截
  if (input.productState !== "solid") {
    const key = input.productState === "liquid" ? "液体" : "气体";
    if ((s.prohibited || []).some((p) => p.includes(key))) {
      return `该渠道禁止寄送${key}`;
    }
  }
  return null;
}

export function computeForAll(services: Service[], input: PricingInput): ServiceWithComputed[] {
  return services.map((s) => {
    const grams = computeWeightForService(s, input);

    // 重量边界
    if (grams < s.weight.min_g || grams > s.weight.max_g) {
      return { ...s, totalPriceCNY: null, available: false, reason: `重量需在 ${s.weight.min_g}-${s.weight.max_g} 克之间` };
    }

    // 尺寸限制校验
    const dimsViolation = checkDimsForService(s, input);
    if (dimsViolation) {
      return { ...s, totalPriceCNY: null, available: false, reason: dimsViolation };
    }

    const prohibit = isProhibited(s, input);
    if (prohibit) return { ...s, totalPriceCNY: null, available: false, reason: prohibit };

    // 计费
    let price = 0;
    if (s.pricing.type === "base_plus_per_gram") {
      price = s.pricing.base_cny + s.pricing.per_gram_cny * grams;
    } else if (s.pricing.type === "registration_plus_per_gram") {
      price = s.pricing.registration_fee_cny + s.pricing.per_gram_cny * grams;
    } else if (s.pricing.type === "first_weight_plus_additional") {
      const { first_weight_g, first_weight_fee_cny, additional_step_g, additional_step_fee_cny } = s.pricing;
      if (grams <= first_weight_g) price = first_weight_fee_cny;
      else {
        const extra = grams - first_weight_g;
        const steps = Math.ceil(extra / additional_step_g);
        price = first_weight_fee_cny + steps * additional_step_fee_cny;
      }
    }

    return { ...s, totalPriceCNY: Math.round(price * 100) / 100, available: true };
  });
}
