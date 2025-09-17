import type { OzonGroupRule } from "@/types/ozon";

// Ozon 六组规则配置
export const OZON_GROUP_RULES: OzonGroupRule[] = [
  {
    group: "Extra Small",
    priceRub: { min: 1, max: 1500 },
    weightG: { min: 1, max: 500 },
    dimsLimit: { sum_cm_max: 90, longest_cm_max: 60, allow_oversize: false },
    billing: "physical",
  },
  {
    group: "Budget",
    priceRub: { min: 1, max: 1500 },
    weightG: { min: 501, max: 30000 },
    dimsLimit: { sum_cm_max: 150, longest_cm_max: 60, allow_oversize: false },
    billing: "physical",
  },
  {
    group: "Small",
    priceRub: { min: 1501, max: 7000 },
    weightG: { min: 1, max: 2000 },
    dimsLimit: { sum_cm_max: 150, longest_cm_max: 60, allow_oversize: false },
    billing: "physical",
  },
  {
    group: "Big",
    priceRub: { min: 1501, max: 7000 },
    weightG: { min: 2001, max: 30000 },
    dimsLimit: { sum_cm_max: 250, longest_cm_max: 150, allow_oversize: false, volumetric_divisor: 12000 },
    billing: "max_of_physical_and_dimensional",
  },
  {
    group: "Premium Small",
    priceRub: { min: 7001, max: 250000 },
    weightG: { min: 1, max: 5000 },
    dimsLimit: { sum_cm_max: 250, longest_cm_max: 150, allow_oversize: false },
    billing: "physical",
  },
  {
    group: "Premium Big",
    priceRub: { min: 7001, max: 250000 },
    weightG: { min: 5001, max: 30000 },
    dimsLimit: { sum_cm_max: 310, longest_cm_max: 150, allow_oversize: false, volumetric_divisor: 12000 },
    billing: "max_of_physical_and_dimensional",
  },
];
