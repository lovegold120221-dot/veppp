export type ArtifactType =
  | 'contract'
  | 'agreement'
  | 'proposal'
  | 'quotation'
  | 'statement_of_work'
  | 'invoice'
  | 'csv'
  | 'slides'
  | 'pdf'
  | 'letter'
  | 'certificate'
  | 'report';

export interface ArtifactData {
  type: ArtifactType;
  title: string;
  content: string;
  metadata?: {
    client?: string;
    date?: string;
    amount?: string;
    documentNumber?: string;
    [key: string]: any;
  };
}

export const detectArtifactRequest = (text: string): ArtifactType | null => {
  const t = text.toLowerCase();

  if (/(invoice|bill)/.test(t)) return 'invoice';
  if (/(contract|service agreement|services agreement|msa|nda)/.test(t)) return 'contract';
  if (/(agreement)/.test(t)) return 'agreement';
  if (/(proposal|propose)/.test(t)) return 'proposal';
  if (/(quotation|quote)/.test(t)) return 'quotation';
  if (/(statement of work|\bsow\b|scope document)/.test(t)) return 'statement_of_work';
  if (/(csv|spreadsheet|excel|sheet)/.test(t)) return 'csv';
  if (/(slide|deck|presentation|pptx|powerpoint)/.test(t)) return 'slides';
  if (/(pdf|report)/.test(t)) return 'pdf';
  if (/(letter|correspondence)/.test(t)) return 'letter';
  if (/(certificate|cert)/.test(t)) return 'certificate';

  return null;
};

export const buildArtifactFromPrompt = (
  type: ArtifactType,
  userPrompt: string,
  personaName = 'Beatrice',
): ArtifactData => {
  const today = new Date().toISOString().slice(0, 10);
  const requestText = userPrompt.trim() || 'Not provided';
  const forMatch = userPrompt.match(/\bfor\s+([A-Z][\w&.' -]{2,60})/);
  const clientName = forMatch ? forMatch[1].trim().replace(/[.,!?]+$/, '') : 'Not provided';
  const feeMatch = userPrompt.match(/\$\s*[\d,]+(?:\.\d{2})?/);
  const totalFee = feeMatch ? feeMatch[0].replace(/\s/g, '') : 'Not provided';
  const docNumber = `EA-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const titleMap: Record<ArtifactType, string> = {
    contract: 'Service Agreement',
    agreement: 'Agreement',
    proposal: 'Proposal',
    quotation: 'Quotation',
    statement_of_work: 'Statement of Work',
    invoice: 'Invoice',
    csv: 'Spreadsheet Export',
    slides: 'Presentation',
    pdf: 'PDF Document',
    letter: 'Business Letter',
    certificate: 'Certificate',
    report: 'Report',
  };

  const content = `${titleMap[type]}

Document Number: ${docNumber}
Date: ${today}
Prepared By: ${personaName}
Client: ${clientName}
Amount: ${totalFee}

Request:
${requestText}

Missing details:
Any name, address, email, date, amount, timeline, metric, or obligation not explicitly supplied by Boss is marked as "Not provided" and must be confirmed before use.`;

  return {
    type,
    title: `${titleMap[type]} - ${docNumber}`,
    content,
    metadata: {
      client: clientName,
      date: today,
      amount: totalFee,
      documentNumber: docNumber,
    },
  };
};
