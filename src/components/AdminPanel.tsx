import { useEffect, useRef, useState } from 'react';
import { ref, set, get, serverTimestamp } from 'firebase/database';
import { rtdb } from '../firebase';
import { X, Save, Check, ExternalLink } from 'lucide-react';

/**
 * Platform Admin Panel — Configure Zapier MCP and other platform-wide settings.
 *
 * This is for Eburon AI staff only (eburon.ai email domain).
 * Stores Zapier MCP server URL globally so ALL users can access connected tools
 * through the AI agent, without each user needing to configure it.
 */

// Custom-element JSX typing for zapier-mcp
declare module 'react' {
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
  onClose: () => void;
}

const EMBED_ID =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ZAPIER_MCP_EMBED_ID) || '';

// RTDB path for global platform config
const PLATFORM_ZAPIER_PATH = 'platform/config/zapierMcp';

export default function AdminPanel({ onClose }: Props) {
  const elRef = useRef<HTMLElement | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [toolsUpdatedAt, setToolsUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // Load existing global config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const snap = await get(ref(rtdb, PLATFORM_ZAPIER_PATH));
        if (snap.exists()) {
          const data = snap.val();
          setServerUrl(data.serverUrl || null);
          setToolsUpdatedAt(data.toolsUpdatedAt || null);
        }
      } catch (e) {
        console.error('Failed to load Zapier MCP config:', e);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  // Listen for Zapier MCP events
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const onServerUrl = async (ev: any) => {
      const url: string | undefined = ev?.detail?.serverUrl;
      if (!url) return;
      setServerUrl(url);
      try {
        await set(ref(rtdb, PLATFORM_ZAPIER_PATH), {
          serverUrl: url,
          embedId: EMBED_ID,
          updatedAt: serverTimestamp(),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (e) {
        console.error('Failed to save Zapier MCP config:', e);
      }
    };

    const onToolsChanged = async () => {
      const ts = Date.now();
      setToolsUpdatedAt(ts);
      try {
        await set(ref(rtdb, `${PLATFORM_ZAPIER_PATH}/toolsUpdatedAt`), ts);
      } catch (e) {
        console.error('Failed to update tools timestamp:', e);
      }
    };

    el.addEventListener('mcp-server-url', onServerUrl as any);
    el.addEventListener('tools-changed', onToolsChanged as any);
    return () => {
      el.removeEventListener('mcp-server-url', onServerUrl as any);
      el.removeEventListener('tools-changed', onToolsChanged as any);
    };
  }, []);

  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const ALLOWED = ['localhost', 'vep.eburon.ai', 'eburon.ai', 'voip.eburon.ai', 'connect.eburon.ai', 'zapier.com'];
  const isAllowed = ALLOWED.some((h) => host === h || host.endsWith('.' + h));

  return (
    <div className="fixed inset-0 z-[300] flex flex-col overflow-y-auto bg-[#020302]">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.10] bg-[#020302] px-6 pb-8 pt-16">
        <div>
          <h2 className="text-[15px] font-black uppercase tracking-[0.18em] text-white">
            Platform Admin
          </h2>
          <p className="mt-1 text-[11px] text-zinc-500">
            Configure platform-wide integrations for all users
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-lime-300/25 bg-lime-300/[0.05] text-lime-300/85 transition-colors hover:border-lime-300/50 hover:text-lime-200"
          aria-label="Close admin panel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 px-6 pb-32 pt-8">
        {/* Zapier MCP Configuration */}
        <div className="rounded-[20px] border border-lime-300/20 bg-lime-300/[0.03] p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h3 className="text-[14px] font-black uppercase tracking-[0.16em] text-lime-300">
                Zapier MCP
              </h3>
              <p className="mt-2 max-w-md text-[12px] leading-relaxed text-zinc-400">
                Connect 7000+ apps (Gmail, Slack, Notion, etc.) so the AI agent can
                perform actions on behalf of ALL users. Configuration is shared platform-wide.
              </p>
            </div>
            {serverUrl && (
              <span className="flex items-center gap-1.5 rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-lime-300">
                <Check className="h-3 w-3" />
                Connected
              </span>
            )}
          </div>

          {!EMBED_ID ? (
            <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 text-[12px]">
              Zapier MCP is not configured. Set <code>VITE_ZAPIER_MCP_EMBED_ID</code> in{' '}
              <code>.env.local</code>.
            </div>
          ) : !isAllowed ? (
            <div className="rounded-[16px] border border-amber-500/30 bg-amber-500/10 p-4 text-[12px] leading-relaxed text-amber-100">
              <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">
                Zapier MCP not available on <code>{host || 'this host'}</code>
              </p>
              <p className="text-amber-200/90">
                Allowed domains:{' '}
                <span className="font-mono">localhost, vep.eburon.ai, eburon.ai, voip.eburon.ai, connect.eburon.ai, zapier.com</span>
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-[16px] border border-white/[0.08] bg-black/40 p-1">
                <zapier-mcp
                  ref={elRef as any}
                  embed-id={EMBED_ID}
                  width="100%"
                  height="480px"
                />
              </div>

              {saved && (
                <div className="mt-4 flex items-center gap-2 text-[12px] text-lime-300">
                  <Check className="h-4 w-4" />
                  Configuration saved to platform
                </div>
              )}

              {serverUrl && (
                <div className="mt-4 grid gap-2 rounded-[12px] border border-white/[0.06] bg-black/30 p-4 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Server URL</span>
                    <span className="max-w-[200px] truncate font-mono text-lime-300/80">{serverUrl}</span>
                  </div>
                  {toolsUpdatedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Tools Last Updated</span>
                      <span className="text-zinc-400">
                        {new Date(toolsUpdatedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                    <span className="text-zinc-500">Storage Path</span>
                    <code className="text-zinc-400">{PLATFORM_ZAPIER_PATH}</code>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 rounded-[14px] border border-blue-500/20 bg-blue-500/[0.05] p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-400 mb-2">
            How It Works
          </p>
          <ul className="space-y-2 text-[12px] leading-relaxed text-zinc-400">
            <li className="flex gap-2">
              <span className="text-blue-400">1.</span>
              Connect your Zapier account above to authenticate
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">2.</span>
              The MCP server URL is stored globally at <code className="text-zinc-500">{PLATFORM_ZAPIER_PATH}</code>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">3.</span>
              All users can now access connected Zapier tools through the AI agent
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">4.</span>
              The AI calls Zapier functions via secure backend (secret never exposed client-side)
            </li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-white/[0.10] bg-black/95 p-4">
        <button
          onClick={onClose}
          className="flex w-full items-center justify-center gap-3 rounded-[22px] bg-lime-400 py-5 text-[13px] font-black uppercase tracking-[0.16em] text-black transition-all hover:bg-lime-300 active:scale-95"
        >
          <Save className="h-4 w-4" />
          Done
        </button>
      </div>
    </div>
  );
}
