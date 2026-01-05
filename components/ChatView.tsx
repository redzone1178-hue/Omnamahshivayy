
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { generateAssistantResponse } from '../services/geminiService';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      text: "Hello! I'm OhM. How can I assist you with your questions or tasks today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await generateAssistantResponse(input);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.text,
        timestamp: new Date(),
        groundingSources: response.sources
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "I encountered an error while processing that. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-colors duration-300">
      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-4 max-w-[85%] md:max-w-[70%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm ${
                msg.role === 'user' ? 'bg-indigo-600' : 'bg-white dark:bg-slate-800'
              }`}>
                <i className={`fa-solid ${msg.role === 'user' ? 'fa-user' : 'fa-bolt'} ${msg.role === 'user' ? 'text-white' : 'text-indigo-600 dark:text-white'}`}></i>
              </div>
              <div className={`space-y-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`px-5 py-3 rounded-2xl shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-900/10' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
                
                {msg.groundingSources && msg.groundingSources.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 justify-start">
                    {msg.groundingSources.map((src, i) => (
                      <a 
                        key={i} 
                        href={src.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md text-slate-500 dark:text-slate-400 flex items-center gap-1 transition-colors"
                      >
                        <i className="fa-solid fa-link"></i> {src.title.slice(0, 30)}
                      </a>
                    ))}
                  </div>
                )}

                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-4 items-center">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center animate-pulse border border-slate-100 dark:border-slate-700 shadow-sm">
                <i className="fa-solid fa-bolt text-indigo-400"></i>
              </div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-8 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md border-t border-slate-200 dark:border-slate-900/50">
        <form 
          onSubmit={handleSend}
          className="max-w-4xl mx-auto relative group"
        >
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask OhM anything..."
            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white pl-6 pr-14 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-sm"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 bottom-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group-focus-within:shadow-lg group-focus-within:shadow-indigo-500/20"
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 mt-4 uppercase tracking-widest font-bold">
          Powered by Gemini 3 Flash • Built for Performance
        </p>
      </div>
    </div>
  );
};

export default ChatView;
