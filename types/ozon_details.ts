export type CarrierDetail = {
  carrier: string;
  eta_to_moscow_days?: string; // 配送到莫斯科的时效（天）
  battery_allowed?: boolean;   // 电池运输是否允许
  notes?: string;
  last_updated?: string;       // YYYY-MM-DD
  source_images?: string[];    // 相对路径（可选）
  services?: Array<{
    tier?: string;             // Express/Standard/Economy
    group?: string;            // Extra Small/Small/Budget...
    eta_days?: string;
    battery_allowed?: boolean;
    delivery_notes?: { pickup?: string; door?: string };
    remarks?: string;
  }>;
};
