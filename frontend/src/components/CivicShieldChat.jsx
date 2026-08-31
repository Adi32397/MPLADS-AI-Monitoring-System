import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import { api } from '../api';

// Renders **bold** and newlines in chat messages
function FormattedMessage({ text }) {
  const lines = text.split('\n');
  return (
    <span>
      {lines.map((line, i) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <span key={i}>
            {parts.map((part, j) =>
              j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
            )}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </span>
  );
}

export default function CivicShieldChat({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hello ${user?.name || 'Officer'}. I am CivicShield AI. How can I assist you with your MPLADS monitoring today?` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMsg = message.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await api.askCivicShieldAi(userMsg, user);
      setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "SYSTEM ERROR: Unable to process request. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-[#00D4FF] text-slate-900 p-4 rounded-full shadow-[0_0_20px_rgba(0,212,255,0.4)] hover:scale-110 transition-transform z-50 flex items-center justify-center group"
        >
          <Bot size={24} />
          <div className="absolute inset-0 bg-[#00D4FF] rounded-full animate-ping opacity-20 group-hover:opacity-40"></div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-[#020b14] border border-[#00D4FF]/30 rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden font-sans">
          
          {/* Header */}
          <div className="bg-[#00D4FF]/10 border-b border-[#00D4FF]/20 p-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00D4FF]/20 flex items-center justify-center text-[#00D4FF]">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="text-[#00D4FF] font-bold text-sm tracking-widest uppercase">CivicShield AI</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-500 text-[10px] tracking-widest">ONLINE</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-[#00D4FF]/50 hover:text-[#00D4FF] transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#020b14] to-[#041221]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#1677FF]/20 text-[#1677FF]' : 'bg-[#00D4FF]/20 text-[#00D4FF]'}`}>
                  {msg.role === 'user' ? <UserIcon size={14} /> : <Bot size={14} />}
                </div>
                <div className={`p-3 rounded-lg text-sm max-w-[80%] whitespace-pre-wrap leading-relaxed shadow-md ${
                  msg.role === 'user' 
                    ? 'bg-[#1677FF]/10 text-[#1677FF] border border-[#1677FF]/20 rounded-tr-none' 
                    : 'bg-[#00D4FF]/5 text-[#00D4FF]/90 border border-[#00D4FF]/20 rounded-tl-none font-mono text-xs'
                }`}>
                  {msg.role === 'assistant' ? <FormattedMessage text={msg.content} /> : msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-[#00D4FF]/20 text-[#00D4FF]">
                  <Bot size={14} />
                </div>
                <div className="p-3 rounded-lg bg-[#00D4FF]/5 border border-[#00D4FF]/20 rounded-tl-none">
                  <Loader2 size={16} className="text-[#00D4FF] animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[#00D4FF]/20 bg-[#020b14] shrink-0">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about projects, risks, delays..."
                className="w-full bg-transparent border border-[#00D4FF]/30 rounded-lg py-2.5 pl-3 pr-10 text-sm text-[#00D4FF] placeholder-[#00D4FF]/40 focus:outline-none focus:border-[#00D4FF] transition-colors"
                disabled={isLoading}
              />
              <button 
                type="submit"
                disabled={isLoading || !message.trim()}
                className="absolute right-2 text-[#00D4FF]/70 hover:text-[#00D4FF] disabled:opacity-50 transition-colors p-1"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
