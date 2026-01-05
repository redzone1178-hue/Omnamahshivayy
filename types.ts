
export enum ViewType {
  CHAT = 'CHAT',
  VOICE = 'VOICE',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  INFO = 'INFO'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  groundingSources?: Array<{
    title: string;
    uri: string;
  }>;
  imageUrl?: string;
}

export interface AudioConfig {
  sampleRate: number;
  numChannels: number;
}
