const HEYGEN_API_KEY = import.meta.env.VITE_HEYGEN_API_KEY;
const HEYGEN_API_URL = 'https://api.heygen.com/v2';

export interface VideoGenerationRequest {
  avatarId: string;
  voiceId: string;
  script: string;
  background?: string;
  quality?: 'high' | 'medium' | 'low';
}

export interface VideoGenerationResponse {
  video_id: string;
  status: string;
  video_url?: string;
}

export class HeygenVideoAgent {
  private apiKey: string;

  constructor() {
    this.apiKey = HEYGEN_API_KEY || '';
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    const response = await fetch(`${HEYGEN_API_URL}/video/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        avatar_id: request.avatarId,
        voice_id: request.voiceId,
        input_text: request.script,
        background: request.background || '#000000',
        quality: request.quality || 'high',
      }),
    });

    if (!response.ok) {
      throw new Error(`HeyGen API error: ${response.status}`);
    }

    return response.json();
  }

  async getVideoStatus(videoId: string): Promise<VideoGenerationResponse> {
    const response = await fetch(`${HEYGEN_API_URL}/video/status/${videoId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HeyGen API error: ${response.status}`);
    }

    return response.json();
  }
}

export const heygenAgent = new HeygenVideoAgent();
