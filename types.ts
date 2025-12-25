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