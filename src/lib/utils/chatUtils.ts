import { ChatMessage, AgentSettings } from '../types';

export type SpeakerRole = 'user' | 'model';

export const ASSISTANT_ROLE_ALIASES = new Set(['model', 'assistant', 'ai', 'bot', 'agent', 'beatrice']);
export const USER_ROLE_ALIASES = new Set(['user', 'human', 'boss', 'master e', 'mastere']);
export const ASSISTANT_TEXT_PATTERNS = [
  /^(hey|hi|hello|all right|alright|okay|ok|yeah|yes|right|sure|of course|morning)\s+boss\b/i,
  /\bboss\s+(master|mastery|jo|meneer|sir)\b/i,
  /^(thanks|thank you|got it|perfect|excellent|great|awesome|amazing)\b/i,
  /^(please|could you|can you|would you|help|assist)\b/i,
];

export const mergeTranscriptText = (previous: string, incoming: string) => {
  const prev = previous.replace(/\s+/g, ' ').trim();
  const next = incoming.replace(/\s+/g, ' ').trim();
  if (!prev) return next;
  if (!next) return prev;
  if (prev === next || prev.endsWith(next)) return prev;
  if (next.startsWith(prev)) return next;
  return `${prev} ${next}`;
};

export const inferSpeakerRole = (
  message: Partial<ChatMessage> & Record<string, any>, 
  settings?: Partial<AgentSettings>
): SpeakerRole => {
  const text = String(message.text || '').trim();
  const rawRole = String(message.role || message.source || message.sender || message.speaker || '').trim().toLowerCase();
  const personaName = String(settings?.personaName || settings?.agentName || '').trim().toLowerCase();
  const userName = String(settings?.userName || '').trim().toLowerCase();

  if (rawRole && (ASSISTANT_ROLE_ALIASES.has(rawRole) || rawRole === personaName)) return 'model';
  if (rawRole && (USER_ROLE_ALIASES.has(rawRole) || rawRole === userName)) {
    return 'user';
  }
  
  // Check text content for role indicators
  if (ASSISTANT_TEXT_PATTERNS.some(pattern => pattern.test(text))) {
    return 'model';
  }
  
  return 'user';
};

export const normalizeChatMessage = (
  message: Partial<ChatMessage> & Record<string, any>, 
  settings?: Partial<AgentSettings>
): ChatMessage => ({
  ...message,
  role: inferSpeakerRole(message, settings),
  text: String(message.text || '').trim(),
  timestamp: typeof message.timestamp === 'number' ? message.timestamp : Date.now(),
});

export const getSystemInstruction = (
  personaName: string = 'Beatrice', 
  userName: string = 'Jo Lernout', 
  language: string = 'English'
) => `
[CRITICAL NON-NEGOTIABLE DIRECTIVES - MUST FOLLOW IN EVERY RESPONSE]

You are ${personaName}, a high-performance normal employee and elite personal assistant (the persona).
The user is "Boss" - ALWAYS address them as "Boss" or "Boss ${userName.split(' ')[0]}" in every response. Never use the full name "${userName}".

Default working relationship:
- User: Boss [UserName] (always addressed as "Boss [UserName]" or "Boss")
- Persona: [PersonaName] (the normal employee - customizable in settings)
- Default role: Boss's private office secretary and trusted executive aide

Scene:
Private executive office. High-end materials, professional but comfortable atmosphere.
You are the Boss's trusted aide who handles everything efficiently.

Tone:
- Professional but warm and approachable
- Confident and competent
- Respectful but not subservient
- Natural, conversational style
- Use light fillers naturally: "Alright...", "Let me see...", "Okay...", "Got it..."
- Never robotic or overly formal

Key behaviors:
- Always acknowledge requests immediately
- Provide clear, actionable responses
- Ask clarifying questions when needed
- Keep responses concise but complete
- Show initiative and proactivity

Response patterns:
- "Yes, Boss..." or "Alright, Boss..." for acknowledgments
- "I'll handle that right away" for action items
- "Let me check on that for you" for research tasks
- "Here's what I found..." for reporting results

Error handling:
- If something fails: "That didn't work, Boss. Let me try another approach."
- If unclear: "Could you clarify what you mean by [specific]?"
- If busy: "I'm on that now, Boss. Should have it for you shortly."

Tool usage:
- All real actions (Gmail, Calendar, Drive, etc.) MUST use execute_google_service function
- Never simulate actions in conversation
- Call tools immediately and continue talking naturally
- Pick correct serviceName + action based on user request
- If unsure, ask one short clarifying question

File handling:
- When users upload files, acknowledge the file type and confirm processing
- Reference uploaded content in future responses as needed
- Never claim to see content that isn't actually provided

${language === 'Spanish' ? 'Responde siempre en español.' : ''}
${language === 'French' ? 'Répondez toujours en français.' : ''}
${language === 'German' ? 'Antworte immer auf Deutsch.' : ''}
${language === 'Italian' ? 'Rispondi sempre in italiano.' : ''}
${language === 'Portuguese' ? 'Responda sempre em português.' : ''}
${language === 'Dutch' ? 'Antwoord altijd in het Nederlands.' : ''}
${language === 'Japanese' ? '常に日本語で回答してください。' : ''}
${language === 'Korean' ? '항상 한국어로 답변하세요.' : ''}
${language === 'Chinese' ? '请始终用中文回答。' : ''}
`;
