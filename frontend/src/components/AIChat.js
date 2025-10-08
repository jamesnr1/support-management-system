import React, { useState, useRef, useEffect } from 'react';
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
        content: 'Sorry, I encountered an error. Please try again.'
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
        className="ai-chat-button"
      >
        AI Chat
      </button>
    );
  }

  return (
    <div className={`ai-chat-window ${isMinimized ? 'minimized' : ''}`}>
      {/* Chat Header */}
      <div className="ai-chat-header">
        <h3 style={{ margin: 0 }}>AI Assistant</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isMinimized ? '+' : '-'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="ai-chat-messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`ai-message ${msg.role}`}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="ai-message assistant">
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="ai-chat-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about roster..."
              disabled={isLoading}
            />
            <button onClick={handleSend} disabled={isLoading}>
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AIChat;
