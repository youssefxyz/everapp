export interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  is_edited: boolean;
  sender_name: string;
  profiles?: {
    username: string;
  };
}

export interface Conversation {
  conversation_id: string;
  conversations: {
    id: string;
    last_message: string | null;
    last_message_time: string;
  };
  profiles: {
    id: string;
    username: string;
  };
  unread_count: number;
}

export interface OnlineUser {
  id: string;
  username: string;
  last_seen: string;
}

export interface TypingStatus {
  conversation_id: string;
  user_id: string;
  username: string;
}