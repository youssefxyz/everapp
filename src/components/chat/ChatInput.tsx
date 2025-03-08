import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MessageContent } from '@/utils/supabase/messageTypes';
import { Smile, Paperclip, Mic, Send, X } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: MessageContent) => Promise<void>;
  isLoading?: boolean;
  conversationId: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading = false,
  conversationId 
}) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
      
      mediaRecorder.start(200); // Start recording with 200ms timeslices
      setIsRecording(true);
      
      // Start timer
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };
  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;
    
    const audioDataPromise = new Promise<Blob>((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: 'audio/webm; codecs=opus' 
          });
          resolve(audioBlob);
        };
      }
    });
    
    // Stop recording
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    try {
      const audioBlob = await audioDataPromise;
      
      if (!audioBlob || audioBlob.size === 0) {
        console.error('No audio data recorded');
        return;
      }

      const fileName = `audio-${Date.now()}.webm`;
      
      await onSendMessage({
        type: 'audio',
        content: audioBlob,
        file: new File([audioBlob], fileName, { type: 'audio/webm' }),  // Add file property
        metadata: {
          duration: recordingTime,
          mimeType: 'audio/webm',
          fileSize: audioBlob.size,
          fileName: fileName
        }
      });
      
      setRecordingTime(0);
    } catch (error) {
      console.error('Error sending audio:', error);
    } finally {
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      // Clear the chunks
      audioChunksRef.current = [];
    }
  };

  const handleEmojiSelect = async (emoji: string) => {
    await onSendMessage({
      type: 'emoji',
      content: emoji
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  const handleSendTextMessage = async () => {
      if (!text.trim()) return;
      
      await onSendMessage({
        type: 'text',
        content: text
      });
      
      setText('');
    };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  const handleSendFile = async () => {
    if (!selectedFile) {
      console.error('No file selected');
      return;
    }
    
    try {
      const fileType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
      
      await onSendMessage({
        type: fileType,
        content: selectedFile,
        file: selectedFile,
        metadata: {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type
        }
      });
      
      setSelectedFile(null);
    } catch (error) {
      console.error('Error sending file:', error);
    }
  };
  return (
    <div className="flex items-center space-x-2 p-2 border-t">
      {selectedFile ? (
        <div className="flex items-center p-2 bg-gray-100 rounded-md flex-1">
          <span className="truncate flex-1">{selectedFile.name}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSelectedFile(null)}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button 
            onClick={handleSendFile} 
            disabled={isLoading}
          >
            Send File
          </Button>
        </div>
      ) : isRecording ? (
        <div className="flex items-center p-2 bg-red-100 rounded-md flex-1">
          <span className="text-red-500 animate-pulse mr-2">● Recording</span>
          <span>{formatTime(recordingTime)}</span>
          <div className="flex-1" />
          <Button 
            variant="destructive" 
            onClick={stopRecording}
          >
            Stop
          </Button>
        </div>
      ) : (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 grid grid-cols-8 gap-1">
              {['😊', '👍', '❤️', '😂', '🎉', '🔥', '👏', '😍', '🙏', '😎', '🤔', '😢', '😭', '😡', '🥰', '🤗'].map(emoji => (
                <button 
                  key={emoji} 
                  className="text-xl hover:bg-gray-100 p-1 rounded"
                  onClick={() => handleEmojiSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5" />
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange} 
            />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={startRecording}
          >
            <Mic className="h-5 w-5" />
          </Button>
          
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendTextMessage();
              }
            }}
          />
          
          <Button 
            onClick={handleSendTextMessage} 
            disabled={!text.trim() || isLoading}
          >
            <Send className="h-5 w-5" />
          </Button>
        </>
      )}
    </div>
  );
};

export default ChatInput;