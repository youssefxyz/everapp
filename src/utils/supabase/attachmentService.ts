import { supabase } from '@/lib/supabase/client';
import { MessageContent } from './messageTypes';

const attachmentService = {
  async uploadAttachment(conversationId: string, file: File): Promise<MessageContent> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${conversationId}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);
      
      if (error) throw error;
      
      const { data: publicUrl } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);
      
      // Determine message type based on file mimetype
      let type: 'image' | 'audio' | 'file' = 'file';
      if (file.type.startsWith('image/')) {
        type = 'image';
      } else if (file.type.startsWith('audio/')) {
        type = 'audio';
      }
      
      return {
        type,
        content: publicUrl.publicUrl,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type
        }
      };
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  },
  
  async deleteAttachment(filePath: string) {
    try {
      const { error } = await supabase.storage
        .from('chat-attachments')
        .remove([filePath]);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw error;
    }
  }
};

export default attachmentService;