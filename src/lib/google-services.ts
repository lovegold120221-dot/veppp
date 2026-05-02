import { get, ref } from 'firebase/database';
import { auth, rtdb } from '../firebase';

interface GoogleCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scopes: string[];
}

interface GoogleServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Shared Google Cloud API key (set via VITE_GOOGLE_API_KEY in .env.local).
// Used as a fallback for services that accept API-key auth — Maps, Geocoding,
// Places, Directions, Roads, Solar, YouTube Data v3, Search Console (public
// endpoints), etc. — when the user has not signed in with OAuth, and as the
// `?key=` query parameter on every request so quota/billing are tracked.
const GOOGLE_API_KEY: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_API_KEY) ||
  (typeof process !== 'undefined' && (process as any).env?.VITE_GOOGLE_API_KEY) ||
  (typeof process !== 'undefined' && (process as any).env?.GOOGLE_API_KEY) ||
  '';

const appendApiKey = (url: string): string => {
  if (!GOOGLE_API_KEY) return url;
  return url.includes('key=') ? url : url + (url.includes('?') ? '&' : '?') + 'key=' + GOOGLE_API_KEY;
};

class GoogleServices {
  private static instance: GoogleServices;
  private credentials: GoogleCredentials | null = null;
  // Services that accept API-key auth (no user OAuth required).
  private readonly KEY_AUTH_SERVICES = new Set([
    'maps', 'geocoding', 'places', 'directions', 'roads', 'solar',
    'aerial', 'youtube', 'search', 'searchconsole', 'mapsjs', 'mapsstatic',
    'mapsgrounding', 'placesnew',
  ]);

  static getInstance(): GoogleServices {
    if (!GoogleServices.instance) {
      GoogleServices.instance = new GoogleServices();
    }
    return GoogleServices.instance;
  }

  private async loadCredentials(): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const credentialsRef = ref(rtdb, `users/${user.uid}/googleCredentials`);
      const snapshot = await get(credentialsRef);
      
      if (snapshot.exists()) {
        this.credentials = snapshot.val() as GoogleCredentials;
        
        // Check if token is expired
        if (Date.now() > this.credentials.expiresAt) {
          console.warn('Google access token has expired');
          return false;
        }
        
        return true;
      }
      
      throw new Error('No Google credentials found');
    } catch (error) {
      console.error('Error loading Google credentials:', error);
      return false;
    }
  }

  private async makeApiRequest(service: string, endpoint: string, options: RequestInit = {}): Promise<GoogleServiceResponse> {
    try {
      const svcKey = service.toLowerCase();
      const supportsKeyAuth = this.KEY_AUTH_SERVICES.has(svcKey);

      // For user-scoped APIs (Gmail, Drive, Calendar, etc.) we still need the
      // OAuth bearer token. For public/key-auth APIs we proceed without it.
      if (!this.credentials && !supportsKeyAuth) {
        const loaded = await this.loadCredentials();
        if (!loaded) {
          throw new Error('Failed to load Google credentials');
        }
      } else if (!this.credentials && supportsKeyAuth) {
        // Best-effort, but don't error out — API key alone is enough.
        await this.loadCredentials().catch(() => false);
      }

      const baseUrl = this.getServiceBaseUrl(service);
      const url = appendApiKey(`${baseUrl}${endpoint}`);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
      };
      if (this.credentials?.accessToken) {
        headers['Authorization'] = `Bearer ${this.credentials.accessToken}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token might be expired, try to refresh
          const refreshed = await this.refreshToken();
          if (refreshed) {
            // Retry with new token
            return this.makeApiRequest(service, endpoint, options);
          }
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error(`Error making API request to ${service}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private getServiceBaseUrl(service: string): string {
    const baseUrls: Record<string, string> = {
      // OAuth (user-scoped)
      gmail: 'https://gmail.googleapis.com/gmail/v1',
      calendar: 'https://www.googleapis.com/calendar/v3',
      drive: 'https://www.googleapis.com/drive/v3',
      sheets: 'https://sheets.googleapis.com/v4',
      docs: 'https://docs.googleapis.com/v1',
      slides: 'https://slides.googleapis.com/v1',
      forms: 'https://forms.googleapis.com/v1',
      tasks: 'https://www.googleapis.com/tasks/v1',
      analytics: 'https://www.googleapis.com/analytics/v3',
      contacts: 'https://www.googleapis.com/contacts/v1',
      people: 'https://people.googleapis.com/v1',
      chat: 'https://chat.googleapis.com/v1',
      photos: 'https://photoslibrary.googleapis.com/v1',
      // API-key auth (public)
      maps: 'https://maps.googleapis.com/maps/api',
      mapsjs: 'https://maps.googleapis.com/maps/api/js',
      mapsstatic: 'https://maps.googleapis.com/maps/api/staticmap',
      mapsgrounding: 'https://maps.googleapis.com/v1',
      geocoding: 'https://maps.googleapis.com/maps/api/geocode',
      places: 'https://maps.googleapis.com/maps/api/place',
      placesnew: 'https://places.googleapis.com/v1',
      directions: 'https://maps.googleapis.com/maps/api/directions',
      roads: 'https://roads.googleapis.com/v1',
      solar: 'https://solar.googleapis.com/v1',
      aerial: 'https://aerialview.googleapis.com/v1',
      youtube: 'https://www.googleapis.com/youtube/v3',
      search: 'https://customsearch.googleapis.com/customsearch/v1',
      searchconsole: 'https://searchconsole.googleapis.com/v1',
    };

    return baseUrls[service] || `https://www.googleapis.com/${service}/v1`;
  }

  private async refreshToken(): Promise<boolean> {
    // This would implement token refresh logic using the refresh token
    // For now, return false as refresh token handling requires backend
    console.log('Token refresh needed - implement refresh logic');
    return false;
  }

  // Gmail Services
  async sendEmail(to: string, subject: string, body: string): Promise<GoogleServiceResponse> {
    const emailData = {
      raw: this.createEmailRaw(to, subject, body)
    };

    return this.makeApiRequest('gmail', '/users/me/messages/send', {
      method: 'POST',
      body: JSON.stringify(emailData),
    });
  }

  async getEmails(maxResults: number = 10): Promise<GoogleServiceResponse> {
    return this.makeApiRequest('gmail', `/users/me/messages?maxResults=${maxResults}`);
  }

  private createEmailRaw(to: string, subject: string, body: string): string {
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ].join('\n');

    return btoa(unescape(encodeURIComponent(email)));
  }

  // Calendar Services
  async getEvents(maxResults: number = 10): Promise<GoogleServiceResponse> {
    return this.makeApiRequest('calendar', `/users/me/calendarList`);
  }

  async createEvent(summary: string, start: string, end: string): Promise<GoogleServiceResponse> {
    const eventData = {
      summary,
      start: { dateTime: start },
      end: { dateTime: end },
    };

    return this.makeApiRequest('calendar', '/users/me/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  // Drive Services
  async listFiles(maxResults: number = 10): Promise<GoogleServiceResponse> {
    return this.makeApiRequest('drive', `/files?pageSize=${maxResults}`);
  }

  async uploadFile(fileName: string, mimeType: string, content: string): Promise<GoogleServiceResponse> {
    const metadata = {
      name: fileName,
      mimeType,
    };

    return this.makeApiRequest('drive', '/files?uploadType=multipart', {
      method: 'POST',
      body: JSON.stringify(metadata),
    });
  }

  // Sheets Services
  async getSpreadsheet(spreadsheetId: string): Promise<GoogleServiceResponse> {
    return this.makeApiRequest('sheets', `/spreadsheets/${spreadsheetId}`);
  }

  async updateCell(spreadsheetId: string, range: string, values: any[][]): Promise<GoogleServiceResponse> {
    const updateData = {
      range,
      values,
    };

    return this.makeApiRequest('sheets', `/spreadsheets/${spreadsheetId}/values/${range}:append`, {
      method: 'POST',
      body: JSON.stringify(updateData),
    });
  }

  // Universal service executor for the live agent
  async executeService(service: string, action: string, params: Record<string, any>): Promise<GoogleServiceResponse> {
    try {
      switch (service.toLowerCase()) {
        case 'gmail':
          if (action === 'send') {
            return this.sendEmail(params.to, params.subject, params.body);
          } else if (action === 'list') {
            return this.getEmails(params.maxResults);
          }
          break;

        case 'calendar':
          if (action === 'list') {
            return this.getEvents(params.maxResults);
          } else if (action === 'create') {
            return this.createEvent(params.summary, params.start, params.end);
          }
          break;

        case 'drive':
          if (action === 'list') {
            return this.listFiles(params.maxResults);
          } else if (action === 'upload') {
            return this.uploadFile(params.fileName, params.mimeType, params.content);
          }
          break;

        case 'sheets':
          if (action === 'get') {
            return this.getSpreadsheet(params.spreadsheetId);
          } else if (action === 'update') {
            return this.updateCell(params.spreadsheetId, params.range, params.values);
          }
          break;

        default:
          return { success: false, error: `Unsupported service: ${service}` };
      }

      return { success: false, error: `Unsupported action: ${action} for service: ${service}` };
    } catch (error) {
      console.error(`Error executing ${service}.${action}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Check if user has valid credentials for a specific service
  async hasServiceAccess(service: string): Promise<boolean> {
    if (!this.credentials) {
      const loaded = await this.loadCredentials();
      if (!loaded) return false;
    }

    const serviceScopes: Record<string, string[]> = {
      gmail: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send'
      ],
      calendar: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      drive: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.file'
      ],
      sheets: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/spreadsheets'
      ],
      docs: [
        'https://www.googleapis.com/auth/documents.readonly',
        'https://www.googleapis.com/auth/documents'
      ],
    };

    const requiredScopes = serviceScopes[service.toLowerCase()];
    if (!requiredScopes) return false;

    return requiredScopes.some(scope => this.credentials!.scopes.includes(scope));
  }
}

export default GoogleServices;
