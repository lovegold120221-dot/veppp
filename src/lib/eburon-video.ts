// Eburon Video Maker Agent.
//
// User-facing brand: "Eburon Video Maker Agent" / "our in-house video
// studio". The agent persona MUST NEVER mention the underlying engine
// in conversation — that constraint lives in App.tsx's system prompt.
// This file is the only place the engine name appears, in comments and
// the request URL.
//
// Engine: HeyGen v3 — POST /v3/video-agents to start, GET /v3/videos/{id}
// to poll. Generation typically takes 30–60 seconds; we poll up to 90s
// before returning a "still rendering" status that the caller can use
// to schedule a follow-up check.
//
// SECURITY: the API key authenticates billable video generation. The
// hardcoded fallback below is a prototype convenience — for production,
// proxy through a Firebase Cloud Function and remove the fallback so
// the key never ships in the client bundle.

const VIDEO_API_BASE = 'https://api.heygen.com/v3';

const env = (key: string): string => {
  const im = (typeof import.meta !== 'undefined' ? (import.meta as any).env : null) || null;
  if (im && im[key]) return String(im[key]);
  if (typeof process !== 'undefined' && (process as any).env?.[key]) return String((process as any).env[key]);
  return '';
};

const VIDEO_API_KEY: string =
  env('VITE_HEYGEN_API_KEY') ||
  env('VITE_EBURON_VIDEO_API_KEY') ||
  'sk_V2_hgu_k2bNyrINT8i_3zWoO8y1v9oVUNCCwUyUQSImsotLMeks';

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 90_000;

export interface EburonVideoResult {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  status?: string;
  error?: string;
}

export interface GenerateVideoArgs {
  prompt: string;
}

const apiHeaders = (): Record<string, string> => ({
  'X-Api-Key': VIDEO_API_KEY,
  'Content-Type': 'application/json',
});

const fetchVideoStatus = async (videoId: string): Promise<EburonVideoResult> => {
  try {
    const res = await fetch(`${VIDEO_API_BASE}/videos/${videoId}`, {
      headers: apiHeaders(),
    });
    if (!res.ok) {
      let txt = '';
      try { txt = await res.text(); } catch {}
      return {
        success: false,
        videoId,
        error: `Status ${res.status} ${res.statusText}${txt ? ' — ' + txt.slice(0, 240) : ''}`,
      };
    }
    const data = await res.json().catch(() => ({} as any));
    const v = data?.data || data;
    return {
      success: v?.status === 'completed',
      videoId,
      videoUrl: v?.video_url,
      thumbnailUrl: v?.thumbnail_url,
      duration: v?.duration,
      status: v?.status,
    };
  } catch (err: any) {
    return { success: false, videoId, error: err?.message || 'Status check failed.' };
  }
};

export async function generateEburonVideo(
  args: GenerateVideoArgs,
): Promise<EburonVideoResult> {
  const prompt = String(args?.prompt || '').trim();
  if (!VIDEO_API_KEY) {
    return { success: false, error: 'Eburon Video Maker is not configured.' };
  }
  if (!prompt) {
    return { success: false, error: 'Empty video prompt.' };
  }

  let videoId: string | undefined;
  try {
    const res = await fetch(`${VIDEO_API_BASE}/video-agents`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) {
      let txt = '';
      try { txt = await res.text(); } catch {}
      return {
        success: false,
        error: `Video Maker ${res.status} ${res.statusText}${txt ? ' — ' + txt.slice(0, 240) : ''}`,
      };
    }
    const data = await res.json().catch(() => ({} as any));
    videoId = data?.data?.video_id || data?.video_id;
    if (!videoId) {
      return { success: false, error: 'No video id returned by the Video Maker.' };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Video Maker request failed.' };
  }

  // Poll until completed / failed / timeout.
  const start = Date.now();
  let lastStatus: string | undefined;
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const status = await fetchVideoStatus(videoId);
    lastStatus = status.status || lastStatus;
    if (status.status === 'completed' && status.videoUrl) {
      return { ...status, success: true };
    }
    if (status.status === 'failed') {
      return { ...status, success: false, error: status.error || 'Video generation failed.' };
    }
  }

  return {
    success: false,
    videoId,
    status: lastStatus || 'timeout',
    error:
      'Video is still rendering — typical run is under a minute, this one needs a touch more. Use check_eburon_video with the videoId in a moment to fetch the link.',
  };
}

export async function checkEburonVideo(videoId: string): Promise<EburonVideoResult> {
  if (!VIDEO_API_KEY) return { success: false, error: 'Eburon Video Maker is not configured.' };
  if (!videoId) return { success: false, error: 'Missing videoId.' };
  return fetchVideoStatus(videoId);
}
