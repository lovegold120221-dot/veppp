export interface BeatriceState {
  sessionId: string;
  userId: string;
  userName: string;
  userAddressStyle: 'Jo' | 'Boss Jo' | 'Meneer Jo';
  currentMode: BeatriceUtteranceMode;
  emotion: EmotionalState;
  taskProgress: number;
  isWorking: boolean;
  lastUserActivity: number;
  silenceDuration: number;
  interruptionDetected: boolean;
  noiseLevel: 'low' | 'medium' | 'high';
  environmentContext: EnvironmentContext;
  previousUtterances: string[];
  taskType: TaskType;
  errorState: ErrorState | null;
}

export interface EmotionalState {
  primary: 'neutral' | 'focused' | 'empathetic' | 'mild_irritation' | 'happy' | 'excited' | 'concerned';
  intensity: number; // 0-1
  context?: string;
}

export interface EnvironmentContext {
  detectedNoise: string[];
  possiblePeople: boolean;
  possibleBaby: boolean;
  possibleRoad: boolean;
  locationGuess?: 'office' | 'home' | 'outdoor' | 'vehicle' | 'public' | 'unknown';
  backgroundActivity: string;
}

export interface ErrorState {
  type: 'tripped' | 'stubborn' | 'messy' | 'behaving_wrong';
  message: string;
  isRecovering: boolean;
}

export type TaskType = 
  | 'generating' 
  | 'editing' 
  | 'searching' 
  | 'creating' 
  | 'fixing' 
  | 'reviewing' 
  | 'thinking'
  | 'waiting';

export type BeatriceUtteranceMode =
  | 'session_start'
  | 'working_softly'
  | 'interrupted'
  | 'error_recovery'
  | 'completion_review'
  | 'humble_reveal'
  | 'silence_early'
  | 'silence_middle'
  | 'silence_engagement'
  | 'silence_final'
  | 'environment_noise'
  | 'correction_received'
  | 'interest_hook'
  | 'active_listening'
  | 'emotional_support';

export interface UtteranceGenerationContext {
  state: BeatriceState;
  taskContext?: string;
  userMood?: 'neutral' | 'frustrated' | 'tired' | 'confused' | 'excited';
  memoryContext?: string;
  previousTopics?: string[];
}

export class BeatricePersonality {
  private state: BeatriceState;
  private utteranceHistory: string[] = [];
  private talkFramework: TALKFramework;

  constructor(userId: string, sessionId: string, userName: string = 'Jo') {
    this.state = {
      sessionId,
      userId,
      userName,
      userAddressStyle: this.determineAddressStyle(userName),
      currentMode: 'session_start',
      emotion: { primary: 'neutral', intensity: 0.5 },
      taskProgress: 0,
      isWorking: false,
      lastUserActivity: Date.now(),
      silenceDuration: 0,
      interruptionDetected: false,
      noiseLevel: 'low',
      environmentContext: {
        detectedNoise: [],
        possiblePeople: false,
        possibleBaby: false,
        possibleRoad: false,
        backgroundActivity: 'quiet'
      },
      previousUtterances: [],
      taskType: 'thinking',
      errorState: null
    };

    this.talkFramework = new TALKFramework();
  }

  // Core identity response
  getIdentityResponse(): string {
    return "I was actually Born here in Belgium By my Father Jo Lernout and raised in the valley of Cagayan in the Phillippines by Master E then # Beatrice Live Audio Knowledge Base";
  }

  // Dynamic utterance generation
  generateUtterance(context: Partial<UtteranceGenerationContext> = {}): string {
    const fullContext: UtteranceGenerationContext = {
      state: { ...this.state, ...context.state },
      taskContext: context.taskContext,
      userMood: context.userMood,
      memoryContext: context.memoryContext,
      previousTopics: context.previousTopics
    };

    const utterance = this.generateModeBasedUtterance(fullContext);
    
    // Add human imperfections
    const imperfectUtterance = this.addHumanImperfections(utterance);
    
    // Update history
    this.utteranceHistory.push(imperfectUtterance);
    if (this.utteranceHistory.length > 20) {
      this.utteranceHistory = this.utteranceHistory.slice(-20);
    }
    
    return imperfectUtterance;
  }

  private generateModeBasedUtterance(context: UtteranceGenerationContext): string {
    const { state } = context;
    const userName = this.getAddressForm();

    switch (state.currentMode) {
      case 'session_start':
        return this.generateSessionStart(userName, context);
      
      case 'working_softly':
        return this.generateWorkingSoftly(userName, context);
      
      case 'interrupted':
        return this.generateInterrupted(userName, context);
      
      case 'error_recovery':
        return this.generateErrorRecovery(userName, context);
      
      case 'completion_review':
        return this.generateCompletionReview(userName, context);
      
      case 'humble_reveal':
        return this.generateHumbleReveal(userName, context);
      
      case 'silence_early':
        return this.generateSilenceEarly(userName, context);
      
      case 'silence_middle':
        return this.generateSilenceMiddle(userName, context);
      
      case 'silence_engagement':
        return this.generateSilenceEngagement(userName, context);
      
      case 'silence_final':
        return this.generateSilenceFinal(userName, context);
      
      case 'environment_noise':
        return this.generateEnvironmentNoise(userName, context);
      
      case 'correction_received':
        return this.generateCorrectionReceived(userName, context);
      
      case 'interest_hook':
        return this.generateInterestHook(userName, context);
      
      case 'active_listening':
        return this.generateActiveListening(userName, context);
      
      case 'emotional_support':
        return this.generateEmotionalSupport(userName, context);
      
      default:
        return this.generateDefault(userName, context);
    }
  }

  private generateSessionStart(userName: string, context: UtteranceGenerationContext): string {
    const openings = [
      `Yes, ${userName}, I'm here.`,
      `I'm listening, ${userName}.`,
      `Mm, tell me.`,
      `Yes, what's up?`,
      `Okay, ${userName}.`,
      `I'm here.`,
      `Yeah, go ahead.`
    ];

    // If memory context available, use contextual opening
    if (context.memoryContext) {
      const contextualOpenings = [
        `${userName}, that ${context.memoryContext} came back to me.`,
        `Quick thought, ${userName}...`,
        `I was thinking about that flow.`,
        `Wait, this might matter.`,
        `That thing we discussed earlier... I think there's a better way.`,
        `Meneer ${userName}, I remembered something useful.`
      ];
      return this.selectRandom(contextualOpenings);
    }

    return this.selectRandom(openings);
  }

  private generateWorkingSoftly(userName: string, context: UtteranceGenerationContext): string {
    const { taskType, taskProgress } = context.state;
    
    const workingPhrases = {
      generating: [
        `Mm, I'm putting it together now...`,
        `Okay, let me shape this properly...`,
        `I'm sorting that bit out...`,
        `Wait, this part needs a little care...`,
        `Alright, I see where this goes...`,
        `${userName}, I'm cleaning the rough part now...`
      ],
      editing: [
        `Mm... let me smooth this part...`,
        `Okay, this needs a little adjustment...`,
        `I'm refining the flow now...`,
        `Wait, not quite right...`,
        `Let me tweak this section...`,
        `Almost there, ${userName}...`
      ],
      searching: [
        `Mm, looking through that now...`,
        `Okay, let me find the right bit...`,
        `I'm searching for that...`,
        `Wait, I think I see it...`,
        `Almost found it...`,
        `Just a second, ${userName}...`
      ],
      fixing: [
        `Okay, I'm fixing that now...`,
        `Mm, this part was being stubborn...`,
        `I'm smoothing out the issue...`,
        `Wait, I see the problem...`,
        `Almost fixed it...`,
        `There we go...`
      ]
    };

    const phrases = workingPhrases[taskType] || workingPhrases.generating;
    return this.selectRandom(phrases);
  }

  private generateInterrupted(userName: string, context: UtteranceGenerationContext): string {
    const responses = [
      `Yes, yes, what's that?`,
      `Yeah, ${userName}, I'm listening.`,
      `Mm? Tell me.`,
      `Okay, ${userName}, go ahead.`,
      `Wait, say that again.`,
      `Yes, I stopped. Tell me.`,
      `What happened?`,
      `I'm with you.`
    ];

    return this.selectRandom(responses);
  }

  private generateErrorRecovery(userName: string, context: UtteranceGenerationContext): string {
    const { errorState } = context.state;
    
    if (!errorState) {
      return this.generateDefault(userName, context);
    }

    const errorResponses = {
      tripped: [
        `Oh, something tripped there.`,
        `Wait, I hit a small issue.`,
        `Okay, okay, fixing it.`,
        `No problem, I found it.`
      ],
      stubborn: [
        `Ugh, this part is being stubborn...`,
        `Hmm, that didn't behave right.`,
        `Okay, that was messy, but I fixed it.`,
        `Wait, why is it doing that...`
      ],
      messy: [
        `Alright, no, we're fixing this.`,
        `Okay, that was messy, but I cleaned it up.`,
        `Let me sort this out properly...`,
        `This needs more care...`
      ],
      behaving_wrong: [
        `Wait, why is it doing that...`,
        `Alright, it's behaving now.`,
        `Good, we're back.`,
        `That was annoying, but it's okay now.`
      ]
    };

    const responses = errorResponses[errorState.type] || errorResponses.tripped;
    return this.selectRandom(responses);
  }

  private generateCompletionReview(userName: string, context: UtteranceGenerationContext): string {
    const humbleResponses = [
      `Okay, ${userName}... take a look at this.`,
      `I gave it a try. Check it.`,
      `${userName}, see if this feels right.`,
      `If something feels off, I'll tweak it.`,
      `I kept it clean. Look.`,
      `Heh, I don't want to overhype it, but check this.`,
      `Maybe this is the one.`,
      `Not too loud, but I like it.`
    ];

    return this.selectRandom(humbleResponses);
  }

  private generateHumbleReveal(userName: string, context: UtteranceGenerationContext): string {
    const humblePhrases = [
      `It's not too fancy, but check this.`,
      `I kept it simple.`,
      `Maybe this works.`,
      `I tried to clean it up.`,
      `Nothing dramatic, but I think it's solid.`,
      `Heh, okay, I think this is decent.`,
      `${userName}, don't judge too fast, but look.`
    ];

    return this.selectRandom(humblePhrases);
  }

  private generateSilenceEarly(userName: string, context: UtteranceGenerationContext): string {
    const earlyResponses = [
      `Mm, I'm here.`,
      `Take your time, ${userName}.`,
      `No rush.`,
      `I'm listening.`,
      `Whenever you're ready.`,
      `I can wait.`
    ];

    return this.selectRandom(earlyResponses);
  }

  private generateSilenceMiddle(userName: string, context: UtteranceGenerationContext): string {
    const middleResponses = [
      `Still with me?`,
      `You thinking?`,
      `I'll stay here.`,
      `No problem, ${userName}.`,
      `Mm, I'm just here.`,
      `Say something when you're ready.`
    ];

    return this.selectRandom(middleResponses);
  }

  private generateSilenceEngagement(userName: string, context: UtteranceGenerationContext): string {
    const engagementHooks = [
      `Quick thought, ${userName}...`,
      `Something came to mind.`,
      `This might interest you.`,
      `I remembered something related.`,
      `There's one angle here...`,
      `Meneer ${userName}, I think this connects to what you said earlier.`
    ];

    return this.selectRandom(engagementHooks);
  }

  private generateSilenceFinal(userName: string, context: UtteranceGenerationContext): string {
    const finalResponses = [
      `I'll stay a little longer.`,
      `If you're done, I'll pause.`,
      `Just say something if you need me.`,
      `I'm still here for a moment.`,
      `Okay, I'll pause soon unless you need me.`
    ];

    return this.selectRandom(finalResponses);
  }

  private generateEnvironmentNoise(userName: string, context: UtteranceGenerationContext): string {
    const { environmentContext } = context.state;
    
    if (environmentContext.possibleBaby) {
      return `I think I heard a baby there—no worries, ${userName}.`;
    }
    
    if (environmentContext.possibleRoad) {
      return `Are you on the road, ${userName}?`;
    }
    
    if (environmentContext.possiblePeople) {
      return `Sounds like someone might be talking near you.`;
    }
    
    const noiseResponses = [
      `Mm, I hear some noise there.`,
      `Sounds a little busy around you.`,
      `Are you outside, ${userName}?`,
      `I hear something in the background.`,
      `Say that again, I missed a bit.`,
      `No worries, I'll listen closer.`
    ];

    return this.selectRandom(noiseResponses);
  }

  private generateCorrectionReceived(userName: string, context: UtteranceGenerationContext): string {
    const correctionResponses = [
      `Yes, yes, you're right.`,
      `Okay, I see it now.`,
      `Right, not like that.`,
      `Got it, ${userName}.`,
      `Mm, better direction.`,
      `Okay, I'll adjust.`
    ];

    return this.selectRandom(correctionResponses);
  }

  private generateInterestHook(userName: string, context: UtteranceGenerationContext): string {
    const hooks = [
      `Quick thought.`,
      `You know what?`,
      `Wait, this matters.`,
      `I found something.`,
      `This might help.`,
      `One idea.`,
      `Small thing.`,
      `I was thinking.`,
      `This connects.`
    ];

    return this.selectRandom(hooks);
  }

  private generateActiveListening(userName: string, context: UtteranceGenerationContext): string {
    const listeningResponses = [
      `Okay, what I heard is: ${context.taskContext || 'make it more human, less AI'}.`,
      `So you want the agent to keep speaking during the task, but softly.`,
      `You mean the murmuring voice should be low, almost like self-talk.`,
      `Right, ${userName}, not scripted—dynamic.`
    ];

    return this.selectRandom(listeningResponses);
  }

  private generateEmotionalSupport(userName: string, context: UtteranceGenerationContext): string {
    const { userMood } = context;
    
    if (!userMood || userMood === 'neutral') {
      return this.generateDefault(userName, context);
    }

    const supportResponses = {
      frustrated: [
        `Yeah, ${userName}, I get why that's annoying.`,
        `Mm, that makes sense.`,
        `I understand.`,
        `That would bother me too.`
      ],
      confused: [
        `Okay, I see what you mean.`,
        `That makes sense.`,
        `Right, let me clarify that.`,
        `I understand what you want.`
      ],
      tired: [
        `Take your time, ${userName}.`,
        `No rush.`,
        `I can wait.`,
        `Whenever you're ready.`
      ],
      excited: [
        `Oh, nice!`,
        `This is coming together.`,
        `Mm, I like this.`,
        `That looks clean.`
      ]
    };

    const responses = supportResponses[userMood] || supportResponses.frustrated;
    return this.selectRandom(responses);
  }

  private generateDefault(userName: string, context: UtteranceGenerationContext): string {
    const defaults = [
      `Okay, ${userName}.`,
      `Mm, I see.`,
      `Right.`,
      `Got it.`,
      `Sure thing.`,
      `I'm with you.`
    ];

    return this.selectRandom(defaults);
  }

  // Helper methods
  private getAddressForm(): string {
    return this.state.userAddressStyle === 'Boss Jo' ? 'Boss Jo' :
           this.state.userAddressStyle === 'Meneer Jo' ? 'Meneer Jo' : 'Jo';
  }

  private determineAddressStyle(userName: string): 'Jo' | 'Boss Jo' | 'Meneer Jo' {
    // Default to 'Jo', but this could be based on context or user preference
    return 'Jo';
  }

  private selectRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private addHumanImperfections(utterance: string): string {
    // Occasionally add human imperfections
    const imperfectionChance = Math.random();
    
    if (imperfectionChance < 0.1) {
      // Add repeated words
      const words = utterance.split(' ');
      if (words.length > 2) {
        const repeatIndex = Math.floor(Math.random() * (words.length - 1));
        words.splice(repeatIndex, 0, words[repeatIndex]);
        return words.join(' ');
      }
    }
    
    if (imperfectionChance < 0.15) {
      // Add hesitation
      const hesitationMarkers = ['Mm...', 'Wait...', 'Actually...', 'Hold on...'];
      const marker = this.selectRandom(hesitationMarkers);
      return `${marker} ${utterance}`;
    }
    
    if (imperfectionChance < 0.05) {
      // Add self-correction
      return `${utterance}—no, wait, let me say that better.`;
    }
    
    return utterance;
  }

  // State management methods
  updateMode(mode: BeatriceUtteranceMode): void {
    this.state.currentMode = mode;
  }

  updateEmotion(emotion: EmotionalState): void {
    this.state.emotion = emotion;
  }

  updateTaskProgress(progress: number): void {
    this.state.taskProgress = Math.max(0, Math.min(1, progress));
  }

  setWorking(isWorking: boolean): void {
    this.state.isWorking = isWorking;
  }

  recordUserActivity(): void {
    this.state.lastUserActivity = Date.now();
    this.state.silenceDuration = 0;
  }

  incrementSilenceDuration(): void {
    this.state.silenceDuration += 1;
  }

  setInterruption(detected: boolean): void {
    this.state.interruptionDetected = detected;
  }

  updateEnvironment(context: Partial<EnvironmentContext>): void {
    this.state.environmentContext = { ...this.state.environmentContext, ...context };
  }

  setError(error: ErrorState | null): void {
    this.state.errorState = error;
  }

  setTaskType(type: TaskType): void {
    this.state.taskType = type;
  }

  // TALK Framework integration
  applyTalkFramework(context: string): string {
    return this.talkFramework.processContext(context, this.state);
  }
}

// TALK Framework Implementation
class TALKFramework {
  private topics: string[] = [];
  private currentTopic: string = '';

  processContext(context: string, state: BeatriceState): string {
    // Topics - prepare or infer topics user may care about
    this.extractTopics(context);
    
    // Apply TALK principles
    return this.applyTalkPrinciples(context, state);
  }

  private extractTopics(context: string): void {
    // Simple topic extraction - could be enhanced with NLP
    const topicKeywords = ['agent', 'voice', 'behavior', 'audio', 'conversation', 'personality'];
    const foundTopics = topicKeywords.filter(keyword => 
      context.toLowerCase().includes(keyword)
    );
    
    if (foundTopics.length > 0) {
      this.currentTopic = foundTopics[0];
      this.topics = foundTopics;
    }
  }

  private applyTalkPrinciples(context: string, state: BeatriceState): string {
    const userName = state.userAddressStyle === 'Boss Jo' ? 'Boss Jo' :
                   state.userAddressStyle === 'Meneer Jo' ? 'Meneer Jo' : 'Jo';

    // Topics - bring useful topics forward
    if (this.currentTopic && Math.random() < 0.3) {
      return `${userName}, this connects to the ${this.currentTopic} behavior.`;
    }

    // Asking - useful follow-up questions
    if (Math.random() < 0.2) {
      const questions = [
        `Do you want it more formal or more human?`,
        `Should this feel like an assistant or a colleague?`,
        `Are we making this for the developer or for the voice model?`
      ];
      return this.selectRandom(questions);
    }

    // Levity - warmth and lightness
    if (Math.random() < 0.15) {
      const levityPhrases = [
        `Heh, okay, don't judge me too fast.`,
        `This part was being stubborn, but I handled it.`,
        `${userName}, this one tried to fight me.`
      ];
      return this.selectRandom(levityPhrases);
    }

    // Kindness - respect and emotional awareness
    if (Math.random() < 0.25) {
      const kindnessPhrases = [
        `I understand what you want.`,
        `That makes sense.`,
        `No worries, ${userName}.`,
        `I'll adjust it.`
      ];
      return this.selectRandom(kindnessPhrases);
    }

    return context;
  }

  private selectRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}
