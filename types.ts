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

export type Theme = 'dark' | 'light' | 'live9' | 'vaporwave' | 'matrix' | 'rust' | 'ocean';

export interface UserPreferences {
  // Core
  detailLevel: 'beginner' | 'intermediate' | 'expert';
  deviceSuite: 'stock' | 'm4l' | 'suite';
  creativity: 'standard' | 'experimental';
  
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