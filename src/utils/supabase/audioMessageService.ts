import { supabase } from '@/lib/supabase/client';
import { MessageContent } from './messageTypes';
import attachmentService from './attachmentService';

const audioMessageService = {
  async uploadAudioMessage(conversationId: string, audioBlob: Blob, duration: number): Promise<MessageContent> {
    try {
      // Convert blob to file
      const file = new File([audioBlob], `audio-message-${Date.now()}.webm`, { 
        type: 'audio/webm' 
      });
      
      // Use attachment service to upload
      const attachment = await attachmentService.uploadAttachment(conversationId, file);
      
      // Add audio-specific metadata
      return {
        ...attachment,
        type: 'audio',
        metadata: {
          ...attachment.metadata,
          duration
        }
      };
    } catch (error) {
      console.error('Error uploading audio message:', error);
      throw error;
    }
  },
  
  getAudioDuration(audioUrl: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = audioUrl;
      
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      
      audio.addEventListener('error', (err) => {
        reject(err);
      });
    });
  }
};

export default audioMessageService;