'use client';

import { useState, useEffect } from 'react';

export default function ChatPage() {
  const [isListening, setIsListening] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('welcome'); // 'welcome', 'documents'

  const toggleListening = () => {
    setIsListening(!isListening);
    // Move to documents screen on first interaction
    if (currentScreen === 'welcome') {
      setCurrentScreen('documents');
    } else if (currentScreen === 'documents') {
      // Navigate to agent chat instead of showing chat locally
      const threadId = `loan-agent-thread-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
      window.location.href = `/agent-chat/${threadId}`;
    }
    // Here you would implement speech recognition
  };

  const handleGlobalKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentScreen === 'welcome') {
        setCurrentScreen('documents');
      } else if (currentScreen === 'documents') {
        // Navigate to agent chat instead of showing chat locally
        const threadId = `loan-agent-thread-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
        window.location.href = `/agent-chat/${threadId}`;
      }
    }
  };

  useEffect(() => {
    // Only add global key listener for welcome and documents screens
    if (currentScreen === 'welcome' || currentScreen === 'documents') {
      document.addEventListener('keydown', handleGlobalKeyPress);
      return () => {
        document.removeEventListener('keydown', handleGlobalKeyPress);
      };
    }
  }, [currentScreen]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => window.history.back()}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {/* Qualtech Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 border-2 border-blue-500 rounded-lg flex items-center justify-center bg-white">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-600">qualtech</span>
            </div>
          </div>

          {/* Center - miFIN.AI branding */}
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold">
              <span className="text-blue-600">mi</span>
              <span className="text-blue-600">FIN</span>
              <span className="text-green-500">.AI</span>
            </h1>
          </div>

          {/* Right side - Menu */}
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-teal-400 rounded-full"></div>
            <button className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Only Welcome and Documents screens */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="bg-white rounded-3xl shadow-lg border-2 border-blue-200 h-[600px] flex flex-col relative overflow-hidden">
          
          {/* Brand Header */}
          <div className="text-center py-8 bg-gradient-to-b from-blue-50 to-white">
            <h2 className="text-3xl font-bold">
              <span className="text-blue-600">Lend</span>
              <span className="text-teal-400">Smart</span>
              <span className="text-blue-600">.AI</span>
            </h2>
          </div>

          {/* Messages Area */}
          <div className="flex-1 px-8 py-4 overflow-y-auto">
            {currentScreen === 'welcome' && (
              <div className="mb-6">
                <div className="text-center">
                  <div className="inline-block bg-gray-100 rounded-2xl px-6 py-4 max-w-md">
                    <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-line">
                      Hi. Welcome.{'\n'}Shall we start with the loan application process?
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentScreen === 'documents' && (
              <div className="mb-6">
                <div className="text-center">
                  <div className="inline-block bg-gray-100 rounded-2xl px-6 py-4 max-w-lg">
                    <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-line">
                      Please keep these documents ready with you to complete the application process:{'\n\n'}
                      • Aadhar Card{'\n'}
                      • Pan Card{'\n'}
                      • Salary Slip{'\n'}
                      • Bank Statement
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Voice Interface */}
          <div className="flex justify-center py-6">
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

          <div className="text-center pb-6">
            <p className="text-gray-500 text-sm">Speak your answers</p>
          </div>
        </div>
      </div>
    </div>
  );
}