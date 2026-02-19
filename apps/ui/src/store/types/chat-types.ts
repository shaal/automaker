export interface ImageAttachment {
  id?: string; // Optional - may not be present in messages loaded from server
  data: string; // base64 encoded image data
  mimeType: string; // e.g., "image/png", "image/jpeg"
  filename: string;
  size?: number; // file size in bytes - optional for messages from server
}

export interface TextFileAttachment {
  id: string;
  content: string; // text content of the file
  mimeType: string; // e.g., "text/plain", "text/markdown"
  filename: string;
  size: number; // file size in bytes
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  images?: ImageAttachment[];
  textFiles?: TextFileAttachment[];
}

export interface ChatSession {
  id: string;
  title: string;
  projectId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  archived: boolean;
}

// UI-specific: base64-encoded images with required id and size (extends ImageAttachment)
export interface FeatureImage extends ImageAttachment {
  id: string; // Required (overrides optional in ImageAttachment)
  size: number; // Required (overrides optional in ImageAttachment)
}
