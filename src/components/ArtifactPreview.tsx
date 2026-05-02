import { useEffect, useRef, useState } from 'react';
import './styles/ArtifactPreview.css';

/**
 * Eburon AI document artifact preview.
 *
 * Renders a full-screen, branded document preview inside the chat flow —
 * contracts, invoices, proposals, quotations, CSV/spreadsheets, slide decks,
 * PDFs, and generic business letters. Includes working pointer-event
 * signature pads (mouse/trackpad/touch/stylus) with Clear + Undo, and
 * toolbar buttons for Print / Save PDF, Download HTML, Download JSON,
 * and Download CSV where applicable.
 */

export type ArtifactType =
  | 'contract'
  | 'agreement'
  | 'proposal'
  | 'quotation'
  | 'invoice'
  | 'statement_of_work'
  | 'letter'
  | 'certificate'
  | 'csv'
  | 'slides'
  | 'pdf'
  | 'report';

export interface ArtifactParty {
  company?: string;
  signer?: string;
  title?: string;
  email?: string;
  address?: string;
}

export interface ArtifactLineItem {
  label: string;
  amount: string;
  qty?: number;
  unit?: string;
}

export interface ArtifactSlide {
  title: string;
  body?: string;
  bullets?: string[];
  cover?: boolean;
}

export interface ArtifactData {
  type: ArtifactType;
  title?: string;
  documentNumber?: string;
  createdAt?: string;
  intro?: string;

  // Parties (contracts, invoices, agreements)
  contractor?: ArtifactParty;
  client?: ArtifactParty;

  // Contract fields
  scope?: string;
  projectLocation?: string;
  startDate?: string;
  completionDate?: string;
  duration?: string;
  paymentTerms?: string;
  totalFee?: string;

  // Invoice / quotation / SOW
  lineItems?: ArtifactLineItem[];
  subtotal?: string;
  tax?: string;
  total?: string;
  invoiceNumber?: string;
  issuedDate?: string;
  dueDate?: string;
  paymentDetails?: string;

  // Clauses for contracts (auto-filled defaults provided)
  clauses?: { title: string; body: string }[];

  // Generic
  body?: string;          // long-form content for letters / reports / PDFs

  // CSV
  csvHeaders?: string[];
  csvRows?: string[][];
  csvSummary?: string;

  // Slides
  slides?: ArtifactSlide[];

  // Whether signature boxes are required
  signable?: boolean;
  signerLabels?: { client?: string; contractor?: string };
}

interface Props {
  artifact: ArtifactData;
  onClose: () => void;
}

// ─── Default contract clauses (used if caller omits) ─────────────────
const DEFAULT_CLAUSES = [
  { title: 'Scope of Services',
    body: 'Eburon AI shall provide professional AI automation and implementation services, including workflow discovery, solution design, assistant configuration, systems integration, testing, training, and deployment handoff.' },
  { title: 'Project Location',
    body: 'The work shall be performed at the location stated above unless the parties agree in writing to another location, environment, or deployment site.' },
  { title: 'Duration',
    body: 'The project shall begin on the start date and complete by the stated completion date. Any material schedule change must be confirmed in writing by both parties.' },
  { title: 'Payment Terms',
    body: 'The client agrees to pay the total service fee stated above. Payment may be made upon completion, by milestone, or according to a separate invoice schedule approved by both parties.' },
  { title: 'Materials & Equipment',
    body: 'Eburon AI will provide reasonable software tools, configuration templates, implementation resources, and technical documentation necessary to perform the services. The client shall provide access credentials, system documentation, test accounts, and internal contact availability when required.' },
  { title: 'Client Responsibilities',
    body: 'The client shall provide accurate information, timely approvals, access to relevant systems, and prompt feedback. Delays caused by missing access, unavailable stakeholders, or incomplete requirements may extend the project timeline.' },
  { title: 'Confidentiality',
    body: 'Each party may receive confidential business, technical, financial, operational, or customer information and agrees to protect it with reasonable care and not disclose it except as required to perform this agreement or as required by law.' },
  { title: 'Data Protection',
    body: 'Eburon AI will use reasonable administrative, technical, and organizational safeguards when handling client data. The client remains responsible for ensuring it has proper rights, permissions, and lawful basis to provide data to Eburon AI.' },
  { title: 'Intellectual Property',
    body: 'Pre-existing tools, frameworks, templates, libraries, methods, prompts, and know-how remain the property of their original owner. Final client-specific deliverables prepared and paid for under this agreement may be used by the client for its internal business operations.' },
  { title: 'Change Requests',
    body: 'Any work outside the stated scope, including new integrations, additional automation flows, new compliance requirements, or significant redesign, may require a written change request and additional fees.' },
  { title: 'Acceptance',
    body: 'Deliverables are considered accepted when deployed, approved in writing, used in production, or not rejected with specific written reasons within seven calendar days after delivery.' },
  { title: 'Limitation of Liability',
    body: 'Except for confidentiality, fraud, intentional misconduct, or unpaid fees, neither party shall be liable for indirect, incidental, special, consequential, or punitive damages. Total liability shall not exceed fees paid under this agreement during the three months before the claim.' },
  { title: 'Termination',
    body: 'Either party may terminate this agreement upon written notice for material breach not cured within fourteen days. Fees earned prior to termination remain payable.' },
  { title: 'Electronic Signature Consent',
    body: 'The parties agree that electronic signatures, captured on this document or on equivalent electronic platforms, are valid, binding, and enforceable equivalents of handwritten signatures.' },
];

// ─── Signature pad (pointer events; supports undo, clear, PNG export) ───
interface SignaturePadProps {
  label: string;
  onChange: (pngDataUrl: string | null) => void;
}
function SignaturePad({ label, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<{ x: number; y: number }[][]>([]);
  const currentStrokeRef = useRef<{ x: number; y: number }[] | null>(null);
  const drawingRef = useRef(false);

  // Fit canvas to its CSS size with devicePixelRatio.
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = c.getBoundingClientRect();
      c.width = rect.width * dpr;
      c.height = rect.height * dpr;
      const ctx = c.getContext('2d')!;
      ctx.scale(dpr, dpr);
      redraw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redraw = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const rect = c.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = '#0d1c24';
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const stroke of strokesRef.current) {
      if (stroke.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
    }
  };

  const emitPng = () => {
    const c = canvasRef.current;
    if (!c) return onChange(null);
    const hasInk = strokesRef.current.some((s) => s.length > 1);
    onChange(hasInk ? c.toDataURL('image/png') : null);
  };

  const coords = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    currentStrokeRef.current = [coords(e)];
    strokesRef.current.push(currentStrokeRef.current!);
    redraw();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    currentStrokeRef.current.push(coords(e));
    redraw();
  };
  const onPointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    currentStrokeRef.current = null;
    emitPng();
  };

  const undo = () => {
    strokesRef.current.pop();
    redraw();
    emitPng();
  };
  const clear = () => {
    strokesRef.current = [];
    redraw();
    emitPng();
  };

  return (
    <div className="doc-sig-box">
      <div className="doc-sig-head">
        <strong>{label}</strong>
        <div className="doc-sig-btns">
          <button type="button" onClick={undo}>Undo</button>
          <button type="button" onClick={clear}>Clear</button>
        </div>
      </div>
      <div className="doc-canvas-shell">
        <canvas
          ref={canvasRef}
          className="doc-sig-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        <div className="doc-sig-baseline" />
        <div className="doc-sig-hint">Sign here</div>
      </div>
    </div>
  );
}

export default function ArtifactPreview({ artifact, onClose }: Props) {
  const [clientSignaturePng, setClientSignaturePng] = useState<string | null>(null);
  const [contractorSignaturePng, setContractorSignaturePng] = useState<string | null>(null);

  const contractor: ArtifactParty = {
    company: 'Eburon AI',
    signer: 'Eburon AI Solutions Team',
    email: 'hello@eburon.ai',
    address: '123 Innovation Drive, Austin, TX 78701, USA',
    ...(artifact.contractor || {}),
  };
  const client: ArtifactParty = {
    company: 'Client Company',
    signer: 'Client Signer',
    email: 'client@example.com',
    address: '123 Anywhere St., Any City, ST 12345',
    ...(artifact.client || {}),
  };

  const isSignable =
    artifact.signable ??
    ['contract', 'agreement', 'proposal', 'quotation', 'statement_of_work'].includes(artifact.type);

  const issuedDate = artifact.issuedDate || artifact.createdAt || new Date().toISOString().slice(0, 10);

  // JSON payload export ----------------------------------------------
  const buildPayload = () => ({
    brand: 'Eburon AI',
    artifactType: artifact.type,
    documentTitle: artifact.title,
    documentNumber: artifact.documentNumber || artifact.invoiceNumber,
    createdAt: new Date().toISOString(),
    parties: {
      contractor,
      client,
    },
    content: {
      scope: artifact.scope,
      paymentTerms: artifact.paymentTerms,
      totalFee: artifact.totalFee,
      total: artifact.total,
      lineItems: artifact.lineItems,
      body: artifact.body,
      csvHeaders: artifact.csvHeaders,
      csvRows: artifact.csvRows,
      slides: artifact.slides,
    },
    signatures: isSignable
      ? {
          clientSignaturePng,
          contractorSignaturePng,
          clientSigned: !!clientSignaturePng,
          contractorSigned: !!contractorSignaturePng,
        }
      : undefined,
  });

  const download = (filename: string, mime: string, content: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const onDownloadJson = () =>
    download(`${artifact.type}-${Date.now()}.json`, 'application/json', JSON.stringify(buildPayload(), null, 2));
  const onDownloadCsv = () => {
    if (!artifact.csvHeaders || !artifact.csvRows) return;
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      artifact.csvHeaders.map(escape).join(','),
      ...artifact.csvRows.map((r) => r.map(escape).join(',')),
    ].join('\n');
    download(`${artifact.type}-${Date.now()}.csv`, 'text/csv', csv);
  };
  const onDownloadHtml = () => {
    const pageNode = document.querySelector('.artifact-page');
    const inner = pageNode ? pageNode.outerHTML : '<p>No document</p>';
    const cssLink = Array.from(document.styleSheets)
      .map((s) => {
        try {
          return Array.from((s as CSSStyleSheet).cssRules).map((r) => r.cssText).join('\n');
        } catch {
          return '';
        }
      })
      .join('\n');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${artifact.title || 'Document'}</title><style>${cssLink}</style></head><body class="artifact-preview" style="position:static;padding:20px;">${inner}</body></html>`;
    download(`${artifact.type}-${Date.now()}.html`, 'text/html', html);
  };
  const onPrint = () => window.print();

  const clauses = artifact.clauses && artifact.clauses.length > 0 ? artifact.clauses : DEFAULT_CLAUSES;

  // ─── Render specific artifact body ────────────────────────────────
  const renderContract = () => (
    <>
      <h1 className="doc-title">{artifact.title || 'Services Agreement'}</h1>
      <p className="doc-intro">
        {artifact.intro ||
          `This ${artifact.title || 'Services Agreement'} is entered into by and between Eburon AI, the contractor, and the client identified below. The parties agree to the terms, scope, payment obligations, confidentiality obligations, and electronic signature consent stated in this contract.`}
      </p>

      <section className="doc-info-band">
        <div className="doc-line">
          <b>This Agreement is made on:</b>
          <span className="doc-line-value">{issuedDate}</span>
        </div>
        <div className="doc-line">
          <b>Main Contractor Name:</b>
          <span className="doc-line-value">{contractor.company}</span>
        </div>
        <div className="doc-line">
          <b>Client / Subcontractor Name:</b>
          <span className="doc-line-value">{client.company}</span>
        </div>
      </section>

      <section className="doc-party-grid">
        <div className="doc-party">
          <div className="doc-party-title">Client / Company</div>
          <div className="item"><b>Company:</b><span>{client.company}</span></div>
          <div className="item"><b>Signer:</b><span>{client.signer}</span></div>
          <div className="item"><b>Email:</b><span>{client.email}</span></div>
          <div className="item"><b>Address:</b><span>{client.address}</span></div>
        </div>
        <div className="doc-party">
          <div className="doc-party-title">Contractor</div>
          <div className="item"><b>Company:</b><span>{contractor.company}</span></div>
          <div className="item"><b>Contact:</b><span>{contractor.signer}</span></div>
          <div className="item"><b>Email:</b><span>{contractor.email}</span></div>
          <div className="item"><b>Address:</b><span>{contractor.address}</span></div>
        </div>
      </section>

      {artifact.totalFee && (
        <aside className="doc-pricing">
          <h3>Fees & Pricing Summary</h3>
          {(artifact.lineItems || []).map((li, i) => (
            <div className="doc-pricing-row" key={i}><span>{li.label}</span><span>{li.amount}</span></div>
          ))}
          <div className="doc-pricing-row total"><span>Total</span><span>{artifact.totalFee}</span></div>
        </aside>
      )}

      <section className="doc-clauses">
        {clauses.map((c, i) => (
          <div className="doc-clause" key={i}>
            <div>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          </div>
        ))}
      </section>
    </>
  );

  const renderInvoice = () => (
    <>
      <h1 className="doc-title">{artifact.title || 'Invoice'}</h1>
      <section className="doc-info-band">
        <div className="doc-line"><b>Invoice No.</b><span className="doc-line-value">{artifact.invoiceNumber || artifact.documentNumber || '—'}</span></div>
        <div className="doc-line"><b>Issued:</b><span className="doc-line-value">{issuedDate}</span></div>
        {artifact.dueDate && <div className="doc-line"><b>Due:</b><span className="doc-line-value">{artifact.dueDate}</span></div>}
      </section>
      <section className="doc-party-grid">
        <div className="doc-party">
          <div className="doc-party-title">Billed To</div>
          <div className="item"><b>Company:</b><span>{client.company}</span></div>
          <div className="item"><b>Contact:</b><span>{client.signer}</span></div>
          <div className="item"><b>Email:</b><span>{client.email}</span></div>
          <div className="item"><b>Address:</b><span>{client.address}</span></div>
        </div>
        <div className="doc-party">
          <div className="doc-party-title">From</div>
          <div className="item"><b>Company:</b><span>{contractor.company}</span></div>
          <div className="item"><b>Contact:</b><span>{contractor.signer}</span></div>
          <div className="item"><b>Email:</b><span>{contractor.email}</span></div>
          <div className="item"><b>Address:</b><span>{contractor.address}</span></div>
        </div>
      </section>
      <aside className="doc-pricing">
        <h3>Line Items</h3>
        {(artifact.lineItems || []).map((li, i) => (
          <div className="doc-pricing-row" key={i}>
            <span>{li.label}{li.qty ? ` × ${li.qty}${li.unit ? ' ' + li.unit : ''}` : ''}</span>
            <span>{li.amount}</span>
          </div>
        ))}
        {artifact.subtotal && <div className="doc-pricing-row"><span>Subtotal</span><span>{artifact.subtotal}</span></div>}
        {artifact.tax && <div className="doc-pricing-row"><span>Tax</span><span>{artifact.tax}</span></div>}
        <div className="doc-pricing-row total"><span>Total</span><span>{artifact.total || artifact.totalFee || '—'}</span></div>
      </aside>
      {artifact.paymentDetails && (
        <p className="doc-legal-note"><b>Payment:</b> {artifact.paymentDetails}</p>
      )}
    </>
  );

  const renderCsv = () => (
    <>
      <h1 className="doc-title">{artifact.title || 'Spreadsheet'}</h1>
      {artifact.intro && <p className="doc-intro">{artifact.intro}</p>}
      <div className="doc-table-wrap">
        <table className="doc-table">
          <thead>
            <tr>{(artifact.csvHeaders || []).map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {(artifact.csvRows || []).map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => <td key={ci} contentEditable suppressContentEditableWarning>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {artifact.csvSummary && <p className="doc-legal-note">{artifact.csvSummary}</p>}
    </>
  );

  const renderSlides = () => (
    <>
      <h1 className="doc-title">{artifact.title || 'Presentation'}</h1>
      <div className="doc-slides">
        {(artifact.slides || []).map((s, i) => (
          <div key={i} className={`doc-slide${s.cover || i === 0 ? ' cover' : ''}`}>
            <span className="slide-num">Slide {i + 1}</span>
            <h3>{s.title}</h3>
            {s.body && <p>{s.body}</p>}
            {s.bullets && s.bullets.length > 0 && (
              <ul>{s.bullets.map((b, bi) => <li key={bi}>{b}</li>)}</ul>
            )}
          </div>
        ))}
      </div>
    </>
  );

  const renderLetterOrReport = () => (
    <>
      <h1 className="doc-title">{artifact.title || 'Document'}</h1>
      {artifact.intro && <p className="doc-intro">{artifact.intro}</p>}
      {artifact.body && (
        <div style={{ whiteSpace: 'pre-wrap', color: '#111', fontSize: 12.5, lineHeight: 1.6 }}>
          {artifact.body}
        </div>
      )}
    </>
  );

  const renderBody = () => {
    switch (artifact.type) {
      case 'invoice': return renderInvoice();
      case 'csv': return renderCsv();
      case 'slides': return renderSlides();
      case 'letter':
      case 'certificate':
      case 'pdf':
      case 'report': return renderLetterOrReport();
      default: return renderContract();
    }
  };

  return (
    <div className="artifact-preview" role="dialog" aria-label={`${artifact.type} preview`}>
      <div className="artifact-toolbar">
        <div className="artifact-brand">
          <span className="artifact-brand-icon">EA</span>
          Eburon AI · {(artifact.title || artifact.type).replace(/_/g, ' ')}
        </div>
        <div className="artifact-actions">
          <button type="button" onClick={onDownloadHtml}>Download HTML</button>
          <button type="button" onClick={onDownloadJson}>Download JSON</button>
          {artifact.type === 'csv' && (
            <button type="button" onClick={onDownloadCsv}>Download CSV</button>
          )}
          <button type="button" className="primary" onClick={onPrint}>Print / Save PDF</button>
          <button type="button" className="artifact-close" onClick={onClose} aria-label="Close preview">×</button>
        </div>
      </div>

      <div className="artifact-scroll">
        <article className="artifact-page">
          <div className="arc" />
          <div className="arc two" />
          <div className="artifact-page-inner">
            <header className="doc-header">
              <div className="doc-logo-row">
                <div className="doc-logo-box">EA</div>
                <div className="doc-logo-text">
                  <strong>Eburon<br />AI</strong>
                  <span>AI Automation & Solutions</span>
                </div>
              </div>
              <div className="doc-meta">
                <strong>{artifact.type === 'invoice' ? 'Invoice No.' : 'Document No.'}</strong>
                {artifact.documentNumber || artifact.invoiceNumber || `EA-${new Date().getFullYear()}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`}
                <br /><br />
                <strong>Date</strong>
                {issuedDate}
              </div>
            </header>

            {renderBody()}

            {isSignable && (
              <>
                <div className="doc-sig-title">Signatures</div>
                <div className="doc-sig-grid">
                  <SignaturePad
                    label={artifact.signerLabels?.client || 'Client Signature'}
                    onChange={setClientSignaturePng}
                  />
                  <SignaturePad
                    label={artifact.signerLabels?.contractor || 'Contractor Signature'}
                    onChange={setContractorSignaturePng}
                  />
                </div>
                <div className="doc-sig-grid">
                  <div className="doc-sig-meta">
                    <b>Signer:</b><span>{client.signer}</span>
                    <b>Title:</b><span>{client.title || '—'}</span>
                    <b>Date:</b><span>{issuedDate}</span>
                  </div>
                  <div className="doc-sig-meta">
                    <b>Signer:</b><span>{contractor.signer}</span>
                    <b>Title:</b><span>{contractor.title || 'Authorized Representative'}</span>
                    <b>Date:</b><span>{issuedDate}</span>
                  </div>
                </div>
                <p className="doc-legal-note">
                  By signing above, each party acknowledges that this electronic signature is valid,
                  binding, and enforceable under applicable law. Signatures are stored as PNG images
                  within this document's data payload.
                </p>
              </>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
