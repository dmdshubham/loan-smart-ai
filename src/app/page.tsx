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

  useEffect(() => {
    localStorage.clear();
  }, []);
  
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
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* Background Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/images/home/bg2.png)',
          zIndex:0
        }}
      />
      
      {/* Content with higher z-index */}
      <div className="relative z-10 flex flex-col ">
        <img src="/icons/qualtech-blk.png" alt="Qualtech Logo" className="w-[80px] h-[26px] sm:w-[120px] sm:h-[40px] absolute top-3 left-4 sm:top-4 sm:left-10 z-10" />
      <div className="flex-1 max-w-4xl mx-auto w-full px-3 py-4 sm:px-4 sm:py-8 mt-12 sm:mt-10">
        <div 
          className="p-1 rounded-[20px] sm:rounded-[30px]"
          style={{
            background: 'linear-gradient(180deg, #2E71FE 0%, #6AFFB6 100%)',
            boxShadow: '0px 0px 20px 0px #00000026'
          }}
        >
          <div className="bg-white min-h-[calc(100vh-200px)] sm:h-[500px] flex flex-col relative overflow-hidden rounded-[18px] sm:rounded-[26px]">
          <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/images/home/bg1.png)',
          zIndex:0
        }}
      />
          <div className="bg-white rounded-2xl p-0">

          <img src="/icons/myfinai.jpeg"alt="Frida" className="  m-auto w-[200px] h-[40px]  sm:w-[150px] sm:h-[70px]" />
          </div>

          {/* Messages Area */} 
          <div className="flex-1 mt-4 sm:mt-10 px-4 sm:px-8 py-4 z-10">
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-0">
              <div className="flex flex-col items-center gap-2 w-full sm:w-[20%]">
                <img src="/images/freda.png" alt="Frida" className="w-[100px] h-[100px] sm:w-[150px] sm:h-[150px]" />
                <p className="text-gray-800 text-base sm:text-lg text-center font-extrabold leading-relaxed">
                Frida
                </p>
                {/* <p className="text-gray-800 text-center font-italic text-xs sm:text-sm leading-relaxed">
                AI-Enabled Credit Assistant
                </p> */}
              </div>
              <div className="w-full sm:w-[80%]">
                <div className="rounded-2xl px-4 sm:px-6 py-3 sm:py-4">
                  <p className="text-gray-800 text-base sm:text-xl font-extrabold leading-snug sm:leading-relaxed">
                  Welcome to ABC Financial Services! <span className="font-normal ">Let's kickstart your loan
                  application with Frida, our AI-powered digital loan
                  assistant, and experience a swift and effortless process
                  built to accelerate your business ambitions. </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Voice Interface */}
          <div className="flex justify-center py-4 sm:py-6 z-10">
            <button
              onClick={toggleListening}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                isListening 
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 animate-pulse' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              }`}
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-black bg-opacity-20 flex items-center justify-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center">
                  {isListening ? (
                    <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                  ) : (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  )}
                </div>
              </div>
            </button>
          </div>

          <div className="text-center pb-4 sm:pb-6 z-10">
            <p className="text-gray-500 text-xs sm:text-sm">Speak your answers</p>
          </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}