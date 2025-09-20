// Core types for MisinfoGuard extension

export interface AnalysisResult {
  id: string;
  timestamp: number;
  imageUrl: string;
  imageData?: string;
  ocrResult?: OCRResult;
  aiDetectionResult?: AIDetectionResult;
  qrResult?: QRResult;
  confidence: number;
  status: 'analyzing' | 'completed' | 'error';
  error?: string;
}

export interface OCRResult {
  text: string;
  confidence: number;
  language?: string;
  words?: Array<{
    text: string;
    confidence: number;
    boundingBox?: BoundingBox;
  }>;
}

export interface AIDetectionResult {
  isAIGenerated: boolean;
  confidence: number;
  model?: string;
  details?: {
    faces?: number;
    objects?: string[];
    manipulation?: boolean;
  };
}

export interface QRResult {
  detected: boolean;
  data?: string;
  format?: string;
  position?: BoundingBox;
  isUrlSafe?: boolean;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface APIConfig {
  ocrSpaceKey: string;
  sightEngineUser: string;
  sightEngineSecret: string;
  huggingFaceKey: string;
  geminiKey: string;
}

export interface APIStatus {
  ocrSpace: 'connected' | 'error' | 'unconfigured';
  sightEngine: 'connected' | 'error' | 'unconfigured';
  huggingFace: 'connected' | 'error' | 'unconfigured';
  gemini: 'connected' | 'error' | 'unconfigured';
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  autoAnalyze: boolean;
  showConfidenceScores: boolean;
  saveHistory: boolean;
  apiConfig: APIConfig;
  notifications: boolean;
  popupSize: 'compact' | 'normal' | 'large';
}

export interface AnalysisHistory {
  results: AnalysisResult[];
  totalAnalyses: number;
  lastUpdated: number;
}

export interface ShareData {
  title: string;
  text: string;
  url?: string;
  image?: string;
}

export interface DragDropFile {
  file: File;
  id: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'analyzing' | 'completed' | 'error';
  progress: number;
  result?: AnalysisResult;
}

export interface TextAnalysisResult {
  id: string;
  timestamp: number;
  text: string;
  sentiment?: {
    label: string;
    score: number;
  };
  factCheck?: {
    isFactual: boolean;
    confidence: number;
    sources?: string[];
    explanation?: string;
    verdict?: string;
    correction?: string;
  };
  toxicity?: {
    isToxic: boolean;
    score: number;
    categories?: string[];
  };
  status: 'analyzing' | 'completed' | 'error';
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type?: 'text' | 'fact-check' | 'analysis';
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// Chrome extension message types
export interface ExtensionMessage {
  type: 'ANALYZE_IMAGE' | 'ANALYZE_TEXT' | 'CHAT_MESSAGE' | 'GET_SETTINGS' | 'SAVE_SETTINGS' | 'UPDATE_SETTINGS' | 'GET_HISTORY' | 'GET_ANALYSIS_HISTORY' | 'CLEAR_HISTORY' | 'CLEAR_ANALYSIS_HISTORY' | 'CHECK_API_STATUS' | 'DETECT_QR_CODE' | 'OPEN_POPUP' | 'ANALYZE_IMAGE_FROM_CONTEXT_MENU';
  payload?: any;
}

export interface ExtensionResponse {
  success: boolean;
  data?: any;
  error?: string;
}
