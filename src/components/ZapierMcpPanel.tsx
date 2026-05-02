import { useEffect, useRef, useState } from 'react';
import { ref, set, serverTimestamp } from 'firebase/database';
import { rtdb } from '../firebase';

/**
 * Zapier MCP integration panel.
 *
 * Renders the <zapier-mcp> custom element so the user can connect their
 * Zapier account, then captures the per-user MCP server URL via the
 * `mcp-server-url` event and persists it to RTDB at
 * `users/<uid>/zapierMcp/{serverUrl, toolsUpdatedAt}`.
 *
 * The embed-id is public (fine to ship). The Zapier MCP *secret* is NOT
 * loaded here — secret-bearing tool calls must be performed by a server
 * (e.g. Firebase Cloud Function) using the stored serverUrl + secret.
 */

// Custom-element JSX typing. React 19 / @types/react ^19 reads from
// React.JSX.IntrinsicElements — augment that path so <zapier-mcp> is valid TSX.
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'zapier-mcp': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'embed-id': string;
          width?: string;
          height?: string;
          'class-name'?: string;
          'sign-up-email'?: string;
          'sign-up-first-name'?: string;
          'sign-up-last-name'?: string;
        },
        HTMLElement
      >;
    }
  }
}
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'zapier-mcp': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'embed-id': string;
          width?: string;
          height?: string;
          'class-name'?: string;
          'sign-up-email'?: string;
          'sign-up-first-name'?: string;
          'sign-up-last-name'?: string;
        },
        HTMLElement
      >;
    }
  }
}

interface Props {
  uid: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  onClose?: () => void;
}

const EMBED_ID =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ZAPIER_MCP_EMBED_ID) || '';

export default function ZapierMcpPanel({ uid, email, firstName, lastName, onClose }: Props) {
  const elRef = useRef<HTMLElement | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [toolsUpdatedAt, setToolsUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const onServerUrl = async (ev: any) => {
      const url: string | undefined = ev?.detail?.serverUrl;
      if (!url) return;
      setServerUrl(url);
      try {
        await set(ref(rtdb, `users/${uid}/zapierMcp`), {
          serverUrl: url,
          embedId: EMBED_ID,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.error('Failed to persist Zapier MCP server URL:', e);
      }
    };
    const onToolsChanged = async () => {
      const ts = Date.now();
      setToolsUpdatedAt(ts);
      try {
        await set(ref(rtdb, `users/${uid}/zapierMcp/toolsUpdatedAt`), ts);
      } catch (e) {
        console.error('Failed to persist Zapier MCP toolsUpdatedAt:', e);
      }
    };
    const onCloseRequested = () => onClose?.();

    el.addEventListener('mcp-server-url', onServerUrl as any);
    el.addEventListener('tools-changed', onToolsChanged as any);
    el.addEventListener('close-requested', onCloseRequested as any);
    return () => {
      el.removeEventListener('mcp-server-url', onServerUrl as any);
      el.removeEventListener('tools-changed', onToolsChanged as any);
      el.removeEventListener('close-requested', onCloseRequested as any);
    };
  }, [uid, onClose]);

  if (!EMBED_ID) {
    return (
      <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 text-[12px]">
        Zapier MCP is not configured. Set <code>VITE_ZAPIER_MCP_EMBED_ID</code> in
        <code> .env.local</code>.
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-lime-300/25 bg-lime-300/[0.04] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-lime-300">
            Zapier MCP
          </p>
          <p className="text-[11px] text-zinc-400">
            Connect tools (Gmail, Notion, Slack, 7000+ apps). Beatrice can call them on your behalf.
          </p>
        </div>
        {serverUrl && (
          <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-lime-300">
            Connected
          </span>
        )}
      </div>

      <zapier-mcp
        ref={elRef as any}
        embed-id={EMBED_ID}
        width="100%"
        height="520px"
        sign-up-email={email}
        sign-up-first-name={firstName}
        sign-up-last-name={lastName}
      />

      {(serverUrl || toolsUpdatedAt) && (
        <div className="mt-2 grid gap-1 rounded-[12px] border border-white/10 bg-black/40 p-2 text-[10px] text-zinc-400">
          {serverUrl && (
            <p>
              <b className="text-lime-300">Server URL:</b>{' '}
              <span className="break-all">{serverUrl}</span>
            </p>
          )}
          {toolsUpdatedAt && (
            <p>
              <b className="text-lime-300">Tools updated:</b>{' '}
              {new Date(toolsUpdatedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
