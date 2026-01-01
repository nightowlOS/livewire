export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
  timestamp: number;
}

export interface GenerationRequest {
  prompt: string;
  focus: 'sound-design' | 'workflow' | 'effect-rack';
}

export enum SoundCategory {
  BASS = 'Bass',
  LEAD = 'Lead',
  PAD = 'Pad',
  DRUMS = 'Drums',
  FX = 'FX',
  GLITCH = 'Glitch'
}

export type Theme = 'dark' | 'light' | 'live9' | 'vaporwave' | 'matrix' | 'rust' | 'ocean' | 'custom';

export interface CustomTheme {
  id: string;
  name: string;
  colors: {
    base: string;
    surface: string;
    panel: string;
    border: string;
    text: string;
    muted: string;
    accent: string;
  };
}

export interface UserPreferences {
  // Core
  detailLevel: 'beginner' | 'intermediate' | 'expert';
  deviceSuite: 'stock' | 'm4l' | 'suite';
  creativity: 'standard' | 'experimental';
  
  // Granular Controls (1-10)
  sentenceComplexity: number;
  jargonLevel: number;
  deviceExplanationDepth: number;

  // MIDI Generator Specifics
  midiComplexity: number; // 1 (Simple) - 10 (Chaotic)
  midiMusicality: number; // 1 (Atanonal) - 10 (Strict Scale)
  
  // New Configurations
  os: 'mac' | 'windows';
  liveVersion: '12' | '11';
  genre: 'techno' | 'house' | 'hiphop' | 'ambient' | 'general';
  tone: 'encouraging' | 'professional' | 'technical';
  outputLength: 'concise' | 'balanced' | 'detailed';
  useEmojis: boolean;
  useAnalogies: boolean;
  showShortcuts: boolean;
  format: 'steps' | 'paragraphs' | 'bullet_points';
  includeTroubleshooting: boolean;
}

export interface SavedTemplate {
  id: string;
  name: string;
  content: string;
  category?: string;
  createdAt: number;
}