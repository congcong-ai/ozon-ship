export default function MePage() {
  return (
    <div className="py-8 space-y-10">
      {/* Hero */}
      <section className="mx-auto max-w-4xl text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Ozon运费计算器</h1>
        <h2 className="text-xl md:text-xl font-semibold tracking-tight"> 售价与运费计算助手</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          为跨境卖家与运营团队打造的轻量工具。用更少时间，做更准决策：快速得到更合理的 Ozon 售价与更合适的物流方案。
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <a href="/partner-logistics" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90">
            开始计算 Ozon 售价
          </a>
          <a href="/chinapost" className="inline-flex items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            计算中国邮政运费
          </a>
        </div>
        <div className="text-xs text-muted-foreground">无需登录 · 移动/桌面适配</div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white/70 p-4">
          <div className="text-sm font-medium">⚡ 最优售价与物流搭配</div>
          <p className="mt-1 text-sm text-muted-foreground">输入重量、尺寸、成本与费率，拖动售价滑块，实时看到利润拆解；并给出更合理的物流搭配建议（“查看更多”自动计算承运商列表）。</p>
        </div>
        <div className="rounded-lg border bg-white/70 p-4">
          <div className="text-sm font-medium">📈 销量模型与总利润曲线</div>
          <p className="mt-1 text-sm text-muted-foreground">可启用“销量模型（常数弹性）”，在图表叠加销量与总利润（归一化）两条曲线；勾选状态会持久化到浏览器。</p>
        </div>
        <div className="rounded-lg border bg-white/70 p-4">
          <div className="text-sm font-medium">💱 汇率管理（手动/自动）</div>
          <p className="mt-1 text-sm text-muted-foreground">支持手动输入并在刷新后记忆；手动模式不自动刷新，运算始终使用当前显示的汇率。</p>
        </div>
        <div className="rounded-lg border bg-white/70 p-4">
          <div className="text-sm font-medium">✉️ 中国邮政运费计算</div>
          <p className="mt-1 text-sm text-muted-foreground">按重量/体积重与渠道规则自动计算到俄罗斯多渠道价格，支持搜索与排序。</p>
        </div>
        <div className="rounded-lg border bg-white/70 p-4">
          <div className="text-sm font-medium">📏 尺寸限制预览与超限提示</div>
          <p className="mt-1 text-sm text-muted-foreground">输入尺寸时实时显示当前货件组的限制（三边和/最长边）与体积重预估；若超限会弹窗提示并提供“一键切换至中国邮政”继续计算。</p>
        </div>
        <div className="rounded-lg border bg-white/70 p-4">
          <div className="text-sm font-medium">ⓘ 数据来源透明</div>
          <p className="mt-1 text-sm text-muted-foreground">规则与数据与官方文档保持一致，来源与更新时间可在页面内查看。</p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl rounded-lg border bg-gradient-to-br from-slate-50 to-white p-6 text-center">
        <div className="text-lg font-medium">立即开始，用更少时间获得更可靠的定价与物流决策</div>
        <p className="mt-1 text-sm text-muted-foreground">减少反复试算与查表时间，降低错价与亏损风险。</p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <a href="/partner-logistics" className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90">
            打开 Ozon 售价计算器
          </a>
          <a href="/chinapost" className="inline-flex items-center justify-center rounded-md border bg-background px-5 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            打开中国邮政运费计算器
          </a>
        </div>
      </section>

      {/* Footnote */}
      {/* <section className="mx-auto max-w-4xl">
        <p className="text-xs text-muted-foreground">规则配置已抽离至 <code>config/ozon_groups.ts</code>，便于按需调整货件组的尺寸与计费规则。</p>
      </section> */}
    </div>
  );
}
