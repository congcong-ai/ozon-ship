export type Service = {
  id: string;
  group: string; // e.g., China Post to PUDO / e邮宝 / e特快 / SRM
  name: string;
  mode?: string; // air/land
  weight: { min_g: number; max_g: number; increment_g: number };
  dimensions_max?: string;
  dimensions_min?: string;
  dimensions_rules?: string[];
  // 结构化尺寸限制：多数渠道为“三边和 + 最长边”规则
  dims_limit?: { sum_cm_max: number; longest_cm_max: number };
  // e特快等渠道：存在多套可选标准（任一边限制 + 两个最大边之和限制），满足任意一项即视为合规
  dims_options?: Array<{ any_side_max_cm: number; two_largest_sum_max_cm: number }>;
  value_limit?: { currency: string; amount: number };
  prohibited?: string[];
  compensation?: string;
  pricing:
    | { type: "base_plus_per_gram"; base_cny: number; per_gram_cny: number }
    | { type: "registration_plus_per_gram"; registration_fee_cny: number; per_gram_cny: number; effective_from?: string }
    | { type: "first_weight_plus_additional"; first_weight_g: number; first_weight_fee_cny: number; additional_step_g: number; additional_step_fee_cny: number; effective_from?: string };
  dimensional_weight_rule?: { applies_when: string; formula: string; unit: string };
  physical_weight_rule?: { applies_when: string; measure: string };
  example?: string;
};

export type PricingInput = {
  unit: "kg" | "g";
  weight: number; // weight in unit
  dims: { l: number; w: number; h: number }; // cm
  productState: "solid" | "liquid" | "gas";
  battery: boolean;
};

export type ServiceWithComputed = Service & {
  totalPriceCNY: number | null;
  available: boolean;
  reason?: string;
};
