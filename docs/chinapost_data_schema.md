# chinapost_russia.json 字段说明与修改指南

文件路径：`data/chinapost_russia.json`

该文件定义了“从中国到俄罗斯”的各个中国邮政渠道、限制条件与计费规则。应用的 API `app/api/services/route.ts` 会直接读取此文件作为数据源。

## 文件结构
```json
{
  "origin": "China",
  "destination": "Russia",
  "default_currency": "CNY",
  "services": [ { /* Service 对象 */ } ]
}
```

## Service 对象字段
```ts
interface Service {
  id: string;                  // 唯一 ID（建议小写+下划线/短横）
  group: string;               // 渠道分组（如 China Post to PUDO / China Post e邮宝 / e特快 / SRM）
  name: string;                // 展示名称
  mode?: string;               // 运输方式（air/land），可选
  weight: {
    min_g: number;            // 允许最小重量（克）
    max_g: number;            // 允许最大重量（克）
    increment_g: number;      // 计量/进位颗粒度（克），用于前端提示
  };
  dimensions_max?: string;     // 最大尺寸文字描述（如“三边之和≤90cm，最长边≤60cm”）
  dimensions_min?: string;     // 最小尺寸文字描述（如“长度≥14cm、宽度≥11cm”）
  dimensions_rules?: string[]; // 复杂尺寸规则列表（e特快多套标准）
  value_limit?: { currency: string; amount: number }; // 货值上限（如 SRM ≤10 USD）
  prohibited?: string[];       // 禁寄项（如“含电池”“液体/易燃物”）
  compensation?: string;       // 赔付/丢损说明
  pricing:
    | { type: "base_plus_per_gram"; base_cny: number; per_gram_cny: number }
    | { type: "registration_plus_per_gram"; registration_fee_cny: number; per_gram_cny: number; effective_from?: string }
    | { type: "first_weight_plus_additional"; first_weight_g: number; first_weight_fee_cny: number; additional_step_g: number; additional_step_fee_cny: number; effective_from?: string };
  dimensional_weight_rule?: { applies_when: string; formula: string; unit: string }; // 体积重规则（e特快）
  physical_weight_rule?: { applies_when: string; measure: string };                     // 实重规则（e特快）
  example?: string;             // 示例
}
```

## 常见计费模型示例
- base_plus_per_gram（基础费 + 克费）
  ```json
  {
    "pricing": { "type": "base_plus_per_gram", "base_cny": 1.9, "per_gram_cny": 0.065 }
  }
  ```
- registration_plus_per_gram（挂号费 + 克费）
  ```json
  {
    "pricing": { "type": "registration_plus_per_gram", "registration_fee_cny": 12, "per_gram_cny": 0.060 }
  }
  ```
- first_weight_plus_additional（首重 + 续重阶梯）
  ```json
  {
    "pricing": { "type": "first_weight_plus_additional", "first_weight_g": 500, "first_weight_fee_cny": 52.5, "additional_step_g": 500, "additional_step_fee_cny": 15 }
  }
  ```

## 修改与新增步骤
1. 打开 `data/chinapost_russia.json`，在 `services` 数组中新增/修改一个对象。
2. 确保 `id` 全局唯一，`weight.min_g/max_g` 与 `pricing` 模型匹配。
3. 若渠道存在“禁寄含电池/液体/易燃品”等，请在 `prohibited` 中明确写入关键字（前端据此拦截）。
4. 对于存在体积重规则的渠道（如 e特快），请补充 `dimensional_weight_rule` 与 `physical_weight_rule`。
5. 保存后，前端无需重启即可在下次请求时读取最新数据（开发模式下 `cache: 'no-store'`）。

## 校验与排错
- 价格异常为 `—` 且“不可寄”：意味着重量不在 `min_g..max_g` 范围或触发禁寄规则。
- 首/续重模型：若重量超过首重，则续重步数采用“向上取整”。
- 体积重：当任一边≥40cm 时启用体积重，取体积重与实重较大者计费。

## 示例：新增一个“PUDO 经济（空运）”
```jsonc
{
  "id": "chinapost_pudo_economy_air",
  "group": "China Post to PUDO",
  "name": "China Post to PUDO Economy (Air)",
  "mode": "air",
  "weight": { "min_g": 1, "max_g": 500, "increment_g": 1 },
  "dimensions_max": "三边之和≤90cm，最长边≤60cm",
  "prohibited": ["含电池产品", "液体及易燃物"],
  "pricing": { "type": "base_plus_per_gram", "base_cny": 1.9, "per_gram_cny": 0.030 }
}
```

> 修改完成后刷新页面即可看到新渠道；若看不到，请检查 JSON 是否有效（可在线 JSON 校验）。

## 版本控制建议
- 修改数据文件时，建议同时在提交信息中写明“生效日期/来源截图/变更项”。
- 若存在大幅调价，建议保留旧项并在 `name` 或 `pricing.effective_from` 中注明生效日期，便于回溯。
