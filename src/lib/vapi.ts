const VAPI_API_KEY = '98a575e6-f4c4-4908-ad05-e742379e361d';
const VAPI_PUBLIC_KEY = 'c6f10ddb-3c84-4422-8d1b-585231b9112d';
const CSR_ASSISTANT_ID = '8420b35d-70b0-4bd2-8f38-71b5f3ebb8eb';
const VAPI_API_URL = 'https://api.vapi.ai';

export interface CallRequest {
  phoneNumber: string;
  name?: string;
  inquiry?: string;
  subjectName?: string;
}

export interface CallResponse {
  id: string;
  status: string;
  callId?: string;
}

export class VapiCSRAgent {
  private apiKey: string;
  private assistantId: string;

  constructor() {
    this.apiKey = VAPI_API_KEY;
    this.assistantId = CSR_ASSISTANT_ID;
  }

  async makeOutboundCall(request: CallRequest): Promise<CallResponse> {
    const response = await fetch(`${VAPI_API_URL}/call`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: this.assistantId,
        phoneNumber: {
          number: request.phoneNumber,
        },
        assistantOverrides: {
          variableValues: {
            name: request.name || 'unknown',
            inquiry: request.inquiry || 'Eburon VEP inquiry',
            subject_name: request.subjectName || '',
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`VAPI error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getCallStatus(callId: string): Promise<any> {
    const response = await fetch(`${VAPI_API_URL}/call/${callId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`VAPI error: ${response.status}`);
    }

    return response.json();
  }
}

export const vapiCSRAgent = new VapiCSRAgent();
