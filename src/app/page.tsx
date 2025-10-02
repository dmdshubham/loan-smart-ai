'use client';

import { useState, useEffect } from 'react';

export default function ChatPage() {
  const [isListening, setIsListening] = useState(false);

  const toggleListening = () => {
    setIsListening(!isListening);
    // Navigate to agent chat
    const threadId = `loan-agent-thread-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    window.location.href = `/agent-chat/${threadId}`;
  };

  const handleGlobalKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Navigate to agent chat
      const threadId = `loan-agent-thread-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
      window.location.href = `/agent-chat/${threadId}`;
    }
  };

  useEffect(() => {
    // Add global key listener
    document.addEventListener('keydown', handleGlobalKeyPress);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyPress);
    };
  }, []);

  return (
    <div className="h-screen bg-gray-50 flex flex-col relative">
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/images/home/bg2.png)',
          zIndex:0
        }}
      />
      
      {/* Content with higher z-index */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <img src="/icons/logo.svg" alt="Qualtech Logo" className="w-[120px] h-[40px] absolute top-4 left-10" />
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div 
          className="p-1 rounded-[30px]"
          style={{
            background: 'linear-gradient(180deg, #2E71FE 0%, #6AFFB6 100%)',
            boxShadow: '0px 0px 20px 0px #00000026'
          }}
        >
          <div className="bg-white h-[600px] flex flex-col relative overflow-hidden rounded-[26px]">
          <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/images/home/bg1.png)',
          zIndex:0
        }}
      />
          
          {/* Brand Header */}
          <div className="text-center py-8 bg-gradient-to-b from-blue-50 to-white">
            <h2 className="text-3xl font-bold">
            <span className="text-blue-600">mi</span>
              <span className="text-blue-600">FIN</span>
              <span className="text-green-500">.AI</span>
            </h2>
          </div>

          {/* Messages Area */}
          <div className="flex-1 px-8 py-4 overflow-y-auto z-10">
            <div className="mb-6">
              <div className="text-center">
                <div className="inline-block bg-gray-100 rounded-2xl px-6 py-4 max-w-md">
                  <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-line">
                    Hi. Welcome.{'\n'}Shall we start with the loan application process?
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Voice Interface */}
          <div className="flex justify-center py-6 z-10">
            <button
              onClick={toggleListening}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                isListening 
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 animate-pulse' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-black bg-opacity-20 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center">
                  {isListening ? (
                    <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  )}
                </div>
              </div>
            </button>
          </div>

          <div className="text-center pb-6 z-10">
            <p className="text-gray-500 text-sm">Speak your answers</p>
          </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}