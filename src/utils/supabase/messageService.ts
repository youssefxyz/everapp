import { supabase } from '@/lib/supabase/client';
import { Message } from '@/types/chat';

interface MessageResponse {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  is_edited: boolean;
  profiles: Array<{
    username: string;
  }>;
}

export const messageService = {
  sendMessage: async (
    conversationId: string, 
    userId: string, 
    content: string | File | Blob, 
    options?: { 
      type?: string, 
      metadata?: any 
    }
  ) => {
    try {
      let contentToStore: string;

      // Handle file uploads
      if (content instanceof File || content instanceof Blob) {
        // Early validation with detailed logging
        if (!content) {
          console.error('Content validation failed: content is null/undefined');
          throw new Error('No file provided');
        }

        console.log('Initial content check:', {
          type: content.type,
          size: content.size,
          isFile: content instanceof File,
          isBlob: content instanceof Blob,
          options: JSON.stringify(options)
        });

        // For audio recordings
        const isAudio = options?.type === 'audio';
        const timestamp = Date.now();

        // Ensure content is valid before creating File
        if (!(content instanceof File) && !(content instanceof Blob)) {
          console.error('Content is neither File nor Blob');
          throw new Error('Invalid content type');
        }

        // Create file with appropriate name and type
        let file: File;
        try {
          file = content instanceof File ? content : new File(
            [content],
            isAudio ? `audio-${timestamp}.webm` : `${options?.type || 'file'}-${timestamp}${getFileExtension(content.type)}`,
            { 
              type: isAudio ? 'audio/webm' : (content.type || 'application/octet-stream'),
              lastModified: timestamp
            }
          );

          console.log('File creation successful:', {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
          });
        } catch (fileError) {
          console.error('File creation failed:', fileError);
          throw new Error('Failed to create file from content');
        }

        if (file.size === 0) {
          console.error('File size validation failed: size is 0');
          throw new Error('File is empty');
        }

        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${conversationId}/${timestamp}-${safeFileName}`;

        // Upload the file
        const { data: fileData, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: true
          });

        if (uploadError) {
          console.error('Upload error details:', uploadError);
          throw uploadError;
        }

        if (!fileData?.path) {
          throw new Error('Upload successful but no path returned');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileData.path);

        contentToStore = publicUrl;
      } else {
        contentToStore = content;
      }

      // Insert the message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          content: contentToStore,
          message_type: options?.type,
          metadata: {
            ...options?.metadata,
            path: contentToStore // Store the URL in metadata for reference
          },
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  },
  async fetchMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        user_id,
        created_at,
        is_edited,
        profiles (
          username
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data as unknown as MessageResponse[]).map(message => ({
      id: message.id,
      content: message.content,
      user_id: message.user_id,
      created_at: message.created_at,
      is_edited: message.is_edited,
      sender_name: message.profiles[0]?.username || ''
    }));
  },

  async markAsRead(conversationId: string, userId: string) {
    const { error } = await supabase
      .from('conversation_participants')
      .update({ unread_count: 0 })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
  }
};

const getFileExtension = (mimeType: string): string => {
  const extensions: { [key: string]: string } = {
    'audio/webm': '.webm',
    'audio/mp3': '.mp3',
    'audio/wav': '.wav',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'application/pdf': '.pdf'
  };
  return extensions[mimeType] || '';
};