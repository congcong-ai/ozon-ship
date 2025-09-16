export default function MePage() {
  return (
    <div className="py-8 space-y-10">
      {/* Hero */}
      <section className="mx-auto max-w-4xl text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Ozon Ship · 售价与运费计算助手</h1>
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
        <div className="text-xs text-muted-foreground">无需登录 · 移动/桌面适配 · 免费使用</div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white/70 p-4">
          <div className="text-sm font-medium">⚡ Ozon 最优售价</div>
          <p className="mt-1 text-sm text-muted-foreground">输入重量、尺寸、成本与费率，拖动售价滑块，自动给出利润区间与物流搭配建议。</p>
        </div>
        <div className="rounded-lg border bg-white/70 p-4">
          <div className="text-sm font-medium">📦 物流方案对比</div>
          <p className="mt-1 text-sm text-muted-foreground">展开“查看更多”后自动计算承运商列表；当价格滑杆/曲线变动时，已展开列表会自动收起，确保信息始终与售价一致。</p>
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
          <div className="text-sm font-medium">📱 自适应与简洁体验</div>
          <p className="mt-1 text-sm text-muted-foreground">桌面端顶部导航、移动端底部 Tab Bar，自适应布局，聚焦核心操作。</p>
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
      <section className="mx-auto max-w-4xl">
        <p className="text-xs text-muted-foreground">
          {/* 提示：本工具不收集你的输入与结果；如需部署私有实例或新增功能，请查看项目 README 或联系我们。 */}
        </p>
      </section>
    </div>
  );
}
