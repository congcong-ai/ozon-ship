import { Button } from "@/components/ui/button";
import { ServiceWithComputed } from "@/types/shipping";

export default function ServiceCard({ service, selected, onToggle }: { service: ServiceWithComputed; selected: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium leading-tight">{service.name}</h3>
          <p className="text-xs text-muted-foreground">{service.group}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selected} onChange={onToggle} />
          比较
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-muted-foreground">价格(CNY)</div>
          <div className="text-lg font-semibold">{service.totalPriceCNY !== null && service.totalPriceCNY !== undefined ? service.totalPriceCNY.toFixed(2) : "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">是否可寄</div>
          <div className={"font-semibold " + (service.available ? "text-green-600" : "text-red-600")}>{service.available ? "可寄" : "不可寄"}</div>
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground min-h-[2rem]">
        {service.reason || ""}
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => alert(JSON.stringify(service, null, 2))}>详情</Button>
      </div>
    </div>
  );
}
