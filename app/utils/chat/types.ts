// Types for the CSS Assistant, mirroring the sso-rag /chat stream (OpenAI-compatible `chat.completion.chunk` events).

export type ProgressStatus = 'searching' | 'writing';

export type GroundingStatus = 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'NOT_SUPPORTED';

export interface CitationLocation {
  uri?: string;
  pageNumber?: number;
}

export interface Citation {
  title?: string;
  content?: string;
  location?: CitationLocation;
  score?: number;
}

export interface DeltaContent {
  role?: 'assistant' | 'user';
  content?: string;
  citations?: Citation[];
  status?: ProgressStatus;
  grounding_status?: GroundingStatus;
}

export interface StreamChoice {
  index: number;
  delta: DeltaContent;
  finish_reason: 'stop' | null;
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: StreamChoice[];
}

/** In-band error event, sent when the stream fails after it has started. */
export interface StreamError {
  error: string;
}

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  citations?: Citation[];
  streaming?: boolean;
  /** Latest progress update, shown until the answer text arrives. */
  status?: ProgressStatus;
  groundingStatus?: GroundingStatus;
}
