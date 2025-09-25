export const metadata = {
  title: "在线表单反馈",
  description: "通过在线表单提交问题与建议",
};

export default function FeedbackPage() {
  const formUrl = "https://xixisys-group.mikecrm.com/YqMhORX";
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">在线表单反馈</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          表单将以内嵌方式展示。如果加载受限（例如被浏览器或站点禁止嵌入），你也可以
          <a href={formUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 ml-1">在新窗口打开</a>。
        </p>
      </div>

      <div className="rounded-lg border bg-background overflow-hidden">
        <iframe
          src={formUrl}
          title="在线表单反馈"
          className="w-full h-[70vh] sm:h-[75vh] lg:h-[78vh]"
          loading="lazy"
        />
      </div>
    </div>
  );
}
