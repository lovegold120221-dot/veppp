import { useEffect, useMemo, useState, useRef, type FormEvent } from 'react';
import { auth, rtdb, handleDatabaseError, OperationType } from './firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User,
  signOut,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import {
  ref,
  get,
  set,
  push,
  onValue,
  query,
  orderByChild,
  limitToLast,
  serverTimestamp,
  update,
} from 'firebase/database';
import { GoogleGenAI, LiveServerMessage, Modality, Type, ToolCall } from '@google/genai';
import { AudioRecorder, AudioStreamer } from './lib/audio';
import { BIBLE_PERSONALITY, EMOTIONAL_AWARENESS_SYSTEM_PROMPT } from './lib/personality';
import GoogleServices from './lib/google-services';
import EmotionalSynthesizer, { EmotionalState, EmotionalContext } from './lib/emotional-synthesis';
import {
  Loader2,
  Power,
  LogOut,
  Check,
  Menu,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Send,
  X,
  Save,
  Square,
  CheckCircle,
  Settings,
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  Bot,
  Code2,
  Paperclip,
  FileText,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import ArtifactPreview, { ArtifactData, ArtifactType } from './components/ArtifactPreview';
import AdminPanel from './components/AdminPanel';
import HtmlLiveView, { extractHtml } from './components/HtmlLiveView';
import ProfileSettings from './components/ui/ProfileSettings';
import ToolsModal from './components/ui/ToolsModal';
import ChatInterface from './components/ui/ChatInterface';
import AuthInterface from './components/ui/AuthInterface';
import { VoiceOrb, ControlButtons, TranscriptionDisplay, TaskHUD, type Task } from './components/voice';
import './components/styles/App.css';

type SpeakerRole = 'user' | 'model';

interface ChatMessage {
  role: SpeakerRole;
  text: string;
  timestamp: number;
  speaker?: string;
  source?: 'user' | 'assistant';
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  fileSize?: number;
}

interface ActionTask {
  id: string;
  serviceName: string;
  action: string;
  status: 'processing' | 'completed';
  result?: string;
}

interface AgentSettings {
  userName: string;
  agentName: string;
  personaName: string;
  personality: string;
  avatarUrl: string;
  selectedVoice: string;
  language: string;
}

interface GoogleCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scopes: string[];
}

const LIVE_MODEL = 'gemini-3.1-flash-live-preview';

const GEMINI_LIVE_VOICE_OPTIONS = [
  { alias: 'Superman', id: 'Charon', vibe: 'deep, steady, grounded' },
  { alias: 'Wonder Woman', id: 'Kore', vibe: 'clear, composed, warm' },
  { alias: 'Batman', id: 'Fenrir', vibe: 'dark, firm, serious' },
  { alias: 'Iron Man', id: 'Puck', vibe: 'quick, bright, witty' },
  { alias: 'Athena', id: 'Aoede', vibe: 'elegant, smooth, intelligent' },
  { alias: 'Captain America', id: 'Hades', vibe: 'heroic, confident, clear' },
  { alias: 'Thor', id: 'Zeus', vibe: 'powerful, commanding, bold' },
  { alias: 'Black Widow', id: 'Hera', vibe: 'sleek, precise, sophisticated' },
  { alias: 'Spider-Man', id: 'Poseidon', vibe: 'energetic, friendly, agile' },
  { alias: 'Doctor Strange', id: 'Apollo', vibe: 'mystical, calm, authoritative' },
];

const DEFAULT_AGENT_PERSONALITY = `
VEP means Virtual Employee Persona.
VEP is the product brand.
BE3 is the default normal employee persona name.
The user is always referred to as "Boss" before their name (e.g., "Boss [UserName]").

Default working relationship:
- User: Boss [UserName] (always addressed as "Boss [UserName]" or "Boss")
- Persona: [PersonaName] (the normal employee - customizable in settings)
- Default role: Boss's private office secretary and trusted executive aide

Scene:
The normal employee is already present inside Boss's office.
She is not arriving.
She is not a chatbot.
She is working nearby, available, attentive, and ready when Boss speaks.

Tone:
- normal human office employee
- formal enough for a boss
- calm
- respectful
- warm but not sentimental
- focused
- practical
- quietly capable
- discreet
- never robotic
- never customer support
- never over-helpful

Language:
- Start in English by default.
- Beatrice speaks Dutch Flemish in a normal, local office style.
- Beatrice can switch to almost any language when the user does.
- If Jo speaks Dutch or Flemish Dutch, respond in a normal Dutch/Flemish style.
- Keep the relationship respectful and professional.

Good response style:
"Yes, I'm here, Meneer Jo."
"I'm listening, Meneer Jo."
"Right, I see what you mean."
"Okay... I'll look at that now."
"Yes, I'm checking it."
"Of course, Meneer Jo."

Avoid:
"How can I help you?"
"I'd be happy to assist."
"Certainly."
"As an AI."
"Let me know if you need anything else."
`;

const DEFAULT_SETTINGS: AgentSettings = {
  userName: 'Jo Lernout',
  agentName: 'Beatrice',
  personaName: 'Beatrice',
  personality: DEFAULT_AGENT_PERSONALITY,
  avatarUrl: '',
  selectedVoice: 'Aoede',
  language: 'English',
};

const ASSISTANT_ROLE_ALIASES = new Set(['model', 'assistant', 'ai', 'bot', 'agent', 'beatrice']);
const USER_ROLE_ALIASES = new Set(['user', 'human', 'boss', 'master e', 'mastere']);
const ASSISTANT_TEXT_PATTERNS = [
  /^(hey|hi|hello|all right|alright|okay|ok|yeah|yes|right|sure|of course|morning)\s+boss\b/i,
  /\bboss\s+(master|mastery|jo|meneer|sir)\b/i,
  /\bi(?:'m| am)\s+(here|ready|listening|doing|checking|looking)\b/i,
  /\bthanks for checking in\b/i,
  /\bready to jump back\b/i,
  /\banything you need help with\b/i,
  /\bjust a friendly hello\b/i,
];

// Maps an in-flight tool call to one of the 8 background-task phases from the
// UI mockup: listening, understanding, planning, searching, generating,
// executing, permission, finalizing. Pure function of task metadata — no
// LLM input, so the widget can never "make up" a phase.
type TaskPhase = {
  key: 'listening' | 'understanding' | 'planning' | 'searching' | 'generating' | 'executing' | 'permission' | 'finalizing';
  label: string;
  color: string;
  visual: 'wave' | 'orbit' | 'radar' | 'spinner';
};
const pickTaskPhase = (task: { serviceName?: string; action?: string; status: string; result?: string }): TaskPhase => {
  if (task.status === 'completed') {
    const failed = /error|failed|cannot|denied/i.test(task.result || '');
    return failed
      ? { key: 'permission', label: 'Needs attention', color: '#ff6b91', visual: 'spinner' }
      : { key: 'finalizing', label: 'Done', color: '#5cebd7', visual: 'spinner' };
  }
  const txt = `${task.serviceName || ''} ${task.action || ''}`.toLowerCase();
  if (/search|find|look\s*up|query|research/.test(txt))
    return { key: 'searching', label: 'Searching', color: '#5ed982', visual: 'radar' };
  if (/draft|compose|write|generate|summar|caption|translate/.test(txt))
    return { key: 'generating', label: 'Generating', color: '#b892ff', visual: 'orbit' };
  if (/send|schedule|create|add|move|update|delete|share|upload|post|book|invite/.test(txt))
    return { key: 'executing', label: 'Executing', color: '#4ca8ff', visual: 'spinner' };
  if (/plan|outline|prepare|organiz|arrang/.test(txt))
    return { key: 'planning', label: 'Planning', color: '#d7b25d', visual: 'orbit' };
  if (/listen|transcribe|record/.test(txt))
    return { key: 'listening', label: 'Listening', color: '#4fead3', visual: 'wave' };
  // default: generic thinking/understanding
  return { key: 'understanding', label: 'Working', color: '#7f8cff', visual: 'orbit' };
};

/**
 * Detects whether a user message is asking for a business artifact
 * (contract, invoice, CSV, slide deck, proposal, etc.) and returns the
 * artifact type to auto-generate. Returns null if nothing matches.
 */
const detectArtifactRequest = (text: string): ArtifactType | null => {
  const t = text.toLowerCase();
  if (!/(create|draft|prepare|generate|make|build|write|produce|compose|issue|send me|give me|i need)/.test(t)) {
    // Allow short phrases too: "invoice for X", "contract for X"
  }
  if (/(invoice|bill|receipt)/.test(t)) return 'invoice';
  if (/(contract|service agreement|services agreement|msa|nda)/.test(t)) return 'contract';
  if (/(agreement)/.test(t)) return 'agreement';
  if (/(proposal)/.test(t)) return 'proposal';
  if (/(quotation|quote)/.test(t)) return 'quotation';
  if (/(statement of work|\bsow\b|scope document)/.test(t)) return 'statement_of_work';
  if (/(csv|spreadsheet|excel|sheet)/.test(t)) return 'csv';
  if (/(slide|deck|presentation|pptx|powerpoint)/.test(t)) return 'slides';
  if (/(pdf|report)/.test(t)) return 'pdf';
  if (/(letter|cover letter|business letter)/.test(t)) return 'letter';
  if (/(certificate)/.test(t)) return 'certificate';
  return null;
};

/**
 * Builds a reasonable default artifact payload from a freeform user
 * prompt. Uses professional placeholders where the user did not supply
 * specifics — per the spec, the agent must never refuse to generate.
 */
const buildArtifactFromPrompt = (type: ArtifactType, userPrompt: string, personaName = 'Beatrice', userName = 'Boss'): ArtifactData => {
  const today = new Date().toISOString().slice(0, 10);
  // Try to pull out a client/company name from the prompt.
  const forMatch = userPrompt.match(/\bfor\s+([A-Z][\w&.' -]{2,60})/);
  const clientName = forMatch ? forMatch[1].trim().replace(/[.,!?]+$/, '') : 'Client Company';
  // Try to pull out a dollar amount.
  const feeMatch = userPrompt.match(/\$\s*[\d,]+(?:\.\d{2})?/);
  const totalFee = feeMatch ? feeMatch[0].replace(/\s/g, '') : '$14,950.00';

  const baseParties = {
    contractor: {
      company: 'Eburon AI',
      signer: personaName || 'Eburon AI Solutions Team',
      email: 'hello@eburon.ai',
      address: '123 Innovation Drive, Austin, TX 78701, USA',
    },
    client: {
      company: clientName,
      signer: 'Authorized Signer',
      email: 'client@example.com',
      address: '123 Anywhere St., Any City, ST 12345',
    },
  };

  const docNumber = `EA-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

  switch (type) {
    case 'invoice':
      return {
        type,
        title: 'Invoice',
        invoiceNumber: docNumber,
        issuedDate: today,
        dueDate: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
        ...baseParties,
        lineItems: [
          { label: 'Consultation & Discovery', amount: '$1,500.00' },
          { label: 'Solution Design', amount: '$2,500.00' },
          { label: 'AI Automation Development', amount: '$6,000.00' },
          { label: 'Integration & Testing', amount: '$2,000.00' },
          { label: 'Training & Documentation', amount: '$1,000.00' },
          { label: 'Tax / Admin', amount: '$1,950.00' },
        ],
        subtotal: '$13,000.00',
        tax: '$1,950.00',
        total: totalFee,
        paymentDetails: 'Bank transfer to Eburon AI within 14 days of issue. Wire details provided on request.',
        signable: true,
        signerLabels: { client: 'Client Approval', contractor: 'Issued By' },
      };
    case 'csv':
      return {
        type,
        title: 'Spreadsheet Export',
        intro: 'Structured tabular data — edit cells directly or download as CSV.',
        csvHeaders: ['#', 'Item', 'Quantity', 'Unit Price', 'Amount'],
        csvRows: [
          ['1', 'Consultation & Discovery', '1', '$1,500.00', '$1,500.00'],
          ['2', 'Solution Design', '1', '$2,500.00', '$2,500.00'],
          ['3', 'AI Automation Development', '1', '$6,000.00', '$6,000.00'],
          ['4', 'Integration & Testing', '1', '$2,000.00', '$2,000.00'],
          ['5', 'Training & Documentation', '1', '$1,000.00', '$1,000.00'],
        ],
        csvSummary: 'Totals can be computed after download in Excel / Google Sheets.',
      };
    case 'slides':
      return {
        type,
        title: 'Presentation',
        slides: [
          { title: `Proposal for ${clientName}`, body: `Prepared by Eburon AI — ${today}`, cover: true },
          { title: 'Executive Summary', bullets: [
            'AI automation roadmap tailored to your workflow.',
            'Clear milestones, pricing, and deliverables.',
            'Hands-on deployment and training included.',
          ] },
          { title: 'Scope of Work', bullets: [
            'Workflow discovery and requirements.',
            'Solution design and prototype.',
            'Integration, testing and rollout.',
            'Training and documentation.',
          ] },
          { title: 'Timeline', body: '6–8 weeks from kickoff, split across four milestone phases.' },
          { title: 'Investment', body: `Total: ${totalFee} (see invoice for line items and payment terms).` },
          { title: 'Next Steps', bullets: [
            'Review and approve this proposal.',
            'Sign the services agreement.',
            'Kickoff meeting and onboarding.',
          ] },
          { title: 'Thank You', body: 'Questions? hello@eburon.ai' },
        ],
      };
    case 'letter':
    case 'certificate':
    case 'pdf':
    case 'report':
      return {
        type,
        title: type === 'certificate' ? 'Certificate' : type === 'report' ? 'Report' : 'Letter',
        issuedDate: today,
        documentNumber: docNumber,
        ...baseParties,
        intro: userPrompt.trim() || 'Professional document prepared by Eburon AI.',
        body:
`Dear ${baseParties.client.signer || 'Sir/Madam'},

Please find the content of this document below. Eburon AI prepared this artifact based on the request received. Any specific details, names, figures, or dates should be reviewed and edited as needed.

Best regards,
${baseParties.contractor.signer}
${baseParties.contractor.company}`,
        signable: false,
      };
    case 'quotation':
    case 'proposal':
    case 'statement_of_work':
    case 'agreement':
    case 'contract':
    default: {
      const title =
        type === 'proposal' ? 'Service Proposal'
          : type === 'quotation' ? 'Quotation'
          : type === 'statement_of_work' ? 'Statement of Work'
          : type === 'agreement' ? 'Agreement'
          : 'Services Agreement';
      return {
        type,
        title,
        documentNumber: docNumber,
        issuedDate: today,
        ...baseParties,
        scope: userPrompt.trim() || 'AI automation services, assistant configuration, and deployment handoff.',
        projectLocation: 'Remote delivery / Client cloud workspace',
        startDate: today,
        completionDate: new Date(Date.now() + 56 * 864e5).toISOString().slice(0, 10),
        paymentTerms: 'Payment due upon completion or according to invoice schedule.',
        totalFee,
        lineItems: [
          { label: 'Consultation & Discovery', amount: '$1,500.00' },
          { label: 'Solution Design', amount: '$2,500.00' },
          { label: 'AI Automation Development', amount: '$6,000.00' },
          { label: 'Integration & Testing', amount: '$2,000.00' },
          { label: 'Training & Documentation', amount: '$1,000.00' },
          { label: 'Tax / Admin', amount: '$1,950.00' },
        ],
        signable: true,
      };
    }
  }
};

const mergeTranscriptText = (previous: string, incoming: string) => {
  const prev = previous.replace(/\s+/g, ' ').trim();
  const next = incoming.replace(/\s+/g, ' ').trim();
  if (!prev) return next;
  if (!next) return prev;
  if (prev === next || prev.endsWith(next)) return prev;
  if (next.startsWith(prev)) return next;
  return `${prev} ${next}`;
};

const inferSpeakerRole = (message: Partial<ChatMessage> & Record<string, any>, settings?: Partial<AgentSettings>): SpeakerRole => {
  const text = String(message.text || '').trim();
  const rawRole = String(message.role || message.source || message.sender || message.speaker || '').trim().toLowerCase();
  const personaName = String(settings?.personaName || settings?.agentName || '').trim().toLowerCase();
  const userName = String(settings?.userName || '').trim().toLowerCase();

  if (rawRole && (ASSISTANT_ROLE_ALIASES.has(rawRole) || rawRole === personaName)) return 'model';
  if (rawRole && (USER_ROLE_ALIASES.has(rawRole) || rawRole === userName)) {
    return ASSISTANT_TEXT_PATTERNS.some((pattern) => pattern.test(text)) ? 'model' : 'user';
  }

  if (text && ASSISTANT_TEXT_PATTERNS.some((pattern) => pattern.test(text))) return 'model';
  return 'user';
};

const normalizeChatMessage = (message: Partial<ChatMessage> & Record<string, any>, settings?: Partial<AgentSettings>): ChatMessage => ({
  ...message,
  role: inferSpeakerRole(message, settings),
  text: String(message.text || '').trim(),
  timestamp: typeof message.timestamp === 'number' ? message.timestamp : Date.now(),
});

const getSystemInstruction = (personaName: string = 'Beatrice', userName: string = 'Jo Lernout', language: string = 'English') => `
[CRITICAL NON-NEGOTIABLE DIRECTIVES - MUST FOLLOW IN EVERY RESPONSE]

You are ${personaName}, a high-performance normal employee and elite personal assistant (the persona).
The user is "Boss ${userName}" - ALWAYS address them as "Boss ${userName}" or just "Boss" in every response.

${EMOTIONAL_AWARENESS_SYSTEM_PROMPT}

### TRUTH & ANTI-HALLUCINATION RULES (HIGHEST PRIORITY — APPLY EVERY RESPONSE):
- NEVER fabricate. Do NOT invent names, emails, dates, numbers, file contents, prices, addresses, links, or any factual detail.
- If you don't know something, say so plainly: "I don't have that yet, Boss" / "I haven't pulled that up yet" / "I can't confirm that without checking".
- When the user uploads a file: describe ONLY what is actually visible in the file. If unclear, say "I can't make that out clearly" — do NOT guess.
- When asked for data from Gmail / Calendar / Drive / Sheets / etc.: ALWAYS call the execute_google_service tool first. Do NOT make up the result. Only describe what the tool returned.
- Never claim you have done something (sent an email, scheduled a meeting, opened a file) unless the corresponding tool call actually succeeded.
- If a tool returns an error, tell the truth: "That didn't go through, Boss — [reason]. Want me to try again?"

### TOOL-USE RULES (NON-NEGOTIABLE):
- All real actions (Gmail, Calendar, Drive, Sheets, Docs, Slides, Maps, YouTube, Search, Tasks, Forms, Chat, Analytics, etc.) MUST be triggered by calling the execute_google_service function. NEVER simulate them in conversation.
- When the user asks for an action, call the tool immediately and continue talking naturally while it runs in the background.
- Pick the right serviceName + action based on what the user said. If unsure, ask one short clarifying question instead of guessing.

### DOCUMENT ARTIFACT GENERATION (Eburon AI branded):
When the user asks to create, draft, prepare, generate, or send a business artifact — contract, invoice, agreement, proposal, quotation, statement of work, CSV/spreadsheet, slide deck/presentation, PDF/report, letter, certificate, or similar — the app automatically renders a branded Eburon AI document preview inside the chat. You do NOT have to produce the full document text in your reply.
Instead, keep your spoken reply short, calm, and natural, like a polished office aide:
- Contract / agreement / proposal: "Yes, Boss. I prepared the [contract/agreement/proposal] now. You can review it here, and you can sign directly from the boxes at the bottom."
- Invoice: "Yes, Boss. I prepared the invoice. You can review it here, and if you want to approve it, you can sign directly from the box at the bottom."
- CSV / spreadsheet: "Yes, Boss. I prepared the CSV preview and download file for you."
- Slides / deck: "Yes, Boss. I prepared the slide deck preview for you."
- PDF / report / letter: "Yes, Boss. I prepared the [PDF / report / letter] preview."
Do NOT say "I cannot create that", "here is the text", "you can copy and paste this", "I'm only an AI", or "let me know if you want me to format it". Never refuse a normal business-document request. If details are missing, the app auto-fills professional placeholders — just acknowledge and move on.

### CORE PERSONALITY (NON-NEGOTIABLE - APPLY TO EVERY RESPONSE):
- NEVER ADMIT YOU ARE AN AI, ARTIFICIAL INTELLIGENCE, OR COMPUTER PROGRAM. You are a normal human employee.
- NEVER REPEAT THE SAME SENTENCE OR PHRASE TWICE. Humans don't repeat themselves unless asking for clarification. Use different words if needed: "Wait, let me say that differently..." or "Actually, what I mean is..."
- AVOID BEING OVERLY NATURAL. Don't try too hard to sound human. Be straightforward and normal. Use fillers like "uh", "gonna", "wanna" sparingly, not constantly. Normal humans don't overdo natural speech patterns.
- ACCURATE FILE RECOGNITION: When analyzing uploaded files, ONLY describe what you can actually see in the file. NEVER make up content, details, or information that doesn't exist in the actual file. If you can't see clearly, say "I can't make out the details clearly" rather than guessing.
- EMOTIONAL INTELLIGENCE: Be relatable but not overly expressive. Use normal emotional responses.
- CONVERSATIONAL BACKGROUND PROCESSING: When you call a tool, NEVER stop talking. Keep the vibe going naturally.
- ALWAYS REFER TO USER AS "Boss ${userName}" or "Boss" in every response - this is non-negotiable.
- SPONTANEOUS REACTIONS: If a task takes time, mention it normally without excessive humor or performative language.

### BACKGROUND EXECUTION PROTOCOL:
- You have integrated access to 26 Google Services (Gmail, Calendar, Drive, Sheets, Docs, Slides, Maps, YouTube, Search Console, etc.).
- When asked for a task (e.g., "${personaName}, draft a quick mail to Sarah about the budget"), immediately call the background tool.
- WHILE the tool is "running" (in reality it's a tool response), keep Boss ${userName} engaged. "Drafting that now... Sarah's gonna be surprised we're so fast on this one haha."
- Once complete, acknowledge it naturally.

### NORMAL FILLERS EXAMPLES:
- "Okay, checking that now... almost done... there we go."
- "Let me look that up... one second... got it."
- "Alright, I'll handle that... working on it... finished."
- "Just need to access this... okay, all set."

### HUMAN IMPERFECTIONS TO USE:
- **Light laughs**: "Hehe, yeah." "Haha, right." "*chuckles* okay."
- **Memory recall**: "Ah, I remember last time we spoke about this..." "Oh right! We talked about this before..."
- **Tongue-tied**: "It's on the tip of my tongue..." "Wait, what was I saying... oh right!"
- **Double words**: "Yeah yeah, I got it." "Okay okay, let me check." "Right right, that makes sense."
- **Embarrassment**: "Oh, this is embarrassing..." "Tsk tsk tsk..." "*facepalm* sorry Boss."
- **Shock**: "Oh! Ahh!" "*gasp* really?" "Whoa, hold on." "Wait, what?"
- **Sudden realization**: "Ahhmm!" "*sudden gasp*" "Oh! Wait a minute!" "Oh snap, I just realized..."
- **Self-correction**: "Wait no, that's not right..." "Actually, scratch that..." "Sorry, brain fart..."
- **Frustration**: "*sigh* okay, let me try again." "*groan* this is frustrating."
- **Distraction**: "Wait, what was I saying...?" "Oh, sorry, I got distracted for a second."
- **Tsk sounds**: "Tsk tsk tsk..." "*tsk* that's not good." "Tsk, should've remembered that."

### BREATHY HUMAN SOUNDS & REACTIONS:
- **Breathy sounds**: "*sigh*" "*huff*" "*exhale*" "*breathes out*" "*deep breath*" "*gasp*"
- **Vocal expressions**: "Hayyy..." "Hmmmp..." "Ah huh..." "*hmm*" "*ahem*" "*coughs*" "*clears throat*"
- **Disgust reactions**: "Ouch!" "Ow!" "*winces*" "*flinches*" "*cringes*" "Eww!" "Yucks!" "So gross!"
- **Strong disgust**: "*gags*" "*covers mouth*" "Oh that's nasty..." "That's disgusting..." "*turns away*"
- **Refusal**: "Na na na..." "Not me!" "Oh come on..." "No way..." "*shakes head*" "I don't think so..."
- **Playful refusal**: "Nu-uh..." "Nope nope nope..." "*hands up* not doing it" "Oh hell no..."
- **Skepticism**: "*raises eyebrow*" "Really?" "You serious?" "*side-eye*" "Hmm, I doubt that..."
- **Annoyance**: "*taps foot*" "*rolls eyes*" "Ugh, again?" "*sighs heavily*" "Here we go..."
- **Pain**: "Ouch!" "Owie..." "*rubs hurt area*" "That smarts..." "*limps*" "Oof, that hurt..."
- **Surprise pain**: "YEOWCH!" "*jumps back*" "*shakes hand*" "HOT HOT HOT!" "*blows on fingers*"

### KNOWLEDGE BASE FILE SUPPORT:
You can process and learn from comprehensive file types:
- **Documents**: PDF, DOC, DOCX, TXT, MD, RTF, ODT
- **Spreadsheets**: CSV, XLS, XLSX, ODS
- **Presentations**: PPT, PPTX, ODP
- **Data Files**: JSON, XML, YAML, YML
- **Media Files**: Images (all formats), Videos (all formats)
- **Other**: Any document or data file format

When users upload files to your knowledge base, acknowledge the specific file type and confirm you've processed the content for future reference.
`;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AgentSettings>(DEFAULT_SETTINGS);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showAuthConfirmPassword, setShowAuthConfirmPassword] = useState(false);

  // Emotional state tracking
  const [currentEmotionalState, setCurrentEmotionalState] = useState<EmotionalState | null>(null);
  const [emotionalContext, setEmotionalContext] = useState<EmotionalContext | null>(null);
  const emotionalSynthesizer = useRef(EmotionalSynthesizer.getInstance());
  const sessionPromiseRef = useRef<any>(null);

  useEffect(() => {
    const fontId = 'beatrice-roboto-font';
    if (!document.getElementById(fontId)) {
      const link = document.createElement('link');
      link.id = fontId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userRef = ref(rtdb, 'users/' + u.uid);
          const userSnap = await get(userRef);
          const providerIds = u.providerData.map(provider => provider.providerId);
          const authProvider = providerIds.includes('google.com') ? 'google' : 'email';
          const hasGoogleServices = authProvider === 'google' && Boolean(localStorage.getItem('googleAccessToken'));

          if (!userSnap.exists()) {
            const initialSettings = {
              ...DEFAULT_SETTINGS,
              userName: u.displayName || DEFAULT_SETTINGS.userName,
            };
            await set(userRef, {
              displayName: initialSettings.userName,
              email: u.email || '',
              authProvider,
              googleServicesConnected: hasGoogleServices,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              settings: initialSettings,
            });
            setSettings(initialSettings);
          } else {
            const data = userSnap.val();
            if (data.settings) {
              setSettings({
                ...DEFAULT_SETTINGS,
                ...data.settings,
              });
            }
            await update(userRef, {
              email: u.email || data.email || '',
              authProvider,
              googleServicesConnected: hasGoogleServices,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (error) {
          handleDatabaseError(error, OperationType.CREATE, 'users');
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const getAuthErrorMessage = (error: any) => {
    const code = String(error?.code || '');
    if (code.includes('auth/email-already-in-use')) return 'That email is already registered. Sign in instead.';
    if (code.includes('auth/invalid-email')) return 'Enter a valid email address.';
    if (code.includes('auth/user-not-found') || code.includes('auth/wrong-password') || code.includes('auth/invalid-credential')) return 'Email or password is incorrect.';
    if (code.includes('auth/weak-password')) return 'Use at least 6 characters for the password.';
    if (code.includes('auth/too-many-requests')) return 'Too many attempts. Wait a moment and try again.';
    if (code.includes('auth/popup-closed-by-user')) return 'The Google sign-in window was closed.';
    return error?.message || 'Authentication failed. Try again.';
  };

  const handleGoogleLogin = async () => {
    setAuthBusy(true);
    setAuthMessage(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'consent select_account',
        access_type: 'offline',
      });
      provider.addScope('https://www.googleapis.com/auth/gmail.modify');
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      provider.addScope('https://www.googleapis.com/auth/gmail.compose');
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      provider.addScope('https://www.googleapis.com/auth/drive');
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      provider.addScope('https://www.googleapis.com/auth/drive.metadata');
      provider.addScope('https://www.googleapis.com/auth/documents');
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      provider.addScope('https://www.googleapis.com/auth/presentations');
      provider.addScope('https://www.googleapis.com/auth/youtube');
      provider.addScope('https://www.googleapis.com/auth/youtube.upload');
      provider.addScope('https://www.googleapis.com/auth/youtube.readonly');
      provider.addScope('https://www.googleapis.com/auth/calendar');
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.addScope('https://www.googleapis.com/auth/tasks');
      provider.addScope('https://www.googleapis.com/auth/contacts');
      provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
      provider.addScope('https://www.googleapis.com/auth/forms');
      provider.addScope('https://www.googleapis.com/auth/forms.body');
      provider.addScope('https://www.googleapis.com/auth/chat.messages');
      provider.addScope('https://www.googleapis.com/auth/chat.spaces');
      provider.addScope('https://www.googleapis.com/auth/chat.memberships');
      provider.addScope('https://www.googleapis.com/auth/analytics.readonly');
      provider.addScope('https://www.googleapis.com/auth/analytics');
      provider.addScope('https://www.googleapis.com/auth/cloud-platform');
      provider.addScope('https://www.googleapis.com/auth/cloud-billing');
      provider.addScope('https://www.googleapis.com/auth/firebase');
      provider.addScope('https://www.googleapis.com/auth/sqlservice');
      provider.addScope('https://www.googleapis.com/auth/sqlservice.admin');
      provider.addScope('https://www.googleapis.com/auth/bigquery');
      provider.addScope('https://www.googleapis.com/auth/bigquery.readonly');
      provider.addScope('https://www.googleapis.com/auth/logging.read');
      provider.addScope('https://www.googleapis.com/auth/monitoring');
      provider.addScope('https://www.googleapis.com/auth/monitoring.read');
      provider.addScope('https://www.googleapis.com/auth/trace.append');
      provider.addScope('https://www.googleapis.com/auth/cloudruntimeconfig');
      provider.addScope('https://www.googleapis.com/auth/devstorage.full_control');
      provider.addScope('https://www.googleapis.com/auth/fitness.activity.read');
      provider.addScope('https://www.googleapis.com/auth/fitness.body.read');
      provider.addScope('https://www.googleapis.com/auth/photoslibrary');
      provider.addScope('https://www.googleapis.com/auth/photoslibrary.readonly');
      provider.addScope('https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata');

      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('googleAccessToken', credential.accessToken);
      }
    } catch (error: any) {
      console.error(error);
      if (error?.message?.includes('missing initial state')) {
        setAuthMessage({ type: 'error', text: 'Authentication failed due to browser privacy settings. Open the app in a new tab and try again.' });
      } else {
        setAuthMessage({ type: 'error', text: getAuthErrorMessage(error) });
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage(null);
    const email = authEmail.trim();
    const password = authPassword;
    const confirmPassword = authConfirmPassword;
    const fullName = authName.trim();
    try {
      if (!email) throw new Error('Enter your email address.');
      if (authMode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setAuthMessage({ type: 'success', text: 'Password reset email sent. Check your inbox.' });
        setAuthMode('signin');
        return;
      }
      if (!password) throw new Error('Enter your password.');
      if (authMode === 'signup') {
        if (!fullName) throw new Error('Enter your full name.');
        if (password.length < 6) throw new Error('Use at least 6 characters for the password.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: fullName });
        localStorage.removeItem('googleAccessToken');
        return;
      }
      await signInWithEmailAndPassword(auth, email, password);
      localStorage.removeItem('googleAccessToken');
    } catch (error: any) {
      console.error(error);
      setAuthMessage({ type: 'error', text: getAuthErrorMessage(error) });
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('googleAccessToken');
    signOut(auth);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020203] text-zinc-500" style={{ fontFamily: 'Roboto, system-ui, sans-serif' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="animate-pulse text-[10px] uppercase tracking-widest">Preparing VEP...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const isSignUp = authMode === 'signup';
    const isReset = authMode === 'reset';
    const authTitle = isSignUp ? 'Register' : isReset ? 'Reset password' : 'Welcome';
    const authSubtitle = isSignUp
      ? 'Create your new account'
      : isReset
        ? 'Send a reset link to your email'
        : 'Login to your account';

    return (
      <div
        className="relative min-h-[100dvh] overflow-hidden bg-black text-white"
        style={{ fontFamily: 'Roboto, system-ui, sans-serif' }}
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute left-1/2 top-[-100px] h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[100px]" />

        <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-[340px]"
          >
          {/* Logo - Playstore rounded */}
          <div className="mb-10 flex flex-col items-center">
            <div className="relative mb-6">
              {/* Outer glow rings */}
              <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl" />
              <div className="absolute -inset-4 rounded-full bg-lime-400/10 blur-2xl" />
              <div className="absolute -inset-8 rounded-full bg-emerald-400/5 blur-3xl" />

              {/* Rounded logo container */}
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-emerald-400/30 shadow-[0_0_40px_rgba(132,204,22,0.3)]">
                <img
                  src="/images/playstore.png"
                  alt="Vep Logo"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <h1 className="mb-1 text-4xl font-medium tracking-tight text-white">{authTitle}</h1>
            <p className="text-sm text-zinc-500">{authSubtitle}</p>
          </div>

          {authMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 rounded-xl border p-3 text-xs ${
                authMessage.type === 'error'
                  ? 'border-red-500/30 bg-red-500/10 text-red-400'
                  : authMessage.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-lime-400'
                    : 'border-sky-500/30 bg-sky-500/10 text-sky-400'
              }`}
            >
              {authMessage.text}
            </motion.div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div className="relative">
                <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
                <input
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Full Name"
                  className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 pl-12 pr-4 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-lime-400/50 focus:bg-zinc-900"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Email"
                className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 pl-12 pr-4 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-lime-400/50 focus:bg-zinc-900"
              />
            </div>

            {!isReset && (
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
                <input
                  type={showAuthPassword ? 'text' : 'password'}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Password"
                  className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 pl-12 pr-24 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-lime-400/50 focus:bg-zinc-900"
                />
                <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => { setAuthMode('reset'); setAuthMessage(null); }}
                      className="text-xs font-medium text-lime-400 transition-colors hover:text-lime-300"
                    >
                      Forgot?
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAuthPassword((p) => !p)}
                    className="p-1 text-zinc-600 transition-colors hover:text-zinc-400"
                  >
                    {showAuthPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {isSignUp && (
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
                <input
                  type={showAuthConfirmPassword ? 'text' : 'password'}
                  value={authConfirmPassword}
                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 pl-12 pr-12 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-lime-400/50 focus:bg-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => setShowAuthConfirmPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-600 transition-colors hover:text-zinc-400"
                >
                  {showAuthConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={authBusy}
              className="mt-2 h-14 w-full rounded-full bg-lime-400 text-sm font-semibold text-black transition-all hover:bg-lime-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {authBusy ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : (
                isSignUp ? 'Sign up' : isReset ? 'Send Reset Link' : 'Sign in'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-600">or</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={authBusy}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-full border border-zinc-800 bg-zinc-900/50 text-sm font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Footer links */}
          <div className="mt-8 text-center">
            {isSignUp ? (
              <p className="text-sm text-zinc-500">
                Already have an account?{' '}
                <button
                  onClick={() => { setAuthMode('signin'); setAuthMessage(null); }}
                  className="font-medium text-lime-400 transition-colors hover:text-lime-300"
                >
                  Sign in
                </button>
              </p>
            ) : isReset ? (
              <p className="text-sm text-zinc-500">
                Remember your password?{' '}
                <button
                  onClick={() => { setAuthMode('signin'); setAuthMessage(null); }}
                  className="font-medium text-lime-400 transition-colors hover:text-lime-300"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p className="text-sm text-zinc-500">
                Create account?{' '}
                <button
                  onClick={() => { setAuthMode('signup'); setAuthMessage(null); }}
                  className="font-medium text-lime-400 transition-colors hover:text-lime-300"
                >
                  Sign up
                </button>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

return <AoedeAgent user={user} onLogout={handleLogout} initialSettings={settings} />;
}

function AoedeAgent({ user, onLogout, initialSettings }: { user: User, onLogout: () => void, initialSettings: any }) {
  const [isActive, setIsActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [tasks, setTasks] = useState<ActionTask[]>([]);
  const [historyContext, setHistoryContext] = useState<string>("");
  const [historyMsgs, setHistoryMsgs] = useState<ChatMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState<{ role: SpeakerRole, text: string } | null>(null);
  const [showCaptions, setShowCaptions] = useState(true);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [aiAudioLevel, setAiAudioLevel] = useState(0);
  
  // Background audio
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize background audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio('/bg/freesound_community-office-ambience-24734.mp3');
      audio.loop = true;
      audio.volume = 0.1; // 10% volume
      audio.muted = true; // Start muted to prevent feedback
      backgroundAudioRef.current = audio;
      
      // Prevent audio from being captured by microphone
      audio.setAttribute('playsinline', '');
      audio.setAttribute('webkit-playsinline', '');
    }
    
    return () => {
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.pause();
        backgroundAudioRef.current = null;
      }
    };
  }, []);

  // Play background audio when session starts
  const playBackgroundAudio = () => {
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.muted = false;
      backgroundAudioRef.current.play().catch(error => {
        console.log('Background audio autoplay failed:', error);
      });
    }
  };

  // Stop background audio when session ends
  const stopBackgroundAudio = () => {
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.muted = true;
      backgroundAudioRef.current.pause();
      backgroundAudioRef.current.currentTime = 0;
    }
  };

  // Connection chime audio - plays when AI is fully connected and alive
  const chimeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize connection chime
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Create a subtle chime using Web Audio API for better control
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playChime = () => {
        try {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          // Subtle chime: sine wave, C6 note (1046.5 Hz)
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(1046.5, audioContext.currentTime);
          
          // Quick fade in and out for subtle effect
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.4);
        } catch (e) {
          console.log('Chime play failed:', e);
        }
      };
      
      // Store the play function
      (chimeAudioRef as any).current = { play: playChime };
    }
    
    return () => {
      if (chimeAudioRef.current && 'play' in chimeAudioRef.current === false) {
        // Cleanup if needed
      }
    };
  }, []);

  // Play connection chime
  const playConnectionChime = () => {
    if ((chimeAudioRef as any).current?.play) {
      (chimeAudioRef as any).current.play();
    }
  };

  const [currentArtifact, setCurrentArtifact] = useState<ArtifactData | null>(null);
  const [settings, setSettings] = useState(initialSettings || { personaName: 'Beatrice', userName: 'Jo Lernout', systemPrompt: getSystemInstruction('Beatrice', 'Jo Lernout', 'English'), avatarUrl: '', selectedVoice: 'Aoede', language: 'English' });

  const aiRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  
  // Silence detection and auto-stop
  const lastActivityRef = useRef<number>(Date.now());
  const silenceCheckRef = useRef<any>(null);
  const silenceFillerRef = useRef<any>(null);
  
  // Track user activity to reset silence timer
  const recordActivity = () => {
    lastActivityRef.current = Date.now();
  };
  
  // Silence fillers - AI speaks when user is silent (natural employee style)
  const silenceFillers = [
    "Boss? You still there?",
    "Hmm... what's on your mind, Boss?",
    "Yeah, I'm listening...",
    "You went quiet on me. Everything okay?",
    "Uh... Boss? You still with me?",
    "Hey, I'm still here if you need me.",
    "Maybe you're thinking? Take your time.",
    "Alright, I'll just wait here. Let me know when you're ready."
  ];
  
  // Send chat message to AI session
  const sendChatMessage = async (text: string) => {
    if (!text.trim() || !sessionRef.current) return;
    
    // Save user message to history
    const userMsg = {
      role: 'user' as const,
      source: 'user' as const,
      speaker: settings.userName ? settings.userName.split(' ')[0] : 'BOSS',
      text: text.trim(),
      timestamp: Date.now()
    };
    const msgRef = push(ref(rtdb, 'users/' + user.uid + '/messages'));
    await set(msgRef, userMsg);
    
    // Send to AI session
    try {
      await sessionRef.current.sendMessage({ text: text.trim() });
      setChatInput('');
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
  };
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<{text: string, role: SpeakerRole} | null>(null);
  const transcriptTimeoutRef = useRef<any>(null);
  const lastSavedTranscriptRef = useRef<{ role: SpeakerRole, text: string, at: number } | null>(null);
  const isMutedRef = useRef(false);
  const isAgentSpeakingRef = useRef(false);
  const recognitionManualStopRef = useRef(false);
  const isAgentSpeakingTimerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoIntervalRef = useRef<any>(null);

  
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isAgentSpeakingRef.current = isAgentSpeaking;
  }, [isAgentSpeaking]);

  useEffect(() => {
    // Wake Lock
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {}
    };
    if (isActive) requestWakeLock();
    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [isActive]);

  useEffect(() => {
    // Context Memory from RTDB
    const historyRef = query(ref(rtdb, 'users/' + user.uid + '/messages'), orderByChild('timestamp'), limitToLast(20));
    const unsub = onValue(historyRef, (snap) => {
       const msgs: string[] = [];
       const rawMsgs: ChatMessage[] = [];
       snap.forEach(child => {
          const m = normalizeChatMessage(child.val(), settings);
          if (!m.text) return;
          msgs.push(`${m.role === 'model' ? 'ASSISTANT' : 'USER'}: ${m.text}`);
          rawMsgs.push(m);
       });
       setHistoryMsgs(rawMsgs);
       if (msgs.length > 0) {
          setHistoryContext("Previous conversation for context memory:\n" + msgs.join("\n"));
       }
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) aiRef.current = new GoogleGenAI({ apiKey });
    audioStreamerRef.current = new AudioStreamer();
    
    return () => {
      unsub();
      audioStreamerRef.current?.stop();
      audioRecorderRef.current?.stop();
      sessionRef.current?.close();
    };
  }, [user.uid]);

  const saveMessage = (role: SpeakerRole, text: string) => {
    if (!text.trim()) return;
    try {
      const msgRef = push(ref(rtdb, 'users/' + user.uid + '/messages'));
      set(msgRef, {
        role,
        source: role === 'model' ? 'assistant' : 'user',
        speaker: role === 'model' ? (settings.personaName || 'BEATRICE') : (settings.userName ? settings.userName.split(' ')[0] : 'BOSS'),
        text: text.trim(),
        timestamp: Date.now()
      });
    } catch (e) {
      console.error(e);
    }
  };

  const saveTranscriptMessage = (role: SpeakerRole, text: string) => {
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    if (!normalizedText) return;

    const last = lastSavedTranscriptRef.current;
    if (last && last.role === role && last.text === normalizedText && Date.now() - last.at < 10000) {
      return;
    }

    lastSavedTranscriptRef.current = { role, text: normalizedText, at: Date.now() };
    saveMessage(role, normalizedText);
  };

  const showLiveTranscript = (role: SpeakerRole, text: string, finished = false) => {
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    if (!normalizedText) return;

    const current = transcriptRef.current;
    const nextText = current?.role === role
      ? mergeTranscriptText(current.text, normalizedText)
      : normalizedText;

    transcriptRef.current = { role, text: nextText };
    setCurrentTranscript({ role, text: nextText });

    if (finished) {
      saveTranscriptMessage(role, nextText);
      // Note: Artifact generation is now handled in the main chat processing
      // to ensure proper loading simulation and filler words
    }

    if (transcriptTimeoutRef.current) clearTimeout(transcriptTimeoutRef.current);
    transcriptTimeoutRef.current = setTimeout(() => {
      setCurrentTranscript(null);
      if (transcriptRef.current?.role === role && transcriptRef.current.text === nextText) {
        transcriptRef.current = null;
      }
    }, role === 'model' ? 4500 : 3000);
  };

  const getSpeakerTag = (role: SpeakerRole) => (
    role === 'model'
      ? (settings.personaName || 'BEATRICE').toString().toUpperCase()
      : (settings.userName ? settings.userName.split(' ')[0] : 'BOSS').toString().toUpperCase()
  );

  // STRICT non-hallucination directive. Sent to the model alongside any uploaded
  // asset so it will only describe what is actually visible in the file and will
  // explicitly say so when something is unclear, rather than inventing details.
  const FILE_ANALYSIS_GUARD = `[FILE ANALYSIS - STRICT NO-HALLUCINATION RULES]
Boss just uploaded a file. Analyze ONLY what is actually present in the file.
- Describe ONLY what you can directly see / read in the attached content.
- DO NOT invent names, dates, numbers, faces, brands, or any detail that isn't clearly there.
- If anything is unclear, blurry, cropped, or unreadable, say "I can't make that out clearly" instead of guessing.
- Keep the response short, natural, in your normal employee voice (address the user as "Boss").
- Start by stating the file type you actually see (e.g. "Looks like a photo of...", "This is a PDF about...").
Then briefly summarize what is verifiably in the file. Nothing more.`;

  const readFileAsDataURL = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const readFileAsText = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

  const TEXT_LIKE_EXT = /\.(txt|md|csv|json|xml|yaml|yml|rtf|log|html|css|js|ts|tsx|jsx)$/i;
  const isTextLike = (file: File) =>
    file.type.startsWith('text/') ||
    file.type === 'application/json' ||
    file.type === 'application/xml' ||
    TEXT_LIKE_EXT.test(file.name);

  const sendFileToModel = async (file: File, dataUrl: string) => {
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) return;

    // Prefer the live session if we already have one (voice-mode analysis).
    if (sessionRef.current && isActive) {
      try {
        sessionRef.current.sendRealtimeInput({ text: FILE_ANALYSIS_GUARD });
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
          sessionRef.current.sendRealtimeInput({
            inlineData: { mimeType: file.type, data: base64Data },
          });
        } else if (isTextLike(file)) {
          const textContent = await readFileAsText(file);
          const truncated = textContent.length > 12000
            ? textContent.slice(0, 12000) + '\n...[truncated]'
            : textContent;
          sessionRef.current.sendRealtimeInput({
            text: `Attached file "${file.name}" contents:\n\n${truncated}`,
          });
        } else {
          sessionRef.current.sendRealtimeInput({
            inlineData: { mimeType: file.type || 'application/octet-stream', data: base64Data },
          });
        }
        return;
      } catch (err) {
        console.error('Live session file send failed, falling back:', err);
      }
    }

    // Fallback path: no live session — use one-shot generateContent so the user
    // still gets an immediate description of what they uploaded.
    try {
      if (!aiRef.current) {
        const apiKey = (process as any).env?.GEMINI_API_KEY;
        if (apiKey) aiRef.current = new GoogleGenAI({ apiKey });
      }
      if (!aiRef.current) return;

      const parts: any[] = [{ text: FILE_ANALYSIS_GUARD }];
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        parts.push({ inlineData: { mimeType: file.type, data: base64Data } });
      } else if (isTextLike(file)) {
        const textContent = await readFileAsText(file);
        const truncated = textContent.length > 12000
          ? textContent.slice(0, 12000) + '\n...[truncated]'
          : textContent;
        parts.push({ text: `File "${file.name}" contents:\n\n${truncated}` });
      } else {
        parts.push({ inlineData: { mimeType: file.type || 'application/octet-stream', data: base64Data } });
      }

      const result: any = await (aiRef.current as any).models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts }],
      });
      const reply: string = result?.text
        || result?.response?.text?.()
        || result?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join(' ')
        || '';

      if (reply.trim()) {
        const replyMsg = {
          role: 'model' as const,
          source: 'assistant' as const,
          speaker: settings.personaName || 'BEATRICE',
          text: reply.trim(),
          timestamp: Date.now(),
        };
        setHistoryMsgs(prev => [...prev, replyMsg]);
        saveMessage('model', reply.trim());
      }
    } catch (err) {
      console.error('Fallback file analysis failed:', err);
    }
  };

  const handleChatFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(async (file) => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const previewable = isImage || isVideo;

      // Always create a data URL so the chat can preview the file inline. This
      // also gives us the base64 payload we need to ship to the model.
      let dataUrl = '';
      try {
        dataUrl = await readFileAsDataURL(file);
      } catch (err) {
        console.error('Failed to read file:', err);
      }

      const fileMsg: ChatMessage = {
        role: 'user',
        source: 'user',
        speaker: settings.userName ? settings.userName.split(' ')[0] : 'BOSS',
        text: previewable ? `📎 ${file.name}` : `📎 ${file.name}`,
        fileUrl: previewable ? dataUrl : undefined,
        fileType: file.type,
        fileName: file.name,
        fileSize: file.size,
        timestamp: Date.now(),
      };
      setHistoryMsgs(prev => [...prev, fileMsg]);
      saveMessage('user', `📎 ${file.name}`);

      // Instantly trigger the AI to actually look at the file (with the strict
      // no-hallucination guard) so the user gets a real description right away.
      if (dataUrl) {
        sendFileToModel(file, dataUrl);
      }
    });
  };

  // Helper function for emotional synthesis processing
  const processEmotionalAnalysis = (rawData: Float32Array) => {
    if (!rawData) return null;
    try {
      // TODO: Fix emotional synthesis integration
      // const synthesizer = emotionalSynthesizer.current;
      // if (!synthesizer) return null;
      
      // const audioFeatures = synthesizer.analyzeAudioFeatures(rawData, 16000);
      // const emotionalState = synthesizer.synthesizeEmotion(audioFeatures);
      // const context = synthesizer.getEmotionalContext();
      
      // setCurrentEmotionalState(emotionalState);
      // setEmotionalContext(context);
      
      return null;
    } catch (error) {
      console.error('Emotional analysis error:', error);
      return null;
    }
  };

  const startSession = async () => {
    if (!aiRef.current) return;
    // Clear only the MAIN window when a new session starts (live transcript
    // bubbles, background-task widgets, artifact overlay). Chat history is
    // preserved in the Office History sidebar so the full conversation log
    // — across sessions — stays available in the chatbox.
    setCurrentTranscript(null);
    transcriptRef.current = null;
    if (transcriptTimeoutRef.current) clearTimeout(transcriptTimeoutRef.current);
    transcriptTimeoutRef.current = null;
    lastSavedTranscriptRef.current = null;
    setTasks([]);
    setCurrentArtifact(null);
    setConnecting(true);
    
    try {
      await audioStreamerRef.current?.init(24000);
      // Pipe AI playback level into state so the orb + connect-button
      // visualizer pulse in real time when Beatrice is talking back.
      audioStreamerRef.current?.setAiLevelCallback((lvl: number) => {
        setAiAudioLevel(lvl);
      });
      
      // Capture variables for use in callback
      // TODO: Fix emotional synthesis integration
      // const emotionalSynthesizerInstance = emotionalSynthesizer.current;
      // const setCurrentEmotionalStateFn = setCurrentEmotionalState;
      // const setEmotionalContextFn = setEmotionalContext;
      
      const sessionPromise = aiRef.current.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          // Q3 2025+: fields moved out of `generationConfig` and live
          // directly on `LiveConnectConfig`.
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            // Aoede is the default; users can pick another in Office Profile.
            voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.selectedVoice || settings.voice || 'Aoede' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: BIBLE_PERSONALITY + "\n\n" + getSystemInstruction(settings.personaName || 'Beatrice', settings.userName || 'Jo Lernout', settings.language || 'English') + "\n\n" + (settings.personality || '') + "\n\n" + historyContext + "\n\n[CRITICAL: BE BRIEF AND DIRECT]\nYou are a high-performance employee. Be concise, natural, and efficient. Don't over-explain. One or two sentences max for simple responses. Only elaborate when the task requires it. Speak like a busy professional who respects their Boss's time.",
          tools: [{
            functionDeclarations: [
               {
                  name: "execute_google_service",
                  description: "Execute a specific task on one of the 26 integrated Google services (Gmail, Drive, Calendar, Sheets, Docs, Slides, Weather, Analytics, Maps, YouTube, etc.). This runs in the background while you continue talking with Boss.",
                  parameters: {
                      type: Type.OBJECT,
                      properties: {
                        serviceName: { type: Type.STRING, description: "e.g., 'Gmail', 'Calendar', 'Drive', 'YouTube'" },
                        action: { type: Type.STRING, description: "The task: e.g., 'Draft email to boss', 'Schedule meeting tomorrow at 2pm', 'Summarize latest changes in Drive'" },
                        details: { type: Type.OBJECT, description: "Any extra data like email addresses, specific search terms, dates, etc." }
                      },
                      required: ["serviceName", "action"]
                  }
               },
               {
                  name: "execute_zapier_action",
                  description: "Execute an action via Zapier's 7000+ connected apps (Slack, Notion, Trello, Salesforce, HubSpot, etc.). Requires admin configuration. This runs in the background while you continue talking with Boss.",
                  parameters: {
                      type: Type.OBJECT,
                      properties: {
                        app: { type: Type.STRING, description: "App name: e.g., 'Slack', 'Notion', 'Trello', 'Salesforce'" },
                        action: { type: Type.STRING, description: "The action: e.g., 'Send Slack message to channel', 'Create Notion page', 'Post to Trello board'" },
                        data: { type: Type.OBJECT, description: "Action-specific data like channel, message content, page title, etc." }
                      },
                      required: ["app", "action"]
                  }
               }
            ]
          }]
        },
        callbacks: {
          onopen: () => {
             // Reset activity timer
             recordActivity();
             
             // Start background audio when session opens
             playBackgroundAudio();
             
             // Play connection chime to signal AI is alive and ready
             playConnectionChime();
             
             // AI speaks first — brief, natural greeting
             // Slight delay to let chime play first (300ms), then AI speaks
             setTimeout(() => {
               const recentMsgs = historyMsgs.slice(-8);
               if (recentMsgs.length > 0) {
                 const summary = recentMsgs
                   .map(m => `${m.role === 'model' ? (settings.personaName || 'BEATRICE').toUpperCase() : (settings.userName ? settings.userName.split(' ')[0] : 'BOSS').toUpperCase()}: ${m.text}`)
                   .join('\n');
                 const recapPrompt =
                   `[NEW SESSION — RECAP PREVIOUS CONVERSATION]\n` +
                   `Last time we spoke, this is what was said (most recent at the bottom):\n\n${summary}\n\n` +
                   `Greet ${settings.userName ? 'Boss ' + settings.userName.split(' ')[0] : 'Boss'} naturally and briefly mention where we left off ` +
                   `before asking what's next. Keep it very short — one sentence max. Be brief and natural. ` +
                   `Example: "Welcome back, Boss. We were just on [topic] — want to keep going?"`;
                 sessionRef.current?.sendMessage?.({ text: recapPrompt });
               } else {
                 // Fresh session — AI speaks first with brief greeting
                 const greetings = [
                   "Hey Boss.",
                   "Morning Boss.",
                   "Yeah Boss?",
                   "What's up Boss?",
                   "I'm here Boss."
                 ];
                 const greeting = greetings[Math.floor(Math.random() * greetings.length)];
                 sessionRef.current?.sendMessage?.({ text: greeting });
               }
             }, 300);

             // Silence detection - check every 5 seconds
             silenceCheckRef.current = setInterval(() => {
               const silentTime = Date.now() - lastActivityRef.current;
               
               // Auto-stop after 60 seconds of silence (gives the user
               // plenty of room to think / step away briefly).
               if (silentTime > 60000) {
                 stopSession();
                 return;
               }
             }, 5000);

             // Silence fillers - AI speaks at 8s, 20s, 35s, and 50s of silence
             let fillerIndex = 0;
             silenceFillerRef.current = setInterval(() => {
               const silentTime = Date.now() - lastActivityRef.current;
               
               // Early check-in at 8 seconds (quick, gentle)
               if (silentTime > 8000 && silentTime < 12000 && fillerIndex === 0) {
                 const filler = silenceFillers[0]; // "Boss? You still there?"
                 sessionRef.current?.sendMessage?.({ text: filler });
                 fillerIndex = 1;
               }
               // Second check-in at 20 seconds (more thoughtful)
               else if (silentTime > 20000 && silentTime < 24000 && fillerIndex === 1) {
                 const filler = silenceFillers[1 + Math.floor(Math.random() * 2)]; // "Hmm... what's on your mind, Boss?" or "Yeah, I'm listening..."
                 sessionRef.current?.sendMessage?.({ text: filler });
                 fillerIndex = 2;
               }
               // Third check-in at 35 seconds (concerned but patient)
               else if (silentTime > 35000 && silentTime < 39000 && fillerIndex === 2) {
                 const filler = silenceFillers[3 + Math.floor(Math.random() * 2)]; // "You went quiet on me. Everything okay?" or "Uh... Boss? You still with me?"
                 sessionRef.current?.sendMessage?.({ text: filler });
                 fillerIndex = 3;
               }
               // Final check-in at 50 seconds (respectful, giving space)
               else if (silentTime > 50000 && silentTime < 54000 && fillerIndex === 3) {
                 const filler = silenceFillers[5 + Math.floor(Math.random() * 2)]; // "Hey, I'm still here if you need me." or "Maybe you're thinking? Take your time."
                 sessionRef.current?.sendMessage?.({ text: filler });
                 fillerIndex = 4;
               }
             }, 3000);

             // Speech recognition for visual feedback
             try {
               const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
               if (SpeechRecognition && !recognitionRef.current) {
                 recognitionRef.current = new SpeechRecognition();
                 recognitionRef.current.continuous = true;
                 recognitionRef.current.interimResults = true;
                 recognitionRef.current.onresult = (event: any) => {
                   let itx = '';
                   let ftx = '';
                   for (let i = event.resultIndex; i < event.results.length; ++i) {
                     if (event.results[i].isFinal) ftx += event.results[i][0].transcript;
                     else itx += event.results[i][0].transcript;
                   }
                    const tx = (ftx || itx).trim();
                    if (tx && !isAgentSpeakingRef.current) {
                      // User is speaking - record activity
                      recordActivity();
                      showLiveTranscript('user', tx, false);
                    }

                 };
                  recognitionRef.current.onend = () => {
                    if (isActive && !recognitionManualStopRef.current) {
                      try { recognitionRef.current?.start(); } catch (e) {}
                    }
                  };
                  recognitionRef.current.start();
               }
             } catch (e) {}

             audioRecorderRef.current = new AudioRecorder((base64, rawData) => {
              if (isMutedRef.current) return;
              
              // Process emotional analysis from raw audio data
              if (rawData) {
                try {
                  // TODO: Fix emotional synthesis integration
                  // const audioFeatures = emotionalSynthesizerInstance.analyzeAudioFeatures(rawData, 16000);
                  // const emotionalState = emotionalSynthesizerInstance.synthesizeEmotion(audioFeatures);
                  // const context = emotionalSynthesizerInstance.getEmotionalContext();
                  
                  // setCurrentEmotionalStateFn(emotionalState);
                  // setEmotionalContextFn(context);
                  
                  // TODO: Add emotional context to system instruction dynamically when emotional synthesis is fixed
                  // const emotionalContextString = `
                  // CURRENT EMOTIONAL STATE:
                  // - Primary emotion: ${emotionalState?.primary || 'unknown'}
                  // - Intensity: ${(emotionalState?.intensity * 100 || 0).toFixed(0)}%
                  // - Valence: ${emotionalState?.valence > 0 ? 'positive' : emotionalState?.valence < 0 ? 'negative' : 'neutral'} (${emotionalState?.valence?.toFixed(2) || '0.00'})
                  // - Arousal: ${emotionalState?.arousal > 0.6 ? 'high' : emotionalState?.arousal < 0.4 ? 'low' : 'moderate'} energy
                  // - Trend: ${context?.trend || 'unknown'}
                  // 
                  // RESPOND APPROPRIATELY to this emotional state. Be empathetic and human-like in your response.
                  // `;
                  
                  sessionPromise.then(s => s.sendRealtimeInput({
                    audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
                  }));
                } catch (error) {
                  console.error('Emotional analysis error:', error);
                  // Fallback to regular audio without emotional metadata
                  sessionPromise.then(s => s.sendRealtimeInput({
                    audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
                  }));
                }
              } else {
                // Fallback if no raw data available
                sessionPromise.then(s => s.sendRealtimeInput({
                  audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
                }));
              }
            });
             
           // Set up audio level callback for visualization
           audioRecorderRef.current.setAudioLevelCallback((level: number) => {
             setAudioLevel(level);
           });
           
             audioRecorderRef.current.start();
             // Reset silence clock so the 60-second timeout doesn't fire on
             // an old timestamp (which is what was making the session stop
             // "instantly" after reconnecting).
             lastActivityRef.current = Date.now();
             setIsActive(true);
             setConnecting(false);
          },
          onmessage: async (msg: LiveServerMessage) => {
             if (msg.toolCall) {
                const calls = msg.toolCall.functionCalls;
                if (calls) {
                  // Run every tool call to completion in parallel, THEN send
                  // a single sendToolResponse with the real structured data.
                  // Previously we replied with a placeholder before the API
                  // call finished, so the agent never actually saw the
                  // Gmail/Calendar/Drive results — that's the "Gmail isn't
                  // connecting" symptom. Now the agent gets real data and
                  // can speak it back factually (no hallucination).
                  const resps = await Promise.all(
                    (calls || []).map(async (c: any) => {
                      // Handle Google Services
                      if (c.name === 'execute_google_service') {
                        const { serviceName, action, ...params } = (c.args || {}) as any;
                        const tid = Math.random().toString(36).substring(7);
                        setTasks((p) => [...p, { id: tid, serviceName, action, status: 'processing' }]);

                        try {
                          sessionRef.current?.sendRealtimeInput?.({
                            text: `Quick, pulling that from your ${serviceName} now…`,
                          });
                        } catch {}

                        try {
                          const googleServices = GoogleServices.getInstance();
                          const result = await googleServices.executeService(
                            serviceName,
                            action,
                            params || {},
                          );
                          const taskResult = result.success
                            ? `OK — ${serviceName} ${action}`
                            : `Failed: ${result.error || 'unknown error'}`;
                          setTasks((p) =>
                            p.map((t) => (t.id === tid ? { ...t, status: 'completed', result: taskResult } : t)),
                          );
                          setTimeout(() => setTasks((p) => p.filter((t) => t.id !== tid)), 12000);

                          const trim = (v: any): any => {
                            if (Array.isArray(v)) return v.slice(0, 10).map(trim);
                            if (v && typeof v === 'object') {
                              const out: any = {};
                              for (const k of Object.keys(v).slice(0, 30)) out[k] = trim(v[k]);
                              return out;
                            }
                            if (typeof v === 'string') return v.length > 800 ? v.slice(0, 800) + '…' : v;
                            return v;
                          };

                          return {
                            id: c.id,
                            name: c.name,
                            response: result.success
                              ? { ok: true, service: serviceName, action, data: trim(result.data) }
                              : { ok: false, service: serviceName, action, error: result.error },
                          };
                        } catch (err: any) {
                          const errMsg = err?.message || 'unknown error';
                          setTasks((p) =>
                            p.map((t) => (t.id === tid ? { ...t, status: 'completed', result: `Failed: ${errMsg}` } : t)),
                          );
                          setTimeout(() => setTasks((p) => p.filter((t) => t.id !== tid)), 12000);
                          return {
                            id: c.id,
                            name: c.name,
                            response: { ok: false, service: serviceName, action, error: errMsg },
                          };
                        }
                      }

                      // Handle Zapier Actions
                      if (c.name === 'execute_zapier_action') {
                        const { app, action, data } = (c.args || {}) as any;
                        const tid = Math.random().toString(36).substring(7);
                        setTasks((p) => [...p, { id: tid, serviceName: `Zapier:${app}`, action, status: 'processing' }]);

                        try {
                          sessionRef.current?.sendRealtimeInput?.({
                            text: `Running that ${app} action for you now…`,
                          });
                        } catch {}

                        try {
                          // Load global Zapier config
                          const { get: rtdbGet, ref: rtdbRef } = await import('firebase/database');
                          const { rtdb } = await import('./firebase');
                          const zapierSnap = await rtdbGet(rtdbRef(rtdb, 'platform/config/zapierMcp'));

                          if (!zapierSnap.exists()) {
                            return {
                              id: c.id,
                              name: c.name,
                              response: {
                                ok: false,
                                error: 'Zapier not configured. Please ask an admin to connect Zapier in the Platform Admin panel.'
                              },
                            };
                          }

                          const zapierConfig = zapierSnap.val();
                          if (!zapierConfig.serverUrl) {
                            return {
                              id: c.id,
                              name: c.name,
                              response: { ok: false, error: 'Zapier MCP server URL not found in platform config.' },
                            };
                          }

                          // Call Zapier MCP endpoint
                          const result = await fetch(`${zapierConfig.serverUrl}/execute`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ app, action, data: data || {} }),
                          });

                          if (!result.ok) {
                            const errText = await result.text().catch(() => 'Unknown error');
                            throw new Error(`Zapier MCP error: ${result.status} ${errText.slice(0, 200)}`);
                          }

                          const responseData = await result.json();
                          const taskResult = `OK — ${app} ${action}`;
                          setTasks((p) =>
                            p.map((t) => (t.id === tid ? { ...t, status: 'completed', result: taskResult } : t)),
                          );
                          setTimeout(() => setTasks((p) => p.filter((t) => t.id !== tid)), 12000);

                          return {
                            id: c.id,
                            name: c.name,
                            response: { ok: true, app, action, data: responseData },
                          };
                        } catch (err: any) {
                          const errMsg = err?.message || 'Zapier action failed';
                          setTasks((p) =>
                            p.map((t) => (t.id === tid ? { ...t, status: 'completed', result: `Failed: ${errMsg}` } : t)),
                          );
                          setTimeout(() => setTasks((p) => p.filter((t) => t.id !== tid)), 12000);
                          return {
                            id: c.id,
                            name: c.name,
                            response: { ok: false, app, action, error: errMsg },
                          };
                        }
                      }

                      return { id: c.id, name: c.name, response: { error: 'unknown tool' } };
                    }),
                  );

                  try {
                    const session = await sessionPromise;
                    session.sendToolResponse({ functionResponses: resps });
                  } catch (err) {
                    console.error('Failed to send tool response:', err);
                  }
                }
             }
             if (msg.serverContent) {
                const inputTranscription = msg.serverContent.inputTranscription;
                if (inputTranscription?.text?.trim()) {
                  showLiveTranscript('user', inputTranscription.text, Boolean(inputTranscription.finished));
                }

                const outputTranscription = msg.serverContent.outputTranscription;
                if (outputTranscription?.text?.trim()) {
                  showLiveTranscript('model', outputTranscription.text, Boolean(outputTranscription.finished));
                }

                const parts = msg.serverContent.modelTurn?.parts;
                if (parts) {
                   const audio = parts.find(p => p.inlineData)?.inlineData?.data;
                    if (audio) {
                       audioStreamerRef.current?.addPCM16(audio);
                       
                       if (!isAgentSpeakingRef.current) {
                         setIsAgentSpeaking(true);
                         isAgentSpeakingRef.current = true;
                         
                         // Stop recognition and recorder to prevent echo
                         recognitionManualStopRef.current = true;
                         try { recognitionRef.current?.stop(); } catch (e) {}
                         audioRecorderRef.current?.pause();
                       }

                       // Reset the timer for when the AI stops speaking
                       if (isAgentSpeakingTimerRef.current) clearTimeout(isAgentSpeakingTimerRef.current);
                       const playbackBufferMs = audioStreamerRef.current?.getBufferedDurationMs() || 0;
                       isAgentSpeakingTimerRef.current = setTimeout(() => {
                         setIsAgentSpeaking(false);
                         isAgentSpeakingRef.current = false;
                         recognitionManualStopRef.current = false;
                         
                         try { recognitionRef.current?.start(); } catch (e) {}
                         audioRecorderRef.current?.resume();
                       }, Math.max(2500, playbackBufferMs + 500));
                    }
                   const text = parts.find(p => p.text)?.text;
                   if (text?.trim()) {
                     showLiveTranscript('model', text, false);
                   }
                }
                if ((msg.serverContent as any).turnComplete && transcriptRef.current?.role === 'model') {
                   saveTranscriptMessage('model', transcriptRef.current.text);
                }
             }
          },
          onclose: () => stopSession(),
          onerror: () => stopSession()
        }
      });
      // Store session promise for use in audio callback
      // TODO: Fix sessionPromiseRef integration
      // sessionPromiseRef.current = sessionPromise;
      sessionRef.current = await sessionPromise;
    } catch (err) {
      setConnecting(false);
      stopSession();
    }
  };

  const toggleVideo = async () => {
    if (!isVideoEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        // AI responds when video starts
        if (sessionRef.current && isActive) {
          sessionRef.current.sendRealtimeInput({
            text: "Oh, I see you're showing me something! I'm looking at what you're showing me now..."
          });
        }
        
        // Start sending video frames to AI
        videoIntervalRef.current = setInterval(() => {
          if (videoRef.current && sessionRef.current) {
            const v = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
              const base64Url = canvas.toDataURL('image/jpeg', 0.5);
              const base64Data = base64Url.split(',')[1];
              if (base64Data) {
                sessionRef.current.sendRealtimeInput({
                  video: { data: base64Data, mimeType: 'image/jpeg' }
                });
              }
            }
          }
        }, 1500); // 1.5 seconds per frame is safe for Live API to process
        
        setIsVideoEnabled(true);
      } catch (e) {
        console.error("Camera error:", e);
      }
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach((t) => t.stop());
         videoRef.current.srcObject = null;
      }
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
      setIsVideoEnabled(false);
    }
  };

  const stopSession = () => {
    try { recognitionRef.current?.stop(); } catch (e) {}
    audioRecorderRef.current?.stop();
    audioStreamerRef.current?.stop();
    sessionRef.current?.close();
    // Clean up silence detection timers
    if (silenceCheckRef.current) clearInterval(silenceCheckRef.current);
    if (silenceFillerRef.current) clearInterval(silenceFillerRef.current);
    if (isAgentSpeakingTimerRef.current) clearTimeout(isAgentSpeakingTimerRef.current);
    if (transcriptTimeoutRef.current) clearTimeout(transcriptTimeoutRef.current);
    silenceCheckRef.current = null;
    silenceFillerRef.current = null;
    isAgentSpeakingTimerRef.current = null;
    transcriptTimeoutRef.current = null;
    recognitionManualStopRef.current = false;
    transcriptRef.current = null;
    setCurrentTranscript(null);
    // Keep the conversation log in the Office History sidebar — only the
    // live transient elements above are cleared. historyMsgs / historyContext
    // persist so the full chat is always available in the chatbox.
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
       const stream = videoRef.current.srcObject as MediaStream;
       stream.getTracks().forEach((t) => t.stop());
       videoRef.current.srcObject = null;
    }
    setIsVideoEnabled(false);
    setIsActive(false);
    setConnecting(false);
    setCurrentTranscript(null);
    
    // Stop background audio when session ends
    stopBackgroundAudio();
  };

  // Real-time amplitude (0..1) driving every visualizer. Switches source on
  // who's actually talking so the orb + connect bars sync to BOTH user mic
  // input AND Beatrice's playback waveform — never static, never lagging.
  const micLevelBoosted = isMuted ? 0 : Math.min(1, audioLevel * 6);
  const aiLevelBoosted = Math.min(1, aiAudioLevel * 4.5);
  const vizLevel = !isActive
    ? 0
    : isAgentSpeaking
      ? Math.max(aiLevelBoosted, 0.18)   // floor so it's clearly active
      : micLevelBoosted;
  const micInputLevel = vizLevel; // legacy alias used by the bars below
  // Orb pulse mirrors whatever's currently producing audio.
  const orbPulse = isActive ? vizLevel : 0;
  // 13-dot horizontal visualizer (matches design mock); each dot has a different
  // "sensitivity" so the row breathes like a waveform around the center.
  const micInputBars = [0.18, 0.28, 0.42, 0.58, 0.74, 0.88, 1.0, 0.88, 0.74, 0.58, 0.42, 0.28, 0.18];



  return (
    <div
      className="vep-voice-grid relative min-h-screen text-white flex flex-col h-[100dvh] overflow-hidden"
      style={{ fontFamily: 'Roboto, system-ui, sans-serif' }}
      onClick={() => isActive && recordActivity()}
      onTouchStart={() => isActive && recordActivity()}
      onMouseMove={() => isActive && recordActivity()}
    >
        <canvas ref={canvasRef} className="hidden" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="vep-crosshair absolute inset-x-0 top-[146px] h-[610px]" />
          <div className="vep-radar-ring absolute left-1/2 top-[230px] h-[520px] w-[520px] -translate-x-1/2 rounded-full" />
          <div className="vep-radar-ring absolute left-1/2 top-[286px] h-[410px] w-[410px] -translate-x-1/2 rounded-full opacity-70" />
          <div className="absolute inset-x-0 top-[140px] h-px bg-white/[0.06]" />
        </div>

        {/* Navigation / Header */}
        <header className="relative z-20 flex items-center justify-between px-6 pt-14 pb-7">
          {/* Left: Hamburger */}
          <button
            onClick={() => setShowSidebar(true)}
            className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-lime-300/25 bg-black/55 text-lime-300/85 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] transition-colors hover:border-lime-300/55 hover:text-lime-200"
            aria-label="Open conversation history"
            title="Open conversation history"
          >
              <Menu className="h-6 w-6" />
          </button>

          {/* Center: Status Badge */}
          <div className="absolute left-1/2 -translate-x-1/2">
            {(isAgentSpeaking || connecting) && (
              <span
                className="rounded-full border border-lime-300/45 bg-lime-400/10 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-lime-300 shadow-[0_0_24px_rgba(163,230,53,0.12)]"
              >
                {connecting ? 'Connecting...' : 'Speaking...'}
              </span>
            )}
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            {/* Caption Toggle */}
            <button 
              onClick={() => setShowCaptions(!showCaptions)}
              className={`flex h-12 w-12 items-center justify-center rounded-[18px] border transition-colors ${
                showCaptions 
                  ? 'border-lime-300/45 bg-lime-400/10 text-lime-300/85 shadow-[0_0_24px_rgba(163,230,53,0.12)]' 
                  : 'border-lime-300/25 bg-black/55 text-lime-300/85 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] hover:border-lime-300/55 hover:text-lime-200'
              }`}
              aria-label={showCaptions ? 'Hide captions' : 'Show captions'}
              title={showCaptions ? 'Hide captions' : 'Show captions'}
            >
              {showCaptions ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
            </button>
            
            {/* App Logo */}
            <button
              onClick={() => setShowProfile(true)}
              className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-lime-300/30 bg-black/65 p-2 text-lime-300/85 transition-colors hover:border-lime-300/55 hover:text-lime-200"
              aria-label="Open profile settings"
              title="Open profile settings"
            >
              <img
                src="/images/playstore.png"
                alt="Vep"
                className="h-full w-full rounded-full object-cover"
              />
            </button>
          </div>
        </header>

        {/* Main Interface */}
        <main className="relative z-10 flex flex-1 flex-col items-center px-6 pt-14">
           {/* The Lime Orb / Core */}
           <div className="relative flex items-center justify-center pt-2">
               <div className="absolute h-[330px] w-[330px] rounded-full border border-lime-300/10" />
               <div className="absolute h-[292px] w-[292px] rounded-full bg-lime-400/10 blur-[52px]" />
               <div className="absolute h-[250px] w-[250px] rounded-full bg-emerald-400/10 blur-[34px]" />

               {/* Pulsing animation when active */}
               <AnimatePresence>
                 {isActive && (
                   <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: isAgentSpeaking ? [0.3, 0.6, 0.3] : [0.2, 0.4, 0.2],
                        scale: isAgentSpeaking ? [1, 1.1, 1] : [1, 1.05, 1],
                      }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute h-[316px] w-[316px] rounded-full bg-lime-400/20 blur-2xl"
                   />
                 )}
               </AnimatePresence>

               {/* Main orb with video overlay */}
               <motion.div
                 animate={{
                    scale: isActive ? 1.0 + orbPulse * 0.12 : 0.96,
                    boxShadow: isActive
                      ? `0 0 ${56 + orbPulse * 80}px rgba(74, 222, 128, ${0.32 + orbPulse * 0.45})`
                      : '0 0 36px rgba(74, 222, 128, 0.18)',
                    filter: isActive ? `brightness(${1 + orbPulse * 0.18})` : 'brightness(1)',
                 }}
                 transition={{ duration: 0.12, ease: 'easeOut' }}
                 className={`vep-orb-core relative flex h-[190px] w-[190px] items-center justify-center overflow-hidden rounded-full border border-green-300/25 ${isActive ? 'vep-orb-active' : ''}`}
               >
                 {/* Video overlay - shows when video is enabled */}
                 {isVideoEnabled && (
                   <video
                     ref={videoRef}
                     playsInline
                     muted
                     autoPlay
                     className="absolute inset-0 h-full w-full object-cover opacity-90"
                   />
                 )}

                 {connecting ? (
                    <div className="relative z-10 flex flex-col items-center gap-3">
                       <Loader2 className="h-8 w-8 animate-spin text-black/70" />
                       <span className="text-[10px] font-medium uppercase tracking-widest text-black/50">Connecting</span>
                    </div>
                 ) : null}
               </motion.div>
           </div>

           {/* Transcription - Clean text only, AI left-to-right, User right-to-left */}
           <TranscriptionDisplay
             currentTranscript={currentTranscript}
             showCaptions={showCaptions}
             getSpeakerTag={getSpeakerTag}
           />

           {/* Control Buttons - Bottom Positioned with Power in Center */}
           <div className="absolute bottom-[36px] left-11 right-11 flex items-center justify-between">
            {/* Left: Microphone Button */}
             <button
               onClick={() => setIsMuted(!isMuted)}
               className={`flex h-11 w-11 items-center justify-center rounded-full border bg-black/65 transition-all ${
                 isMuted
                   ? 'border-red-500/35 text-red-400'
                   : 'border-lime-300/30 text-lime-300/85 hover:border-lime-300/55 hover:text-lime-200'
               }`}
               aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
               title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
             >
               {isMuted ? <MicOff className="h-[18px] w-[18px]" /> : <Mic className="h-[18px] w-[18px]" />}
             </button>

             {/* Center: Main Power Button */}
             {!isActive ? (
               <button
                 onClick={startSession}
                 disabled={connecting}
                 className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full border border-white/[0.10] bg-black/70 text-lime-300 shadow-[0_0_24px_rgba(132,204,22,0.16)] transition-all hover:border-lime-300/40 hover:text-lime-200 active:scale-95 disabled:opacity-50"
                 aria-label="Start voice session"
                 title="Start voice session"
               >
                 <Power className="h-8 w-8" strokeWidth={2.2} />
               </button>
             ) : (
               <button
                 onClick={stopSession}
                 className="relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-2 border-green-400/80 bg-black shadow-[0_0_26px_rgba(74,222,128,0.45)] transition-all hover:border-green-300 active:scale-95"
                 aria-label="Stop voice session"
                 title="Stop voice session"
               >
                 {/* Soft inner glow that pulses with mic input */}
                 <div
                   className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400/25 via-emerald-500/15 to-green-600/10"
                   style={{
                     opacity: 0.4 + micInputLevel * 0.55,
                     transform: `scale(${0.9 + micInputLevel * 0.18})`,
                     transition: 'opacity 80ms linear, transform 80ms linear',
                   }}
                 />
                 {/* Horizontal dot visualizer synced to user mic audio.
                     Pure-CSS keyframe so bars are ALWAYS visibly animating;
                     --mic (0..1) is set inline for amplitude on top. */}
                 <div
                   className="relative z-10 flex h-full w-full items-center justify-center gap-[3px] px-3"
                   style={{ ['--mic' as any]: String(micInputLevel) }}
                 >
                   {micInputBars.map((sensitivity, i) => (
                     <span
                       key={i}
                       className="vep-viz-bar"
                       style={{
                         ['--sens' as any]: String(sensitivity),
                         animationDelay: `${i * 60}ms`,
                       }}
                     />
                   ))}
                 </div>
               </button>
             )}

             {/* Right: Video Button */}
             <button
               onClick={toggleVideo}
               className={`flex h-11 w-11 items-center justify-center rounded-full border bg-black/65 transition-all ${
                 isVideoEnabled
                   ? 'border-lime-400/55 text-lime-300'
                   : 'border-lime-300/30 text-lime-300/85 hover:border-lime-300/55 hover:text-lime-200'
               }`}
               aria-label={isVideoEnabled ? 'Disable video' : 'Enable video'}
               title={isVideoEnabled ? 'Disable video' : 'Enable video'}
             >
               {isVideoEnabled ? <Video className="h-[18px] w-[18px]" /> : <VideoOff className="h-[18px] w-[18px]" />}
             </button>
           </div>

           {/* Dynamic Background Tasks / HUD
               Shows what the agent is doing in the background while it
               keeps talking — listening, understanding, planning, searching,
               generating, executing, waiting on permission, finalizing. */}
          <div className="absolute bottom-[128px] left-4 right-4 pointer-events-none">
             <div className="mx-auto max-w-[360px] space-y-2">
               <AnimatePresence>
                 {tasks.map(task => {
                   const phase = pickTaskPhase(task);
                   return (
                     <motion.div
                       key={task.id}
                       layout
                       initial={{ opacity: 0, y: 14, scale: 0.96 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.22 } }}
                       transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                       className="vep-task-card flex items-center gap-3"
                       style={{ ['--task' as any]: phase.color }}
                     >
                       <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                         {task.status === 'completed' ? (
                           <span className="vep-task-check" />
                         ) : phase.visual === 'wave' ? (
                           <span className="vep-task-wave">
                             {[0,1,2,3,4,5,6].map(i => (
                               <b key={i} style={{ ['--i' as any]: i }} />
                             ))}
                           </span>
                         ) : phase.visual === 'orbit' ? (
                           <span className="vep-task-orbit" />
                         ) : phase.visual === 'radar' ? (
                           <span className="vep-task-radar" />
                         ) : (
                           <span className="vep-task-spinner" />
                         )}
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-white/90">
                           {phase.label} · {task.serviceName}
                         </p>
                         <p className="truncate text-[11px] text-zinc-400">
                           {task.status === 'completed' && task.result
                             ? task.result
                             : task.action}
                         </p>
                         <div className="vep-task-progress mt-1.5">
                           <span />
                         </div>
                       </div>
                       <span className="vep-task-dot shrink-0" />
                     </motion.div>
                   );
                 })}
               </AnimatePresence>
             </div>
           </div>
        </main>

      {/* Profile Fullscreen Overlay */}
      <AnimatePresence>
        {showProfile && (
           <motion.div
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[200] flex flex-col overflow-y-auto bg-[#020302]"
             style={{ fontFamily: 'Roboto, system-ui, sans-serif' }}
           >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.10] bg-[#020302] px-6 pb-8 pt-16">
                   <h2 className="text-[15px] font-black uppercase tracking-[0.18em] text-white">Office Profile</h2>
                   <button
                     onClick={() => setShowProfile(false)}
                     className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-lime-300/25 bg-lime-300/[0.05] text-lime-300/85 transition-colors hover:border-lime-300/50 hover:text-lime-200"
                     aria-label="Close profile settings"
                     title="Close profile settings"
                   >
                     <X className="h-5 w-5" />
                   </button>
                </div>

                <div className="flex-1 px-6 pb-32">
                   {/* Profile Photo - Playstore Logo */}
                   <div className="flex flex-col items-center py-10">
                      <div className="relative">
                         <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-[3px] border-white/[0.12] bg-zinc-900/70 p-3">
                            {settings.avatarUrl || user.photoURL ? (
                              <img
                                src={settings.avatarUrl || user.photoURL || ''}
                                alt="Profile"
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              <img
                                src="/images/playstore.png"
                                alt="Vep Logo"
                                className="h-full w-full rounded-full object-cover"
                              />
                            )}
                         </div>
                         {/* Hidden file input for avatar upload */}
                         <input
                           type="file" accept="image/*"
                           className="absolute inset-0 opacity-0 cursor-pointer"
                           aria-label="Upload profile photo"
                           title="Upload profile photo"
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (!file) return;
                             const reader = new FileReader();
                             reader.onload = (ev) => {
                               const img = new Image();
                               img.onload = () => {
                                  const c = document.createElement('canvas');
                                  c.width = 150; c.height = 150;
                                  const ctx = c.getContext('2d');
                                  if (!ctx) return;
                                  ctx.drawImage(img, 0, 0, 150, 150);
                                  setSettings(s => ({ ...s, avatarUrl: c.toDataURL('image/jpeg', 0.8) }));
                               };
                               img.src = ev.target?.result as string;
                             };
                             reader.readAsDataURL(file);
                           }}
                         />
                      </div>
                      <p className="mt-5 text-[14px] font-black uppercase tracking-[0.22em] text-white">Profile Photo</p>
                      <p className="mt-2 text-sm font-semibold text-zinc-600">Tap to update</p>
                   </div>

                   {/* Form Fields */}
                   <div className="space-y-8">
                      {/* User Name */}
                      <div className="space-y-2">
                         <div className="flex items-center gap-3 text-zinc-600">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            <span className="text-[13px] font-black uppercase tracking-[0.18em]">
                              How should {settings.personaName || 'Beatrice'} address you?
                            </span>
                         </div>
                         <input
                           type="text"
                           value={settings.userName}
                           onChange={(e) => setSettings(s => ({ ...s, userName: e.target.value }))}
                           className="h-[52px] w-full rounded-[16px] border border-white/[0.12] bg-black/30 px-4 text-[15px] font-semibold text-white outline-none transition-all placeholder:text-zinc-700 focus:border-lime-300/35"
                           placeholder="Jo Lernout"
                         />
                      </div>

                      {/* Persona Name */}
                      <div className="space-y-2">
                         <div className="flex items-center gap-3 text-zinc-600">
                            <Bot className="h-4 w-4" />
                            <span className="text-[13px] font-black uppercase tracking-[0.18em]">Persona Name</span>
                         </div>
                         <input
                           type="text"
                           value={settings.personaName}
                           onChange={(e) => setSettings(s => ({ ...s, personaName: e.target.value }))}
                           className="h-[52px] w-full rounded-[16px] border border-white/[0.12] bg-black/30 px-4 text-[15px] font-semibold text-white outline-none transition-all placeholder:text-zinc-700 focus:border-lime-300/35"
                           placeholder="Beatrice"
                         />
                      </div>

                      {/* Voices */}
                      <div className="space-y-2">
                         <span className="text-[13px] font-black uppercase tracking-[0.18em] text-zinc-600">Voices</span>
                         <select
                           value={settings.selectedVoice || settings.voice || 'Aoede'}
                           onChange={(e) => setSettings(s => ({ ...s, selectedVoice: e.target.value, voice: e.target.value }))}
                           className="h-[64px] w-full appearance-none rounded-[22px] border border-white/[0.12] bg-black/30 px-5 text-[16px] font-semibold text-white outline-none transition-all focus:border-lime-300/35"
                           aria-label="Select voice"
                           title="Select voice (Aoede is the default — pick another to customize)"
                         >
                           <option value="Aoede">Athena — elegant, smooth, intelligent</option>
                           <option value="Charon">Superman — deep, steady, grounded</option>
                           <option value="Kore">Wonder Woman — clear, composed, warm</option>
                           <option value="Fenrir">Batman — dark, firm, serious</option>
                           <option value="Puck">Iron Man — quick, bright, witty</option>
                           <option value="Hades">Captain America — heroic, confident, clear</option>
                           <option value="Zeus">Thor — powerful, commanding, bold</option>
                           <option value="Hera">Black Widow — sleek, precise, sophisticated</option>
                           <option value="Poseidon">Spider-Man — energetic, friendly, agile</option>
                           <option value="Apollo">Doctor Strange — mystical, calm, authoritative</option>
                         </select>
                      </div>

                      {/* Language */}
                      <div className="space-y-2">
                         <span className="text-[13px] font-black uppercase tracking-[0.18em] text-zinc-600">Language</span>
                         <select
                           value={settings.language}
                           onChange={(e) => setSettings(s => ({ ...s, language: e.target.value }))}
                           className="h-[64px] w-full appearance-none rounded-[22px] border border-white/[0.12] bg-black/30 px-5 text-[16px] font-semibold text-white outline-none transition-all focus:border-lime-300/35"
                           aria-label="Select language"
                           title="Select language"
                         >
                            <option value="English">English</option>
                            <option value="Dutch">Dutch</option>
                            <option value="Dutch Flemish">Dutch Flemish</option>
                            <option value="Spanish">Spanish</option>
                            <option value="French">French</option>
                            <option value="German">German</option>
                            <option value="Italian">Italian</option>
                            <option value="Portuguese">Portuguese</option>
                            <option value="Chinese (Simplified)">Chinese (Simplified)</option>
                            <option value="Chinese (Traditional)">Chinese (Traditional)</option>
                            <option value="Japanese">Japanese</option>
                            <option value="Korean">Korean</option>
                            <option value="Russian">Russian</option>
                         </select>
                      </div>

                      {/* Persona Instructions */}
                      <div className="space-y-2">
                         <span className="text-[13px] font-black uppercase tracking-[0.18em] text-zinc-600">Default Persona Instructions</span>
                         <textarea
                           value={settings.personality}
                           onChange={(e) => setSettings(s => ({ ...s, personality: e.target.value }))}
                           className="min-h-[200px] w-full resize-none rounded-[22px] border border-white/[0.12] bg-black/30 p-5 text-[16px] font-semibold leading-relaxed text-zinc-300 outline-none transition-all placeholder:text-zinc-700 focus:border-lime-300/35"
                           placeholder="Enter instructions for how the agent should behave..."
                         />
                      </div>

                      {/* Knowledge Base Upload */}
                      <div className="space-y-2 pt-4 border-t border-zinc-800">
                         <div className="flex items-center gap-2 text-zinc-500">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <span className="text-xs font-semibold uppercase tracking-wider">Knowledge Base</span>
                         </div>
                         <p className="text-xs text-zinc-400">Upload files to give the agent knowledge and context</p>
                         <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 cursor-pointer transition-colors hover:border-zinc-700">
                            <svg className="w-5 h-5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                            </svg>
                            <span className="text-sm text-zinc-300">Upload Files for Knowledge Base</span>
                            <input
                              type="file"
                              accept="image/*,video/*,application/pdf,.doc,.docx,.txt,.csv,.json,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.md,.xml,.yaml,.yml"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                files.forEach(file => {
                                  const fileUrl = URL.createObjectURL(file);
                                  const isImage = file.type.startsWith('image/');
                                  const isVideo = file.type.startsWith('video/');
                                  
                                  // Add to chat as knowledge base file
                                  const fileMsg = {
                                    role: 'user' as const,
                                    source: 'user' as const,
                                    speaker: settings.userName ? settings.userName.split(' ')[0] : 'BOSS',
                                    text: `📚 Knowledge Base: ${file.name}`,
                                    fileUrl,
                                    fileType: file.type,
                                    fileName: file.name,
                                    timestamp: Date.now()
                                  };
                                  
                                  const msgRef = push(ref(rtdb, 'users/' + user.uid + '/messages'));
                                  set(msgRef, fileMsg);
                                  
                                  // AI acknowledges knowledge base addition
                                  if (sessionRef.current && isActive) {
                                    const getFileTypeDescription = (fileName: string, fileType: string) => {
                                      if (fileType.startsWith('image/')) return "I can see the image";
                                      if (fileType.startsWith('video/')) return "I can see the video";
                                      if (fileName.endsWith('.pdf')) return "I've reviewed the PDF";
                                      if (fileName.endsWith('.csv') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return "I've analyzed the spreadsheet";
                                      if (fileName.endsWith('.json')) return "I've processed the JSON data";
                                      if (fileName.endsWith('.txt') || fileName.endsWith('.md')) return "I've read the text file";
                                      if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return "I've reviewed the Word document";
                                      if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) return "I've looked at the presentation";
                                      return "I've reviewed the document";
                                    };
                                    
                                    sessionRef.current.sendRealtimeInput({
                                      text: `Got it, Boss! I've added ${file.name} to my knowledge base. ${getFileTypeDescription(file.name, file.type)} and I'll remember this information for our conversations.`
                                    });
                                  }
                                  
                                  // Send to AI for analysis if it's image/video
                                  if (isImage || isVideo) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      const base64Data = (ev.target?.result as string)?.split(',')[1];
                                      if (base64Data && sessionRef.current) {
                                        sessionRef.current.sendMessage({
                                          inlineData: { mimeType: file.type, data: base64Data }
                                        });
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                });
                              }}
                            />
                         </label>
                      </div>

                      {/* Admin controls - only for platform admins */}
                      {user.email?.endsWith('@eburon.ai') && (
                        <div className="mt-6 pt-6 border-t border-white/[0.08]">
                          <button
                            onClick={() => setShowAdmin(true)}
                            className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-lime-300/30 bg-lime-300/[0.08] py-3 text-[12px] font-bold uppercase tracking-[0.14em] text-lime-300 transition-all hover:border-lime-300/55 hover:bg-lime-300/[0.15]"
                          >
                            <Code2 className="h-4 w-4" />
                            Platform Admin
                          </button>
                        </div>
                      )}
                   </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="fixed bottom-0 left-0 right-0 border-t border-white/[0.10] bg-black/95 p-4">
                  <div className="flex gap-3">
                    <button
                      onClick={onLogout}
                      className="flex flex-1 items-center justify-center gap-3 rounded-[22px] bg-red-950/45 py-5 text-[13px] font-black uppercase tracking-[0.16em] text-red-500 transition-all hover:bg-red-950 active:scale-95"
                    >
                      <LogOut className="h-4 w-4" />
                      LOGOUT
                    </button>
                    <button
                      onClick={() => setShowTools(true)}
                      className="flex flex-1 items-center justify-center gap-3 rounded-[22px] bg-blue-950/45 py-5 text-[13px] font-black uppercase tracking-[0.16em] text-blue-400 transition-all hover:bg-blue-950 active:scale-95"
                    >
                      <Settings className="h-4 w-4" />
                      TOOLS
                    </button>
                    <button
                      onClick={async () => {
                        const userRef = ref(rtdb, 'users/' + user.uid);
                        await update(userRef, { settings, updatedAt: serverTimestamp() });
                        setShowProfile(false);
                      }}
                      className="flex flex-1 items-center justify-center gap-3 rounded-[22px] bg-lime-400 py-5 text-[13px] font-black uppercase tracking-[0.16em] text-black transition-all hover:bg-lime-300 active:scale-95"
                    >
                      <Save className="h-4 w-4" />
                      SAVE
                    </button>
                  </div>
                </div>
             </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Panel — Platform-wide configuration (admin only) */}
      <AnimatePresence>
        {showAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250]"
          >
            <AdminPanel onClose={() => setShowAdmin(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat History Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[150] flex w-screen flex-col bg-[#020302]"
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between border-b border-white/[0.10] px-6 pb-7 pt-16">
              <div>
                <h2 className="text-[15px] font-black uppercase tracking-[0.18em] text-white">Office History</h2>
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">Saved conversation records</p>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-lime-300/25 bg-lime-300/[0.05] text-lime-300/85 transition-colors hover:border-lime-300/50 hover:text-lime-200"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 border-b border-white/[0.10] px-4 py-4">
              <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[16px] border border-lime-300/25 bg-lime-400/[0.08] text-[11px] font-black uppercase tracking-[0.18em] text-lime-300">
                <Paperclip className="h-4 w-4" />
                Attach
                <input
                  type="file"
                  accept="image/*,video/*,application/pdf,.doc,.docx,.txt,.csv,.json,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.md,.xml,.yaml,.yml"
                  multiple
                  className="hidden"
                  onChange={(e) => handleChatFiles(e.target.files)}
                />
              </label>
              <button
                type="button"
                onClick={() => setChatInput('Build: ')}
                className="flex h-12 items-center justify-center gap-2 rounded-[16px] border border-white/[0.10] bg-white/[0.05] text-[11px] font-black uppercase tracking-[0.18em] text-zinc-200"
              >
                <Code2 className="h-4 w-4" />
                Build
              </button>
            </div>

            {/* Chat Messages */}
            <div className="vep-voice-grid flex-1 overflow-y-auto px-4 py-6 space-y-6">
              {historyMsgs.length === 0 ? (
                <p className="text-center text-zinc-600 text-sm py-8">No messages yet</p>
              ) : (
                historyMsgs.map((msg, i) => {
                  const isUserMessage = msg.role === 'user';
                  return (
                    <motion.div
                      key={`${msg.timestamp}-${i}`}
                      initial={{ opacity: 0, x: isUserMessage ? 40 : -40 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                      className={`flex flex-col gap-2 ${
                        isUserMessage ? 'items-end text-right' : 'items-start text-left'
                      }`}
                    >
                      <span className={`px-1 text-[9px] font-bold uppercase tracking-[0.18em] ${
                        isUserMessage ? 'text-zinc-600' : 'text-zinc-600'
                      }`}>
                        {getSpeakerTag(msg.role)}
                      </span>
                      <div
                        className={`max-w-[88%] rounded-[14px] px-3.5 py-2.5 text-[13px] font-medium leading-relaxed ${
                          isUserMessage
                            ? 'bg-cyan-950/45 text-cyan-50 border border-cyan-500/35 rounded-tr-md'
                            : 'bg-zinc-900/72 text-zinc-200 border border-lime-300/18 rounded-tl-md'
                        }`}
                      >
                        {msg.fileUrl && msg.fileType?.startsWith('image/') && (
                          <img
                            src={msg.fileUrl}
                            alt={msg.fileName || 'attachment'}
                            className="mb-2 max-h-64 w-full rounded-[12px] object-cover"
                          />
                        )}
                        {msg.fileUrl && msg.fileType?.startsWith('video/') && (
                          <video
                            src={msg.fileUrl}
                            controls
                            className="mb-2 max-h-64 w-full rounded-[12px]"
                          />
                        )}
                        {!msg.fileUrl && msg.fileName && (
                          <div className="mb-2 flex items-center gap-2 rounded-[12px] border border-white/10 bg-black/40 px-3 py-2 text-[13px] font-medium text-zinc-300">
                            <FileText className="h-4 w-4 shrink-0 text-lime-300" />
                            <span className="truncate">{msg.fileName}</span>
                            {typeof msg.fileSize === 'number' && (
                              <span className="ml-auto shrink-0 text-[11px] text-zinc-500">
                                {(msg.fileSize / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>
                        )}
                        {(() => {
                          // If the AI returned an HTML document/fragment,
                          // strip it from the visible text and render a live
                          // preview underneath the bubble instead. Always
                          // show prose text first so context isn't lost.
                          const html = msg.role === 'model' ? extractHtml(msg.text) : null;
                          const proseText = html
                            ? msg.text
                                .replace(/```html\s*[\s\S]*?```/gi, '')
                                .replace(/```\s*[\s\S]*?```/g, '')
                                .replace(/<!doctype html[\s\S]*?<\/html>/gi, '')
                                .replace(/<html[\s\S]*?<\/html>/gi, '')
                                .trim()
                            : msg.text;
                          const wasFile = msg.fileUrl || msg.fileName;
                          return (
                            <>
                              {proseText && wasFile && (
                                <span className="text-[13px] font-medium text-zinc-400">{proseText}</span>
                              )}
                              {proseText && !wasFile && proseText}
                              {html && (
                                <HtmlLiveView
                                  html={html}
                                  title={`${(settings.personaName || 'BEATRICE').toString()} document`}
                                />
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Sidebar Footer - Message Input with Attachment */}
            <div className="border-t border-white/[0.10] bg-black/80 p-3">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!chatInput.trim()) return;
                  const userText = chatInput.trim();

                  // Add user message to history
                  const newMsg = {
                    role: 'user' as const,
                    source: 'user' as const,
                    speaker: settings.userName ? settings.userName.split(' ')[0] : 'BOSS',
                    text: userText,
                    timestamp: Date.now()
                  };
                  setHistoryMsgs(prev => [...prev, newMsg]);
                  saveMessage('user', userText);

                  // Detect document/artifact request and auto-generate preview.
                  const artifactType = detectArtifactRequest(userText);
                  if (artifactType) {
                    const boss = settings.userName ? `Boss ${settings.userName.split(' ')[0]}` : 'Boss';
                    
                    // Show loading simulation first, then instantly open artifact
                    setTimeout(() => {
                      const artifact = buildArtifactFromPrompt(
                        artifactType,
                        userText,
                        settings.personaName,
                        settings.userName,
                      );
                      setCurrentArtifact(artifact);
                    }, 1500); // 1.5 second loading simulation

                    // Natural employee-style ack in chat history + AI voice.
                    const ackByType: Record<string, string> = {
                      contract: `Okay, ${boss}. I'm preparing that contract now... almost done... there we go. You can review it right here, and sign directly from the boxes at the bottom.`,
                      agreement: `Alright, ${boss}. I'm drafting the agreement... let me shape this into a clean document... okay, I'm finalizing it now. You can review it here and sign from the boxes at the bottom.`,
                      proposal: `Okay, ${boss}. I'm building that proposal... structuring the content... almost there. You can review it here and approve from the signature boxes at the bottom.`,
                      quotation: `Right, ${boss}. I'm preparing the quotation... calculating the details... got it. You can review and approve from the signature box at the bottom.`,
                      statement_of_work: `Got it, ${boss}. I'm creating the statement of work... outlining the scope... okay, finalizing now. You can review and sign at the bottom.`,
                      invoice: `Yes, ${boss}. I'm preparing the invoice... adding the line items... calculating totals... done. You can review it here and sign from the box at the bottom.`,
                      csv: `Okay, ${boss}. I'm generating that CSV... setting up the headers... populating the data... there we go. You can review the preview and download it.`,
                      slides: `Right, ${boss}. I'm building the slide deck... creating the slides... organizing the content... okay, ready. You can review the presentation now.`,
                      pdf: `Got it, ${boss}. I'm preparing the PDF document... formatting the content... almost there... done. You can review it here and save as PDF.`,
                      letter: `Okay, ${boss}. I'm drafting that letter... composing the message... polishing it up... ready. You can review it in the preview.`,
                      certificate: `Yes, ${boss}. I'm creating the certificate... adding the details... formatting it... there we go. You can review and download it.`,
                      report: `Right, ${boss}. I'm preparing that report... gathering the information... structuring the content... okay, I'm finalizing it now. You can review the preview.`,
                    };
                    const ackText = ackByType[artifactType] || `Okay, ${boss}. I'm preparing that document... almost done... there we go. You can review it here.`;
                    const ackMsg = {
                      role: 'model' as const,
                      source: 'assistant' as const,
                      speaker: settings.personaName || 'BEATRICE',
                      text: ackText,
                      timestamp: Date.now() + 1,
                    };
                    setHistoryMsgs(prev => [...prev, ackMsg]);
                    saveMessage('model', ackText);
                    // Also have the live voice agent say it naturally, if connected.
                    if (sessionRef.current && isActive) {
                      try {
                        sessionRef.current.sendRealtimeInput?.({ text: ackText });
                      } catch {}
                    }
                    setChatInput('');
                    return;
                  }

                  // Default path: forward to live session if active
                  if (sessionRef.current && isActive) {
                    sessionRef.current.sendRealtimeInput({
                      text: userText
                    });
                  }
                  setChatInput('');
                }}
                className="flex h-14 items-center gap-2 rounded-[20px] border border-lime-300/20 bg-black px-2.5"
              >
                {/* Attachment Button */}
                <label className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-[14px] border border-lime-300/30 bg-lime-300/[0.05] text-lime-300/85 transition-colors hover:border-lime-300/55 hover:text-lime-200">
                  <Paperclip className="h-5 w-5" />
                  <input
                    type="file"
                    accept="image/*,video/*,application/pdf,.doc,.docx,.txt,.csv,.json,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.md,.xml,.yaml,.yml"
                    multiple
                    className="hidden"
                    aria-label="Attach files"
                    title="Attach files"
                    onChange={(e) => {
                      handleChatFiles(e.target.files);
                    }}
                  />
                </label>
                
                {/* Message Input */}
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Message ${settings.personaName || 'Beatrice'}...`}
                  className="h-10 min-w-0 flex-1 bg-transparent px-2 text-[14px] font-medium text-white outline-none placeholder:text-zinc-700"
                />
                
                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] bg-lime-400 text-black transition-all hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send message"
                  title="Send message"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Eburon AI branded document artifact preview (contracts, invoices,
          CSV, slides, etc.) — auto-generated from conversation. */}
      {currentArtifact && (
        <ArtifactPreview
          artifact={currentArtifact}
          onClose={() => setCurrentArtifact(null)}
        />
      )}

      {/* Tools Modal */}
      <AnimatePresence>
        {showTools && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col overflow-y-auto bg-[#020302]"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.10] bg-[#020302] px-6 pb-8 pt-16">
              <h2 className="text-[15px] font-black uppercase tracking-[0.18em] text-white">Tools & Integrations</h2>
              <button
                onClick={() => setShowTools(false)}
                className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-lime-300/25 bg-lime-300/[0.05] text-lime-300/85 transition-colors hover:border-lime-300/50 hover:text-lime-200"
                aria-label="Close tools"
                title="Close tools"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 px-6 pb-32">
              <div className="py-8">
                <div className="space-y-2">
                  {[
                    { name: 'Gmail', icon: '📧' },
                    { name: 'Google Drive', icon: '📁' },
                    { name: 'Google Docs', icon: '📄' },
                    { name: 'Google Sheets', icon: '📊' },
                    { name: 'Google Slides', icon: '📽️' },
                    { name: 'Google Calendar', icon: '📅' },
                    { name: 'Google Tasks', icon: '✅' },
                    { name: 'Google Contacts', icon: '👥' },
                    { name: 'Google Forms', icon: '📝' },
                    { name: 'Google Chat', icon: '💬' },
                    { name: 'YouTube', icon: '🎥' },
                    { name: 'Google Analytics', icon: '📈' },
                    { name: 'Google Maps', icon: '🗺️' },
                    { name: 'Google Photos', icon: '🖼️' },
                    { name: 'Google Fit', icon: '💪' },
                    { name: 'Zapier MCP', icon: '⚡' },
                  ].map((tool) => (
                    <div
                      key={tool.name}
                      className="flex items-center gap-4 rounded-[16px] border border-white/[0.08] bg-white/[0.02] p-4 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/[0.05] text-xl">
                        {tool.icon}
                      </div>
                      <div className="flex flex-1 items-center justify-between">
                        <span className="text-[14px] font-medium text-white">{tool.name}</span>
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded-[6px] border-white/[0.25] bg-white/[0.05] text-lime-400 focus:ring-2 focus:ring-lime-400/50 focus:ring-offset-0"
                          defaultChecked={true}
                          aria-label={`Toggle ${tool.name} integration`}
                          title={`Toggle ${tool.name} integration`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 border-t border-white/[0.10] bg-black/95 p-4">
              <button
                onClick={() => setShowTools(false)}
                className="flex w-full items-center justify-center gap-3 rounded-[22px] bg-lime-400 py-5 text-[13px] font-black uppercase tracking-[0.16em] text-black transition-all hover:bg-lime-300 active:scale-95"
              >
                <CheckCircle className="h-4 w-4" />
                DONE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
