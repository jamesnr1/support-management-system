import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Minimize2, Maximize2 } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AIChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I can help you with roster questions. Ask me about worker availability, shift coverage, or suggest workers for specific times.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await axios.post(`${API}/chat`, {
        question: userMessage
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.answer
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again or check if the AI service is configured.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #D4A574, #B8956F)',
          border: '2px solid #E5C199',
          color: '#2D2B28',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(212, 165, 116, 0.4)',
          transition: 'all 0.3s ease',
          zIndex: 1000
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(212, 165, 116, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(212, 165, 116, 0.4)';
        }}
      >
        <MessageCircle size={28} />
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        width: '400px',
        height: isMinimized ? '60px' : '600px',
        background: 'linear-gradient(135deg, #3E3B37, #3E3B37)',
        border: '2px solid #D4A574',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        transition: 'height 0.3s ease'
      }}
    >
      {/* Header */}
      <div style={{
        background: '#4A4641',
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #2D2B28',
        borderRadius: '10px 10px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageCircle size={20} color="#D4A574" />
          <h4 style={{ margin: 0, color: '#D4A574', fontSize: '1.1rem', fontWeight: '600' }}>
            🤖 Roster Assistant
          </h4>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#E8DDD4',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#E8DDD4',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }}
              >
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: msg.role === 'user' ? '#D4A574' : '#4A4641',
                  color: msg.role === 'user' ? '#2D2B28' : '#E8DDD4',
                  fontSize: '0.95rem',
                  lineHeight: '1.4',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{
                alignSelf: 'flex-start',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: '#4A4641',
                color: '#E8DDD4',
                fontSize: '0.95rem'
              }}>
                <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '1rem',
            borderTop: '1px solid #2D2B28',
            background: '#3E3B37'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about workers, shifts, availability..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #4A4641',
                  background: '#2D2B28',
                  color: '#E8DDD4',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: (!input.trim() || isLoading) ? '#6B6B6B' : '#D4A574',
                  color: '#2D2B28',
                  cursor: (!input.trim() || isLoading) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
              >
                <Send size={18} />
              </button>
            </div>
            <div style={{
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: '#9CA3AF',
              textAlign: 'center'
            }}>
              Press Enter to send • Shift+Enter for new line
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIChat;

