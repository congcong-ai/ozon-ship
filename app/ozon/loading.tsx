export default function Loading() {
  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="h-6 w-48 rounded bg-slate-200 animate-pulse" />
        <div className="h-6 w-24 rounded bg-slate-200 animate-pulse" />
      </div>
      <div className="text-sm text-muted-foreground space-y-2">
        <div className="h-4 w-64 rounded bg-slate-100 animate-pulse" />
        <div className="h-4 w-40 rounded bg-slate-100 animate-pulse" />
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="h-48 rounded-lg border bg-slate-50 animate-pulse" />
        <div className="h-48 rounded-lg border bg-slate-50 animate-pulse" />
        <div className="h-48 rounded-lg border bg-slate-50 animate-pulse" />
      </section>

      <div className="h-80 rounded-lg border bg-slate-50 animate-pulse" />

      <section className="space-y-3">
        <div className="h-7 w-56 rounded bg-slate-100 animate-pulse" />
        <div className="h-10 rounded border bg-slate-50 animate-pulse" />
        <div className="h-10 rounded border bg-slate-50 animate-pulse" />
        <div className="h-10 rounded border bg-slate-50 animate-pulse" />
      </section>
    </div>
  );
}
