'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAgentChat } from '@/hooks/useAgentChat';

interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface Step {
  id: number;
  title: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  description?: string;
}

interface ApplicantData {
  personalInfo: {
    aadharNo?: string;
    mobileNumber?: string;
    email?: string;
  };
}

export default function AgentChatPage() {
  const params = useParams();
  const initialThreadId = params.threadId as string;
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    actualThreadId,
    messages,
    isLoading,
    error,
    isThinking,
    isStreaming,
    currentStreamingMessage,
    sendMessage,
  } = useAgentChat(initialThreadId);
  
  // streaming accumulation is managed by useAgentChat
  
  const [steps] = useState<Step[]>([
    { id: 1, title: 'Personal Information', status: 'active', description: 'Basic details and contact info' },
    { id: 2, title: 'Demographics', status: 'pending', description: 'Age, address, and personal details' },
    { id: 3, title: 'Employment Details', status: 'pending', description: 'Work information and income' },
    { id: 4, title: 'Bank Details', status: 'pending', description: 'Banking and financial information' },
    { id: 5, title: 'Document Upload', status: 'pending', description: 'Required documents submission' },
    { id: 6, title: 'Verification', status: 'pending', description: 'Final review and approval' }
  ]);

  const [applicantData] = useState<ApplicantData>({
    personalInfo: {
      aadharNo: '**** **** 1983',
      mobileNumber: '7482745274',
      email: 'rohan.mehra@gmail.com'
    }
  });

  // stream initialization and cleanup handled by useAgentChat

  // Auto-scroll to bottom when messages change or streaming updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentStreamingMessage]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    await sendMessage(text);
  };

  const handleTextareaKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    // Here you would implement speech recognition
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to your loan agent...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Left Panel - Chat */}
        <div className="flex-1 px-4 my-4">
          <div 
            className="p-1 rounded-[30px] h-[calc(100vh-42px)]"
            style={{
              background: 'linear-gradient(180deg, #2E71FE 0%, #6AFFB6 100%)',
              boxShadow: '0px 0px 20px 0px #00000026'
            }}
          >
            <div className="bg-gradient-to-br h-[calc(100vh-50px)] from-green-50 via-pink-50 to-blue-50 h-[600px] flex flex-col relative overflow-hidden backdrop-blur-sm rounded-[26px]">
              {/* Subtle inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-100/30 via-pink-100/20 to-blue-100/30 rounded-lg"></div>
            
              {/* Sticky Header inside chat container */}
              <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-6 py-4">
                <div className="flex items-center justify-between ">
                  {/* Qualtech Logo */}
                  <div className="flex items-center space-x-2">
                    <img src="/icons/logo.svg" alt="Qualtech Logo" className="w-[90px] h-[35px]" />
                  </div>

                  {/* Center - miFIN.AI branding and progress */}
                <div className="flex items-center justify-center space-x-6">
                  <h1 className="text-2xl font-bold">
                    <span className="text-blue-600">mi</span>
                    <span className="text-blue-600">FIN</span>
                    <span className="text-green-500">.AI</span>
                  </h1>
                  
                  {/* Progress indicator with bars */}
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-gray-800">1/5</span>
                    <div className="flex space-x-1">
                      <div className="w-10 h-1.5 bg-green-500 rounded-full shadow-sm"></div>
                      <div className="w-10 h-1.5 bg-gray-300 rounded-full"></div>
                      <div className="w-10 h-1.5 bg-gray-300 rounded-full"></div>
                      <div className="w-10 h-1.5 bg-gray-300 rounded-full"></div>
                      <div className="w-10 h-1.5 bg-gray-300 rounded-full"></div>
                    </div>
                  </div>
                </div>
                  {/* User profile */}
                  <div className="flex items-center space-x-2">
                    <img 
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face&auto=format" 
                      alt="Rohan" 
                      className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    <span className="text-sm font-semibold text-gray-800">Rohan</span>
                  </div>
                </div>
              </div>
            
            {/* Messages Area */}
            <div className="relative flex-1 px-6 py-6 overflow-y-auto space-y-4">
              {messages.map((message, index) => (
                <div key={`message-${message.id}-${index}`} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                  {message.isBot ? (
                    <div className="bg-white rounded-2xl px-4 py-3 max-w-sm shadow-sm border border-gray-100">
                      <p className="text-gray-800 text-sm leading-relaxed">
                        {message.text}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-blue-500 text-white rounded-2xl px-4 py-3 max-w-sm shadow-sm">
                      <p className="text-sm leading-relaxed">
                        {message.text}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Show streaming message in real-time - always at the end */}
              {isStreaming && currentStreamingMessage && (
                <div key="streaming-message" className="flex justify-start">
                  <div className="bg-white rounded-2xl px-4 py-3 max-w-sm shadow-sm border border-gray-100 bg-opacity-90">
                    <p className="text-gray-800 text-sm leading-relaxed">
                      {currentStreamingMessage}
                      <span className="animate-pulse text-blue-500">|</span>
                    </p>
                  </div>
                </div>
              )}
              {/* Thinking indicator */}
              {!isStreaming && isThinking && (
                <div key="thinking" className="flex justify-start">
                  <div className="bg-white rounded-2xl px-3 py-2 max-w-xs shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-xs tracking-wide">
                      <span className="inline-flex items-center gap-1">
                        <span className="animate-bounce">•</span>
                        <span className="animate-bounce [animation-delay:150ms]">•</span>
                        <span className="animate-bounce [animation-delay:300ms]">•</span>
                        <span className="ml-1">Thinking…</span>
                      </span>
                    </p>
                  </div>
                </div>
              )}
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Bar with Siri-style interface */}
            <div className="relative px-6 pb-6">
              <div className="flex items-center justify-between">
                {/* Keyboard Icon */}
                <button className="p-3 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 5H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>
                  </svg>
                </button>

                {/* Siri-style Voice Interface with depth */}
                <div className="relative">
                  {/* Outer glow rings */}
                  <div className={`absolute inset-0 w-20 h-20 rounded-full transition-all duration-500 ${
                    isListening 
                      ? 'bg-gradient-to-r from-purple-400/40 to-blue-400/40 animate-ping scale-110' 
                      : 'bg-gradient-to-r from-blue-400/20 to-purple-400/20 scale-100'
                  }`}></div>
                  <div className={`absolute inset-0 w-20 h-20 rounded-full transition-all duration-300 ${
                    isListening 
                      ? 'bg-gradient-to-r from-purple-300/30 to-blue-300/30 animate-pulse scale-105' 
                      : 'bg-gradient-to-r from-blue-300/15 to-purple-300/15'
                  }`}></div>
                  
                  <button
                    onClick={toggleListening}
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                      isListening 
                        ? 'bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 shadow-purple-500/50' 
                        : 'bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 hover:from-blue-600 hover:via-purple-700 hover:to-indigo-800 shadow-blue-500/30'
                    }`}
                    style={{
                      boxShadow: isListening 
                        ? '0 0 40px rgba(147, 51, 234, 0.4), 0 0 80px rgba(59, 130, 246, 0.2), inset 0 2px 4px rgba(255,255,255,0.1)' 
                        : '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 2px 4px rgba(255,255,255,0.1)'
                    }}
                  >
                    {/* Inner glass effect */}
                    <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
                    
                    {/* Content */}
                    <div className="relative z-10">
                      {isListening ? (
                        <div className="flex items-center justify-center space-x-0.5">
                          <div className="w-1 bg-white rounded-full animate-pulse" style={{height: '16px', animationDelay: '0ms'}}></div>
                          <div className="w-1 bg-white rounded-full animate-pulse" style={{height: '24px', animationDelay: '100ms'}}></div>
                          <div className="w-1 bg-white rounded-full animate-pulse" style={{height: '12px', animationDelay: '200ms'}}></div>
                          <div className="w-1 bg-white rounded-full animate-pulse" style={{height: '20px', animationDelay: '300ms'}}></div>
                          <div className="w-1 bg-white rounded-full animate-pulse" style={{height: '8px', animationDelay: '400ms'}}></div>
                        </div>
                      ) : (
                        <svg className="w-7 h-7 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                      )}
                    </div>
                  </button>
                </div>

                {/* Mute Icon */}
                <button className="p-3 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                </button>
              </div>
              
              <div className="text-center mt-6">
                <p className="text-gray-500 text-sm font-medium">Speak your answers</p>
              </div>

              {/* Text Input Area */}
              <div className="mt-4">
                <div className="flex items-center space-x-3 bg-white rounded-full border border-gray-200 px-4 py-2 shadow-sm">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleTextareaKeyPress}
                    placeholder="Type your message here..."
                    className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="p-1 text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Applicant Details */}
        <div className="w-96 bg-white shadow-lg border-l border-gray-200 h-screen ">
          <div className="p-6">
            {/* Applicant Header */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-gray-900">Applicant Details</h2>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* User Icons */}
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div className="flex space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Collapsible Sections */}
            <div className="space-y-4">
              {/* Personal Info Section */}
              <div className="border border-gray-200 rounded-lg shadow-sm">
                <button className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
                  <span className="font-bold text-gray-900">Personal Info</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="px-5 pb-5 space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-gray-600">Adhar No.</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-semibold text-gray-900">{applicantData.personalInfo.aadharNo}</span>
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-gray-600">Mobile Number</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-semibold text-gray-900">{applicantData.personalInfo.mobileNumber}</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-gray-600">Email</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-semibold text-gray-900">{applicantData.personalInfo.email}</span>
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other sections */}
              {['Demographics', 'Employment Details', 'Bank Details'].map((section) => (
                <div key={section} className="border border-gray-200 rounded-lg shadow-sm">
                  <button className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
                    <span className="font-bold text-gray-900">{section}</span>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        
      </div>
    </div>
  );
}
