"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare } from "lucide-react";

export default function FeedbackFab() {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+6rem)] sm:bottom-8 z-50">
        <DialogTrigger asChild>
          <Button
            className="rounded-full shadow-lg h-11 px-4 gap-2"
            aria-label="反馈"
          >
            <MessageSquare className="h-4 w-4" />
            反馈
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>欢迎反馈，一起把工具做得更好</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            产品当前处于公开体验阶段，功能与价格估算还在持续优化。你的建议将直接影响改进优先级，非常感谢！
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>推荐使用在线表单，耗时约 1 分钟；</li>
            <li>也可直接给我们发邮件，我们会尽快回复。</li>
          </ul>
        </div>
        <DialogFooter className="sm:justify-between">
          <a
            href="https://xixisys-group.mikecrm.com/YqMhORX"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="w-full sm:w-auto">在线表单反馈</Button>
          </a>
          <a href="mailto:peter@xixisys.com">
            <Button variant="secondary" className="w-full sm:w-auto">邮件反馈</Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
