const env = (key: string): string => {
  const viteEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const processEnv = typeof process !== 'undefined' ? (process as any).env : undefined;
  return String(viteEnv?.[key] || processEnv?.[key] || '').trim();
};

export interface GeminiImageResult {
  success: boolean;
  imageDataUrl?: string;
  mimeType?: string;
  text?: string;
  error?: string;
}

const GEMINI_IMAGE_MODEL = env('VITE_GEMINI_IMAGE_MODEL') || 'gemini-2.5-flash-image';
const GEMINI_API_KEY = env('VITE_GEMINI_API_KEY') || env('GEMINI_API_KEY');

const extractParts = (payload: any): any[] => {
  if (Array.isArray(payload)) {
    return payload.flatMap(extractParts);
  }
  return payload?.candidates?.flatMap((candidate: any) => candidate?.content?.parts || []) || [];
};

export const generateGeminiImage = async (prompt: string): Promise<GeminiImageResult> => {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) return { success: false, error: 'Image prompt is required.' };
  if (!GEMINI_API_KEY) return { success: false, error: 'Missing VITE_GEMINI_API_KEY.' };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:streamGenerateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: cleanPrompt }],
            },
          ],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
          },
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Gemini image API ${response.status}: ${body.slice(0, 240)}`);
    }

    const rawText = await response.text();
    let payload: any;
    try {
      payload = JSON.parse(rawText);
    } catch {
      const jsonLines = rawText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.replace(/^data:\s*/, ''))
        .filter((line) => line && line !== '[DONE]');
      payload = jsonLines.map((line) => JSON.parse(line));
    }

    const parts = extractParts(payload);
    const imagePart = parts.find((part) => part.inlineData?.data);
    const text = parts
      .map((part) => part.text)
      .filter(Boolean)
      .join('\n')
      .trim();

    if (!imagePart?.inlineData?.data) {
      return { success: false, text, error: text || 'Gemini did not return an image.' };
    }

    const mimeType = imagePart.inlineData.mimeType || 'image/png';
    return {
      success: true,
      imageDataUrl: `data:${mimeType};base64,${imagePart.inlineData.data}`,
      mimeType,
      text,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gemini image generation failed.',
    };
  }
};
