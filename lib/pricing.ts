import { Service, PricingInput, ServiceWithComputed } from "@/types/shipping";

export async function fetchServices(): Promise<Service[]> {
  // 静态模式：直接从打包进来的 JSON 读取（便于 Next export）
  if (process.env.NEXT_PUBLIC_USE_STATIC_DATA === "true") {
    const data = (await import("@/data/chinapost_russia.json")) as any;
    return (data.services || []) as Service[];
  }
  // 动态模式：从 API 读取（需要 Node 运行时）
  const res = await fetch("/api/services", { cache: "no-store" });
  if (!res.ok) throw new Error("failed to load services");
  const json = (await res.json()) as { services: Service[] };
  return json.services;
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
