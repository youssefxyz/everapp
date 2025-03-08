import { MessageContent } from './messageTypes';

const emojiService = {
  // Get frequently used emojis
  getFrequentEmojis() {
    return ['😊', '👍', '❤️', '😂', '🎉', '🔥', '👏', '😍', '🙏', '😎'];
  },
  
  // Create emoji message
  createEmojiMessage(emoji: string): MessageContent {
    return {
      type: 'emoji',
      content: emoji
    };
  },
  
  // Search emojis by keyword
  searchEmojis(keyword: string) {
    // This would be expanded with a proper emoji database
    const emojiMap = {
      'happy': ['😊', '😃', '😄', '😁', '😆'],
      'sad': ['😢', '😭', '😞', '😔', '😟'],
      'love': ['❤️', '😍', '🥰', '💕', '💓'],
      'angry': ['😠', '😡', '🤬', '😤', '😒']
    };
    
    const lowerKeyword = keyword.toLowerCase();
    return Object.entries(emojiMap)
      .filter(([key]) => key.includes(lowerKeyword))
      .flatMap(([_, emojis]) => emojis);
  }
};

export default emojiService;