
export enum Language {
  EN = 'EN',
  CN = 'CN'
}

export interface AnalysisResult {
  faceShape: string;
  skinTone: string;
  recommendedHairstyles: Array<{
    name: string;
    description: string;
    reason: string;
  }>;
  recommendedGlasses: Array<{
    style: string;
    description: string;
    reason: string;
  }>;
}

export interface ImageState {
  front: string | null;
  left: string | null;
  right: string | null;
}

export interface GenerationHistoryItem {
  id: string;
  imageUrl: string;
  timestamp: number;
  options: {
    hairName?: string;
    glassesName?: string;
  };
}
