'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface ChatReview {
  rating: number;
  text: string;
  author: string;
}

interface ProductCard {
  id: number;
  name: string;
  price: string;
  image: string;
  rating: string | number;
  reviews_count: number;
  category: string;
  description: string;
  topReviews: ChatReview[];
}

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  products?: ProductCard[];
  suggestions?: string[];
  budgetOptions?: Array<{ label: string; value: number }>;
  hasMore?: boolean;
  allProducts?: ProductCard[]; // ✅ Store all matching products
  currentBatch?: number; // ✅ Track which batch is displayed (0, 1, 2, etc)
  hasPrevious?: boolean; // ✅ ADD THIS
  timestamp: Date;
}

interface ChatContextType {
  // State
  messages: ChatMessage[];
  loading: boolean;
  sessionId: string;
  
  // Functions
  sendMessage: (message: string) => Promise<void>;
  clearChat: () => void;
  addBotMessage: (
    content: string,
    products?: ProductCard[],
    suggestions?: string[],
    budgetOptions?: Array<{ label: string; value: number }>,
    hasMore?: boolean,
    allProducts?: ProductCard[] // ✅ Add parameter
  ) => void;
  showMoreProducts: (messageId: string) => void; // ✅ New function
  showPreviousProducts: (messageId: string) => void; 
  getMessageCount: () => number;
}

// ============================================
// CREATE CONTEXT
// ============================================

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// ============================================
// CHAT PROVIDER COMPONENT
// ============================================

export function ChatProvider({ children }: { children: React.ReactNode }) {
  // ============================================
  // STATE - PERSISTENT SESSION ID
  // ============================================
  
  const [sessionId] = useState(() => {
    // Only run on client side
    if (typeof window === 'undefined') return `session-default`;
    
    // Check if sessionId already exists in localStorage
    const existingSessionId = localStorage.getItem('chat_session_id');
    if (existingSessionId) {
      console.log('📌 Using existing session:', existingSessionId);
      return existingSessionId;
    }
    
    // Generate new sessionId only if it doesn't exist
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chat_session_id', newSessionId);
    console.log('✨ Created new session:', newSessionId);
    return newSessionId;
  });

  // ============================================
  // STATE - MESSAGES
  // ============================================
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
const [loading, setLoading] = useState(false);

// ✅ Load messages from localStorage only on mount
useEffect(() => {
  if (typeof window === 'undefined') return;
  
  try {
    const saved = localStorage.getItem(`chat_${sessionId}`);
    if (saved) {
      const parsedMessages = JSON.parse(saved);
      console.log(`📂 Loaded ${parsedMessages.length} messages from localStorage`);
      setMessages(parsedMessages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })));
    }
  } catch (error) {
    console.error('Error loading chat from localStorage:', error);
  }
}, [sessionId]);


  // ============================================
  // AUTO-SAVE TO localStorage
  // ============================================
  
  useEffect(() => {
    // Only save if in browser
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(`chat_${sessionId}`, JSON.stringify(messages));
      console.log(`💾 Chat saved to localStorage (${messages.length} messages)`);
    } catch (error) {
      console.error('Error saving chat to localStorage:', error);
      // Silently fail - localStorage might be full
    }
  }, [messages, sessionId]);

  // ============================================
  // HELPER: Add Bot Message
  // ============================================
  
  const addBotMessage = useCallback(
    (
      content: string,
      products?: ProductCard[],
      suggestions?: string[],
      budgetOptions?: Array<{ label: string; value: number }>,
      hasMore?: boolean,
      allProducts?: ProductCard[] // ✅ Add parameter
    ) => {
      const botMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        type: 'bot',
        content,
        products,
        suggestions,
        budgetOptions,
        hasMore,
        allProducts, // ✅ Store all products
        currentBatch: 0, // ✅ Start at batch 0
        hasPrevious: false, // ✅ ADD THIS - Start with no previous
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    },
    []
  );

  // ============================================
  // HELPER: Show More Products (Next Batch)
  // ============================================
  
  const showMoreProducts = useCallback((messageId: string) => {
  setMessages(prev => prev.map(msg => {
    if (msg.id === messageId && msg.allProducts) {
      const productsPerBatch = 3;
      const nextBatch = (msg.currentBatch || 0) + 1;
      const startIndex = nextBatch * productsPerBatch;
      const endIndex = startIndex + productsPerBatch;
      
      const nextBatchProducts = msg.allProducts.slice(startIndex, endIndex);
      
      console.log(`📦 Showing batch ${nextBatch}: products ${startIndex}-${endIndex}`);
      
      return {
        ...msg,
        products: nextBatchProducts,
        currentBatch: nextBatch,
        hasMore: endIndex < msg.allProducts.length,
        hasPrevious: nextBatch > 0 // ✅ ADD THIS - Can go back if batch > 0
      };
    }
    return msg;
  }));
}, []);

    // ============================================
  // HELPER: Show Previous Products (Previous Batch)
  // ============================================
  
  const showPreviousProducts = useCallback((messageId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.allProducts) {
        const productsPerBatch = 3;
        const previousBatch = Math.max(0, (msg.currentBatch || 0) - 1);
        const startIndex = previousBatch * productsPerBatch;
        const endIndex = startIndex + productsPerBatch;
        
        // Get previous batch of products
        const previousBatchProducts = msg.allProducts.slice(startIndex, endIndex);
        
        console.log(`📦 Showing batch ${previousBatch}: products ${startIndex}-${endIndex}`);
        
        return {
          ...msg,
          products: previousBatchProducts,
          currentBatch: previousBatch,
          hasMore: endIndex < msg.allProducts.length, // Update hasMore
          hasPrevious: previousBatch > 0 // ✅ New: Track if we can go back
        };
      }
      return msg;
    }));
  }, []);


  // ============================================
  // HELPER: Send Message to Backend
  // ============================================
  
  const sendMessage = useCallback(
    async (content: string) => {
      // Validate input
      if (!content.trim()) {
        console.warn('Empty message - not sending');
        return;
      }

      // Get auth token
      const token = localStorage.getItem('studentstore_token');
      if (!token) {
        addBotMessage('❌ You must be logged in to chat. Please sign in first!');
        return;
      }

      // Add user message
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        type: 'user',
        content: content.trim(),
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      setLoading(true);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        const response = await fetch(`${apiUrl}/api/chat/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            message: content.trim(),
            sessionId,
            chatHistory: messages.map(m => ({
              type: m.type,
              content: m.content
            }))
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        // Check if response is successful
        if (result.status === 'success' && result.data) {
          const data = result.data;
          
          addBotMessage(
            data.reply,
            data.products,
            data.suggestions,
            data.budgetOptions,
            data.hasMore,
            data.allProducts || data.products // ✅ Use backend's allProducts if available
          );
          
          console.log('✅ Chat message sent successfully');
        } else {
          throw new Error(result.message || 'Unknown error');
        }
      } catch (error) {
        console.error('Chat error:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addBotMessage(
          `😔 Sorry, I encountered an error: ${errorMessage}. Please try again or refresh the page.`
        );
      } finally {
        setLoading(false);
      }
    },
    [messages, sessionId, addBotMessage]
  );

  // ============================================
  // HELPER: Clear Chat
  // ============================================
  
  const clearChat = useCallback(() => {
    setMessages([]);
    
    // Also clear from localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`chat_${sessionId}`);
        console.log('🗑️ Chat cleared');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
  }, [sessionId]);

  // ============================================
  // HELPER: Get Message Count
  // ============================================
  
  const getMessageCount = useCallback(() => {
    return messages.length;
  }, [messages]);

  // ============================================
  // LISTEN FOR LOGOUT EVENT
  // ============================================
  
  useEffect(() => {
    const handleLogout = () => {
      clearChat();
      
      // Clear the persistent sessionId
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('chat_session_id');
          console.log('🗑️ Session ID cleared');
        } catch (error) {
          console.error('Error clearing session ID:', error);
        }
      }
      
    };
    window.addEventListener('user-logout', handleLogout);
    
    return () => {
      window.removeEventListener('user-logout', handleLogout);
    };
  }, [clearChat]);

  // ============================================
  // PROVIDE CONTEXT
  // ============================================
  
  const value: ChatContextType = {
    messages,
    loading,
    sessionId,
    sendMessage,
    clearChat,
    addBotMessage,
    showMoreProducts, // ✅ Add new function
    showPreviousProducts, // ✅ ADD THIS
    getMessageCount
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

// ============================================
// CUSTOM HOOK: useChat
// ============================================

export function useChat() {
  const context = useContext(ChatContext);
  
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  
  return context;
}
