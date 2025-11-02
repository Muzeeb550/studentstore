'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useChat } from '../context/ChatContext';
import { MessageCircle, X, Send, ChevronDown } from 'lucide-react';

export default function ChatAssistant() {
  // ============================================
  // STATE
  // ============================================
  
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false); // ✅ ADD THIS
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null); // ✅ ADD THIS

  
  const { messages, loading, sendMessage, addBotMessage, getMessageCount, showMoreProducts, showPreviousProducts, clearChat } = useChat();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);


  // ============================================
  // CHECK AUTHENTICATION
  // ============================================
  
  useEffect(() => {
    const token = localStorage.getItem('studentstore_token');
    setIsAuthenticated(!!token);
  }, []);

     // ============================================
  // AUTO-SCROLL TO LATEST MESSAGE (Only if at bottom)
  // ============================================
  
   useEffect(() => {
    // Always smooth scroll to latest message when new messages arrive
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50); // Small delay for smooth animation
  }, [messages]);



  // ============================================
  // HANDLE SCROLL - Show/Hide Down Arrow
  // ============================================
  
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollHeight, scrollTop, clientHeight } = messagesContainerRef.current;
    
    // Show down arrow if user is not at the bottom (more than 100px from bottom)
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isAtBottom);
  };

  // ============================================
  // SCROLL TO BOTTOM FUNCTION
  // ============================================
  
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };


  // ============================================
  // FOCUS INPUT WHEN CHAT OPENS
  // ============================================
  
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ============================================
  // SEND GREETING ON FIRST OPEN
  // ============================================
  
  useEffect(() => {
    if (isOpen && messages.length === 0 && isAuthenticated) {
      const userName = (() => {
        try {
          const user = JSON.parse(localStorage.getItem('studentstore_user') || '{}');
          return user.display_name || user.name || 'there';
        } catch {
          return 'there';
        }
      })();
      
      addBotMessage(
        `👋 Hi ${userName}! Welcome to StudentStore Shopping Assistant! What are you looking for today? 🛍️`,
        undefined,
        ['Laptops', 'Earbuds', 'Running Shoes', 'Keyboards', 'Powerbank']
      );
    }
  }, [isOpen, isAuthenticated, messages.length, addBotMessage]);

  // ============================================
  // HANDLE SEND MESSAGE
  // ============================================
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || loading) return;
    
    const messageToSend = input;
    setInput('');
    
    try {
      await sendMessage(messageToSend);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // ============================================
  // HANDLE SUGGESTION CLICK
  // ============================================
  
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    // Auto-send after a short delay
    setTimeout(() => {
      const form = document.querySelector('[data-chat-form]') as HTMLFormElement;
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true }));
      }
    }, 100);
  };

    // ============================================
  // HANDLE BUDGET OPTION CLICK
  // ============================================
  
  const handleBudgetClick = (label: string, value: number) => {
    // ✅ Create a COPY of messages array before reversing
    const category = [...messages]
      .reverse()
      .find(m => m.type === 'user')?.content || '';
    
    const message = `${category} under ${value}`;
    setInput(message);
    
    setTimeout(() => {
      const form = document.querySelector('[data-chat-form]') as HTMLFormElement;
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true }));
      }
    }, 100);
  };


  // ============================================
  // RENDER: Not Authenticated
  // ============================================
  
  if (!isAuthenticated) {
    return (
      <>
        {/* Floating Button */}
        <button
          onClick={() => setShowLoginPrompt(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-student-blue to-student-green text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all hover:scale-110 z-40 active:scale-95"
          title="Sign in to use chat"
        >
          <MessageCircle size={24} />
        </button>

        {/* Login Prompt Modal */}
        {showLoginPrompt && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
            onClick={() => setShowLoginPrompt(false)}
          >
            <div 
              className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-student-blue to-student-green rounded-full p-4">
                  <MessageCircle size={40} className="text-white" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-center text-student-primary mb-2">
                🛍️ Shopping Assistant
              </h2>

              {/* Subtitle */}
              <p className="text-center text-student-secondary text-sm mb-6">
                Sign in to unlock your personal shopping assistant!
              </p>

              {/* Description */}
              <div className="bg-student-light p-4 rounded-lg mb-6 space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🎯</span>
                  <div>
                    <p className="font-semibold text-sm text-student-primary">Find Products</p>
                    <p className="text-xs text-student-secondary">Search by category and budget</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-xl">⭐</span>
                  <div>
                    <p className="font-semibold text-sm text-student-primary">See Reviews</p>
                    <p className="text-xs text-student-secondary">Top-rated student reviews</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-xl">💰</span>
                  <div>
                    <p className="font-semibold text-sm text-student-primary">Budget Friendly</p>
                    <p className="text-xs text-student-secondary">Find products in your budget</p>
                  </div>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                onClick={() => {
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                  window.location.href = `${apiUrl}/auth/google`;
                }}
                className="w-full bg-gradient-to-r from-student-blue to-student-green text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>

              {/* Close Button */}
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="w-full mt-3 text-student-secondary hover:text-student-primary font-medium transition"
              >
                Maybe later
              </button>
            </div>
          </div>
        )}
      </>
    );
  }


  // ============================================
  // RENDER: Authenticated
  // ============================================

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-student-blue to-student-green text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all hover:scale-110 z-40 active:scale-95"
          title="Open Shopping Assistant"
        >
          <div className="relative">
            <MessageCircle size={24} />
            {getMessageCount() > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {getMessageCount() > 9 ? '9+' : getMessageCount()}
              </div>
            )}
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[600px] z-50 overflow-hidden">
                    {/* Header */}
          <div className="bg-gradient-to-r from-student-blue to-student-green text-white p-4 rounded-t-2xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <MessageCircle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Shopping Assistant</h3>
                <p className="text-xs text-white/80">Always here to help! 🎓</p>
              </div>
            </div>
            
            {/* ✅ CLEAR CHAT BUTTON */}
            <button
              onClick={() => clearChat()}
              className="hover:bg-white/20 p-2 rounded-lg transition text-white mr-2"
              title="Clear chat and start fresh"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-2 rounded-lg transition text-white"
            >
              <X size={20} />
            </button>
          </div>


                      {/* Messages Container */}
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 relative"
          >
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <MessageCircle size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Start a conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Bot Message */}
                  {message.type === 'bot' && (
                    <div className="max-w-xs">
                      {/* Text Content */}
                      <div className="bg-white text-gray-800 px-4 py-3 rounded-lg rounded-bl-none shadow-sm border border-gray-200">
                        <p className="text-sm">{message.content}</p>
                      </div>

                      {/* Product Cards */}
                      {message.products && message.products.length > 0 && (
                        <div className="mt-3 space-y-2">
                                                      {/* Show Previous Button */}
                          {message.hasPrevious && (
                            <button
                              onClick={() => showPreviousProducts(message.id)}
                              className="w-full mb-3 px-4 py-2 bg-gradient-to-r from-student-blue to-student-green text-white rounded-lg hover:shadow-md transition font-semibold flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                              </svg>
                              Show Previous Products
                            </button>
                          )}

                          {message.products.map((product) => (
                            <Link
                              key={product.id}
                              href={`/products/${product.id}`}
                              onClick={() => setIsOpen(false)}
                              className="block bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:border-student-blue transition"
                            >
                              <div className="flex gap-3 p-3">
                                {/* Image */}
                                <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded">
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = '/placeholder-product.jpg';
                                    }}
                                  />
                                </div>

                                {/* Product Info */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm text-gray-900 truncate">
                                    {product.name}
                                  </h4>
                                  <p className="text-blue-600 font-bold text-sm">
                                    {product.price}
                                  </p>

                                  {/* Rating */}
                                  {product.rating !== 'N/A' && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <span className="text-yellow-400 text-xs">⭐</span>
                                      <span className="text-xs text-gray-600">
                                        {product.rating}/5 ({product.reviews_count})
                                      </span>
                                    </div>
                                  )}

                                  {/* Top Review */}
                                  {product.topReviews && product.topReviews.length > 0 && (
                                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs border-l-2 border-yellow-400">
                                      <p className="font-semibold text-gray-700 mb-1">
                                        From {product.topReviews[0].author}:
                                      </p>
                                      <p className="text-gray-600 italic">
                                        "{product.topReviews[0].text}"
                                      </p>
                                      <p className="text-yellow-600 font-semibold mt-1">
                                        {product.topReviews[0].rating}⭐
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Arrow */}
                                <div className="flex-shrink-0 flex items-center text-student-blue">
                                  <ChevronDown size={16} className="rotate-[-90deg]" />
                                </div>
                              </div>
                            </Link>
                          ))}

                          {/* ✅ SHOW MORE BUTTON */}
                          {message.hasMore && (
                            <button
                              onClick={() => showMoreProducts(message.id)}
                              className="w-full mt-3 px-4 py-3 bg-gradient-to-r from-student-green to-student-blue text-white rounded-lg hover:shadow-md transition font-semibold flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                              </svg>
                              Show More Products
                            </button>
                          )}
                        </div>
                      )}

                      {/* Suggestion Buttons */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.suggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="px-3 py-1 bg-student-blue text-white text-xs rounded-full hover:bg-student-blue/80 transition font-medium"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Budget Options */}
                      {message.budgetOptions && message.budgetOptions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.budgetOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => handleBudgetClick(option.label, option.value)}
                              className="w-full px-3 py-2 bg-gradient-to-r from-student-green to-student-blue text-white text-sm rounded-lg hover:shadow-md transition font-medium text-left"
                            >
                              💰 {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* User Message */}
                  {message.type === 'user' && (
                    <div className="max-w-xs bg-student-blue text-white px-4 py-3 rounded-lg rounded-br-none shadow-sm">
                      <p className="text-sm">{message.content}</p>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-lg rounded-bl-none shadow-sm border border-gray-200">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to Bottom Button */}
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 bg-student-blue text-white rounded-full p-2 shadow-lg hover:bg-student-blue/90 hover:shadow-xl transition-all animate-bounce z-10"
              title="Scroll to latest message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          )}


          {/* Input Area */}
          <form
            onSubmit={handleSendMessage}
            data-chat-form
            className="border-t border-gray-200 p-3 bg-white flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for products..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-student-blue focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-student-blue hover:bg-student-blue/90 disabled:bg-gray-400 text-white rounded-lg p-2 transition"
              title="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
