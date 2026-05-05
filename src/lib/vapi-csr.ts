// Vapi CSR (outbound call) integration.
//
// Triggered by the Gemini Live agent when Boss says things like
// "call this number", "phone Sarah about the project", "follow up with that
// inquiry by phone". The CSR persona — "Beatrice as Jo Lernout's
// personal secretary" — is configured server-side in Vapi as the
// assistant referenced by DEFAULT_CSR_ASSISTANT_ID.
//
// SECURITY NOTE: The Vapi *private* key is what authenticates outbound
// calls. Bundling it into the client exposes it to every visitor. Configure
// VITE_VAPI_PRIVATE_KEY from the environment only, ideally through a backend
// proxy for production. The same applies to VITE_VAPI_PHONE_NUMBER_ID.
const VAPI_API_BASE = 'https://api.vapi.ai';

const env = (key: string): string => {
  const im = (typeof import.meta !== 'undefined' ? (import.meta as any).env : null) || null;
  if (im && im[key]) return String(im[key]);
  if (typeof process !== 'undefined' && (process as any).env?.[key]) return String((process as any).env[key]);
  return '';
};

const VAPI_PRIVATE_KEY: string = env('VITE_VAPI_PRIVATE_KEY');

const DEFAULT_CSR_ASSISTANT_ID = '8420b35d-70b0-4bd2-8f38-71b5f3ebb8eb';

// Vapi outbound calls need a "from" number. Set VITE_VAPI_PHONE_NUMBER_ID
// to the ID of a phone number provisioned in your Vapi org. If unset,
// Vapi may reject the request — the error surfaces back to the agent.
const VAPI_PHONE_NUMBER_ID: string = env('VITE_VAPI_PHONE_NUMBER_ID');

const normalizeNumber = (raw: string): string => {
  const cleaned = String(raw || '').trim().replace(/[^\d+]/g, '');
  // Strip any '+' that isn't the very first char, then collapse multiple +s.
  if (!cleaned) return '';
  const sign = cleaned.startsWith('+') ? '+' : '';
  return sign + cleaned.replace(/\+/g, '');
};

export interface VapiCallResult {
  success: boolean;
  callId?: string;
  status?: string;
  error?: string;
}

export interface PlaceCsrCallArgs {
  phoneNumber: string;
  name?: string;
  inquiry?: string;
  assistantId?: string;
}

export async function placeCsrCall(args: PlaceCsrCallArgs): Promise<VapiCallResult> {
  const number = normalizeNumber(args.phoneNumber);
  if (!number) {
    return { success: false, error: 'Missing or invalid phone number.' };
  }
  if (!VAPI_PRIVATE_KEY) {
    return { success: false, error: 'Vapi API key is not configured.' };
  }

  const body: Record<string, any> = {
    assistantId: args.assistantId || DEFAULT_CSR_ASSISTANT_ID,
    customer: { number },
  };

  if (VAPI_PHONE_NUMBER_ID) {
    body.phoneNumberId = VAPI_PHONE_NUMBER_ID;
  }

  // Forward `name` and `inquiry` into the assistant's prompt template
  // (the system prompt references `{{subject_name}}`). Anything not
  // referenced in the prompt is harmless extra metadata.
  const variableValues: Record<string, string> = {};
  if (args.name) variableValues.subject_name = args.name;
  if (args.inquiry) variableValues.inquiry = args.inquiry;
  if (Object.keys(variableValues).length > 0) {
    body.assistantOverrides = { variableValues };
  }

  try {
    const res = await fetch(`${VAPI_API_BASE}/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let txt = '';
      try { txt = await res.text(); } catch {}
      const snippet = txt.slice(0, 280).replace(/\s+/g, ' ');
      return {
        success: false,
        error: `Vapi ${res.status} ${res.statusText}${snippet ? ' — ' + snippet : ''}`,
      };
    }

    const data = await res.json().catch(() => ({} as any));
    return {
      success: true,
      callId: data?.id,
      status: data?.status,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Vapi request failed.' };
  }
}
