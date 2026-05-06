/**
 * ContactHostModal — shows host contact info for a sublet listing.
 *
 * Branches on `sublet.contact.primary`:
 *   wechat          → large monospace WeChat ID + Copy button
 *   email           → mailto link + Copy email button
 *   xhs             → prominent username + search/DM instructions
 *   craigslist_link → button to open original post in new tab
 *   reddit_link     → button to open original post in new tab
 *
 * Always shows a compact red demo-data banner at the top and a host-type
 * footer at the bottom.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { type MockSublet } from "@/lib/subletMockData";
import { Copy, ExternalLink, GraduationCap, Home, Phone } from "lucide-react";
import { toast } from "sonner";

type Props = {
  sublet: MockSublet;
  open: boolean;
  onClose: () => void;
};

export function ContactHostModal({ sublet, open, onClose }: Props) {
  const { language } = useLanguage();
  const { contact } = sublet;

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(language === "cn" ? `已复制 ${label}` : `${label} copied`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-neutral-500" />
            {language === "cn" ? "联系房东" : "Contact host"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {language === "cn"
              ? "以下是房东的联系方式"
              : "Contact information for this listing's host"}
          </DialogDescription>
        </DialogHeader>

        {/* Demo data warning banner */}
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 leading-snug">
          <span className="font-semibold">
            {language === "cn" ? "演示数据" : "Demo data"}
          </span>{" "}
          {language === "cn"
            ? "— 联系方式不是真的。正式上线后会有验证过的房东联系方式。"
            : "— contact info is not real. Real listings will have verified host contacts."}
        </div>

        {/* Listing title for context */}
        <p className="text-sm font-medium text-neutral-800 line-clamp-2">
          {language === "cn" && sublet.titleZh ? sublet.titleZh : sublet.title}
        </p>

        {/* Contact body — branched on primary type */}
        <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4 space-y-3">
          {contact.primary === "wechat" && contact.wechatId && (
            <WechatContact
              wechatId={contact.wechatId}
              language={language}
              onCopy={() => copyToClipboard(contact.wechatId!, "WeChat ID")}
            />
          )}

          {contact.primary === "email" && contact.email && (
            <EmailContact
              email={contact.email}
              title={sublet.title}
              language={language}
              onCopy={() => copyToClipboard(contact.email!, language === "cn" ? "邮箱" : "Email")}
            />
          )}

          {contact.primary === "xhs" && contact.xhsUsername && (
            <XhsContact
              xhsUsername={contact.xhsUsername}
              language={language}
              onCopy={() => copyToClipboard(contact.xhsUsername!, language === "cn" ? "用户名" : "Username")}
            />
          )}

          {(contact.primary === "craigslist_link" || contact.primary === "reddit_link") &&
            contact.originalUrl && (
              <ExternalLinkContact
                url={contact.originalUrl}
                platform={contact.primary === "craigslist_link" ? "Craigslist" : "Reddit"}
                language={language}
              />
            )}
        </div>

        {/* Footer: host type */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 pt-1 border-t border-neutral-100">
          {sublet.hostIsStudent ? (
            <>
              <GraduationCap className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              {language === "cn" ? "在校学生发布" : "Posted by a current student"}
            </>
          ) : (
            <>
              <Home className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              {language === "cn" ? "房东直接发布" : "Posted by the host"}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components for each contact type                                  */
/* ------------------------------------------------------------------ */

function WechatContact({
  wechatId,
  language,
  onCopy,
}: {
  wechatId: string;
  language: "en" | "cn";
  onCopy: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {language === "cn" ? "微信号 / WeChat ID" : "WeChat ID"}
        </p>
        <p className="font-mono text-xl font-bold text-neutral-900 tracking-wider break-all">
          {wechatId}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onCopy} className="w-full">
        <Copy className="w-3.5 h-3.5 mr-1.5" />
        {language === "cn" ? "复制微信号" : "Copy WeChat ID"}
      </Button>
      <p className="text-xs text-neutral-500 leading-relaxed">
        {language === "cn"
          ? "添加微信好友后说明你看到了 BridgeStay"
          : "Mention BridgeStay when you add the host on WeChat"}
      </p>
    </div>
  );
}

function EmailContact({
  email,
  title,
  language,
  onCopy,
}: {
  email: string;
  title: string;
  language: "en" | "cn";
  onCopy: () => void;
}) {
  const subject = encodeURIComponent(`BridgeStay sublet inquiry: ${title}`);
  const mailto = `mailto:${email}?subject=${subject}`;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {language === "cn" ? "邮箱 / Email" : "Email"}
        </p>
        <p className="font-mono text-base font-semibold text-neutral-900 break-all">
          {email}
        </p>
        <p className="text-xs text-neutral-400">
          {language === "cn" ? "邮件主题将自动填入：" : "Subject will be pre-filled:"}
          <span className="italic text-neutral-500">
            {" BridgeStay sublet inquiry: "}{title}
          </span>
        </p>
      </div>
      <div className="flex gap-2">
        <a
          href={mailto}
          className="flex-1"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="sm" variant="default" className="w-full">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            {language === "cn" ? "发送邮件" : "Send email"}
          </Button>
        </a>
        <Button size="sm" variant="outline" onClick={onCopy}>
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          {language === "cn" ? "复制邮箱" : "Copy email"}
        </Button>
      </div>
    </div>
  );
}

function XhsContact({
  xhsUsername,
  language,
  onCopy,
}: {
  xhsUsername: string;
  language: "en" | "cn";
  onCopy: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {language === "cn" ? "小红书 / Xiaohongshu" : "Xiaohongshu (XHS)"}
        </p>
        <p className="font-mono text-xl font-bold text-rose-600 tracking-wider break-all">
          @{xhsUsername}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onCopy} className="w-full">
        <Copy className="w-3.5 h-3.5 mr-1.5" />
        {language === "cn" ? "复制用户名" : "Copy username"}
      </Button>
      <p className="text-xs text-neutral-500 leading-relaxed">
        {language === "cn"
          ? "在小红书 App 搜索此用户名后私信"
          : "Search this username in Xiaohongshu app, then DM"}
      </p>
    </div>
  );
}

function ExternalLinkContact({
  url,
  platform,
  language,
}: {
  url: string;
  platform: "Craigslist" | "Reddit";
  language: "en" | "cn";
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {language === "cn" ? `原帖 / Original post (${platform})` : `Original post on ${platform}`}
        </p>
        <p className="text-xs text-neutral-500 font-mono break-all">{url}</p>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full">
        <Button size="sm" variant="default" className="w-full">
          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
          {language === "cn" ? "在原帖回复" : "Reply on original post"}
        </Button>
      </a>
    </div>
  );
}
