import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2, ExternalLink, Copy, Check } from 'lucide-react';

/**
 * Live in-chat HTML preview ("server view").
 *
 * Renders any HTML payload inside a sandboxed iframe so generated documents,
 * widgets, slide decks, or pages appear visually next to the chat bubble.
 * Supports: full-page <!doctype html> blobs, fragment HTML, height presets,
 * fullscreen toggle, open-in-new-tab, copy-to-clipboard.
 *
 * The iframe is sandboxed with `allow-scripts allow-same-origin` so embedded
 * <script> tags inside the document run (needed for the contract template's
 * three.js bg + signature pad scripts) but the document cannot navigate the
 * parent window, post forms, or escape the chat.
 */

interface Props {
  html: string;
  title?: string;
  initialHeight?: number; // px
}

const looksLikeFullPage = (s: string) =>
  /<!doctype html|<html[\s>]/i.test(s) || /<head[\s>]/i.test(s);

const wrapFragment = (fragment: string, title = 'Live HTML'): string => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  html,body{margin:0;padding:18px;background:#fff;color:#111;font:14px/1.55 'Roboto',system-ui,sans-serif;}
  *{box-sizing:border-box}img,video,iframe,svg{max-width:100%}
  pre{white-space:pre-wrap;background:#f6f8fa;border-radius:6px;padding:10px;font-size:12px;overflow:auto}
  table{border-collapse:collapse;width:100%}
  th,td{padding:8px 10px;border:1px solid #d8e2e5}
  thead th{background:linear-gradient(135deg,#3d6264,#144e86);color:#fff}
</style></head><body>${fragment}</body></html>`;

export default function HtmlLiveView({ html, title = 'Live HTML preview', initialHeight = 360 }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const doc = useMemo(() => (looksLikeFullPage(html) ? html : wrapFragment(html, title)), [html, title]);

  // Use srcdoc so the iframe receives the full document (no network round-trip).
  // The browser autosizes — we read its scroll height and grow the iframe.
  const [autoHeight, setAutoHeight] = useState<number>(initialHeight);
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      try {
        const inner = iframe.contentDocument;
        if (!inner) return;
        const h = Math.min(
          inner.documentElement.scrollHeight + 6,
          fullscreen ? window.innerHeight - 80 : 720,
        );
        setAutoHeight(Math.max(initialHeight, h));
      } catch {
        // cross-origin: keep initial height
      }
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [doc, fullscreen, initialHeight]);

  const onOpenNewTab = () => {
    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(doc);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-[210] flex flex-col bg-[#020302]'
          : 'mt-2 flex flex-col overflow-hidden rounded-[14px] border border-lime-300/20 bg-[#0a0d0a]'
      }
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-black/70 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-lime-300 shadow-[0_0_8px_rgba(190,242,100,0.7)]" />
          <span className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-lime-300/85">
            Live HTML · {title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onCopy}
            title="Copy HTML"
            aria-label="Copy HTML"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-lime-300/25 bg-lime-300/[0.06] text-lime-300/85 transition-colors hover:border-lime-300/55 hover:text-lime-200"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onOpenNewTab}
            title="Open in new tab"
            aria-label="Open in new tab"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-lime-300/25 bg-lime-300/[0.06] text-lime-300/85 transition-colors hover:border-lime-300/55 hover:text-lime-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-lime-300/25 bg-lime-300/[0.06] text-lime-300/85 transition-colors hover:border-lime-300/55 hover:text-lime-200"
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Iframe (sandboxed) */}
      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={doc}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
        className="w-full bg-white"
        style={{ height: `${autoHeight}px`, border: 0 }}
      />
    </div>
  );
}

/**
 * Detect whether a chat message body contains an HTML document worth
 * rendering as a live preview. Recognizes:
 *  - ```html …``` fenced code blocks
 *  - <!doctype html>… or <html>… anywhere in the text
 *  - or a substantial HTML fragment (>= 4 tags) at the start of a line
 *
 * Returns the extracted HTML payload, or null if none.
 */
export function extractHtml(text: string): string | null {
  if (!text) return null;
  // ```html ... ``` fenced block (highest priority)
  const fence = text.match(/```html\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  // ``` ... ``` with HTML-looking content
  const generic = text.match(/```\s*([\s\S]*?)```/);
  if (generic && /<\/?[a-z][\s\S]*?>/i.test(generic[1]) && generic[1].match(/<\/?[a-z][^>]*>/g)!.length >= 3) {
    return generic[1].trim();
  }
  // Full-page document
  const doc = text.match(/<!doctype html[\s\S]*?<\/html>/i) || text.match(/<html[\s\S]*?<\/html>/i);
  if (doc) return doc[0];
  // Substantial fragment
  const tags = text.match(/<\/?[a-z][^>]*>/gi);
  if (tags && tags.length >= 4) {
    // Strip leading/trailing prose so the iframe just shows the markup.
    const first = text.search(/<\/?[a-z][^>]*>/i);
    return text.slice(first).trim();
  }
  return null;
}
