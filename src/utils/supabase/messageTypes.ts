// Message type definitions
export interface MessageContent {
  type: 'text' | 'image' | 'file' | 'audio' | 'emoji';
  content: string | Blob | File;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
    thumbnailUrl?: string;
    path?: string;  // Add path for file URLs
  };
  file?: File;
}

export interface Message {
  id: string;
  conversation_id?: string;
  user_id: string;
  content: string;
  message_type?: string;
  metadata?: any;
  created_at: string;
  is_edited?: boolean;
  sender_name?: string;
  profiles?: {
    id: string;
    username: string;
  };
}