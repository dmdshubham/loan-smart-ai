'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

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
  const [actualThreadId, setActualThreadId] = useState<string>(initialThreadId);
  
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  // Keep refs in sync to avoid stale closure issues inside async stream handlers
  const streamingMessageRef = useRef<string>('');
  const isStreamingRef = useRef<boolean>(false);
  useEffect(() => { streamingMessageRef.current = currentStreamingMessage; }, [currentStreamingMessage]);
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Function to finalize streaming message
  const finalizeStreamingMessage = () => {
    const active = isStreamingRef.current;
    const text = streamingMessageRef.current;
    console.log('finalizeStreamingMessage called - isStreaming:', active, 'currentMessage:', JSON.stringify(text));
    const trimmed = (text || '').trim();
    if (trimmed) {
      const newMessage: Message = {
        id: Date.now() + Math.random(),
        text: trimmed,
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
    }
    // Reset streaming state regardless
    setCurrentStreamingMessage('');
    setIsStreaming(false);
    streamingMessageRef.current = '';
    isStreamingRef.current = false;
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
      streamingTimeoutRef.current = null;
    }
  };

  // Function to start new streaming message
  const startNewStreamingMessage = (token: string) => {
    const piece = typeof token === 'string' ? token : String(token ?? '');
    // Always append using functional update to avoid race conditions
    setCurrentStreamingMessage(prev => {
      const combined = (prev ?? '') + piece;
      streamingMessageRef.current = combined;
      return combined;
    });
    if (!isStreamingRef.current) {
      setIsStreaming(true);
      isStreamingRef.current = true;
    }
    // Reset timeout for finalizing message
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
    }
    streamingTimeoutRef.current = setTimeout(() => {
      console.log('Timeout triggered, finalizing message');
      finalizeStreamingMessage();
    }, 3000);
  };
  
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

  // Initialize SSE connection
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoading(true);
        setIsThinking(true);
        
        // Create the SSE URL with the thread ID and initial message
        const sseUrl = new URL('http://65.1.215.128:8002/loan-agent/stream');
        sseUrl.searchParams.append('threadId', actualThreadId);
        
        // Create abort controller for cleanup
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Make the initial POST request to start the conversation
        const response = await fetch('http://65.1.215.128:8002/loan-agent/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              messages: [
                {
                  role: "user",
                  content: []
                }
              ]
            },
            thread_id: actualThreadId
          }),
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Read the response as a stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          setIsLoading(false);
          
          const readStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      
                      // Handle thread ID from API response
                      if (data.type === 'thread_id' && data.thread_id) {
                        console.log('Received thread ID from API:', data.thread_id);
                        setActualThreadId(data.thread_id);
                        // Optionally update the URL without page reload
                        window.history.replaceState(null, '', `/agent-chat/${data.thread_id}`);
                      }
                      // Handle different types of SSE messages
                      else if (data.type === 'token') {
                        // Handle streaming tokens specifically
                        const tokenContent = data.content || data.token || '';
                        console.log('Processing token:', JSON.stringify(data));
                        // Accept any token content, including spaces and punctuation
                        if (tokenContent !== undefined && tokenContent !== null) {
                          if (isThinking) setIsThinking(false);
                          startNewStreamingMessage(tokenContent);
                        }
                      } else if (data.type === 'message' || data.content || data.text) {
                        // Handle complete messages
                        const messageText = data.content || data.text || data.message || '';
                        if (messageText) {
                          // This is a complete message - finalize any existing stream first
                          if (isStreaming) {
                            finalizeStreamingMessage();
                          }
                          if (isThinking) setIsThinking(false);
                          // Add the complete message
                          const newMessage: Message = {
                            id: Date.now() + Math.random(),
                            text: messageText,
                            isBot: true,
                            timestamp: new Date()
                          };
                          setMessages(prev => [...prev, newMessage]);
                        }
                      } else if (data.type === 'stream_end' || data.type === 'done') {
                        // End of stream - finalize the streaming message
                        console.log('Stream end detected, finalizing message');
                        finalizeStreamingMessage();
                        setIsThinking(false);
                      } else if (data.type === 'step_update') {
                        // Handle step updates from the agent
                        console.log('Step update:', data);
                      } else {
                        // Log any other message types for debugging
                        console.log('Received SSE data:', data);
                      }
                    } catch (parseError) {
                      console.log('Non-JSON SSE data:', line);
                    }
                  }
                }
              }
            } catch (streamError) {
              console.error('Stream reading error:', streamError);
              setError('Connection interrupted. Please try again.');
              setIsThinking(false);
            }
          };
          
          readStream();
        }

      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setError('Failed to connect to the agent. Please try again.');
        setIsLoading(false);
        
        // Fallback: Add a default welcome message
        setMessages([{
          id: 1,
          text: "Hi! I'm your loan agent. I'll help you through the application process. Let's start with some basic information.",
          isBot: true,
          timestamp: new Date()
        }]);
      }
    };

    if (initialThreadId) {
      initializeChat();
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, [initialThreadId]);

  // Auto-scroll to bottom when messages change or streaming updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentStreamingMessage]);

  const handleSendMessage = async () => {
    if (inputText.trim()) {
      // Finalize any ongoing streaming before sending new message
      if (isStreaming) {
        finalizeStreamingMessage();
      }
      
      // Reset streaming state completely
      setIsStreaming(false);
      setCurrentStreamingMessage('');
      setIsThinking(true);
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
        streamingTimeoutRef.current = null;
      }
      
      const newMessage: Message = {
        id: Date.now(),
        text: inputText,
        isBot: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);

      const messageToSend = inputText;
      setInputText('');

      try {
        console.log('Sending message to agent:', messageToSend);
        console.log('Using thread ID:', actualThreadId);
        
        // Send message to the agent using the correct format
        const response = await fetch('http://65.1.215.128:8002/loan-agent/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: messageToSend
                    }
                  ]
                }
              ]
            },
            thread_id: actualThreadId
          })
        });

        if (!response.ok) {
          console.error('Response not ok:', response.status, response.statusText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        if (response.ok) {
          // Read the streaming response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (reader) {
            const readStream = async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  
                  const chunk = decoder.decode(value);
                  const lines = chunk.split('\n');
                  
                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      const dataContent = line.slice(6);
                      
                      // Handle [DONE] signal
                      if (dataContent.trim() === '[DONE]') {
                        console.log('Received [DONE] signal, finalizing message');
                        finalizeStreamingMessage();
                        setIsThinking(false);
                        continue;
                      }
                      
                      try {
                        const data = JSON.parse(dataContent);
                        
                        // Handle different types of SSE messages
                        if (data.type === 'token') {
                          // Handle streaming tokens specifically
                          const tokenContent = data.content || data.token || '';
                          console.log('Processing token in handleSendMessage:', JSON.stringify(data));
                          // Accept any token content, including spaces and punctuation
                          if (tokenContent !== undefined && tokenContent !== null) {
                            if (isThinking) setIsThinking(false);
                            startNewStreamingMessage(tokenContent);
                          }
                        } else if (data.type === 'message' || data.content || data.text) {
                          // Handle complete messages
                          const messageText = data.content || data.text || data.message || '';
                          if (messageText) {
                            // This is a complete message - finalize any existing stream first
                            if (isStreaming) {
                              finalizeStreamingMessage();
                            }
                            if (isThinking) setIsThinking(false);
                            // Add the complete message
                            const newMessage: Message = {
                              id: Date.now() + Math.random(),
                              text: messageText,
                              isBot: true,
                              timestamp: new Date()
                            };
                            setMessages(prev => [...prev, newMessage]);
                          }
                        } else if (data.type === 'stream_end' || data.type === 'done') {
                          // End of stream - finalize the streaming message
                          console.log('Stream end detected in handleSendMessage, finalizing message');
                          finalizeStreamingMessage();
                          setIsThinking(false);
                        } else if (data.type === 'step_update') {
                          // Handle step updates from the agent
                          console.log('Step update:', data);
                        } else {
                          // Log any other message types for debugging
                          console.log('Received SSE data:', data);
                        }
                      } catch (parseError) {
                        console.log('Non-JSON SSE data:', line);
                      }
                    }
                  }
                }
              } catch (streamError) {
                console.error('Stream reading error:', streamError);
              }
            };
            
            readStream();
          }
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        // Add error message
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: "Sorry, I couldn't process your message. Please try again.",
          isBot: true,
          timestamp: new Date()
        }]);
        setIsThinking(false);
      }
    }
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

            {/* User profile */}
            <div className="flex items-center space-x-2">
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face&auto=format" 
                alt="Rohan" 
                className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
              />
              <span className="text-sm font-semibold text-gray-800">Rohan</span>
            </div>

            {/* Tab navigation */}
            <div className="flex space-x-1">
              <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                Applicant
              </button>
              <button className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
                Loan
              </button>
              <button className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
                Asset
              </button>
            </div>
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

      {/* Main Content */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Left Panel - Chat */}
        <div className="flex-1 px-4 py-8">
          <div className="bg-gradient-to-br from-green-50 via-pink-50 to-blue-50 rounded-3xl shadow-2xl border border-gray-200 h-[600px] flex flex-col relative overflow-hidden backdrop-blur-sm">
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-100/30 via-pink-100/20 to-blue-100/30 rounded-3xl"></div>
            
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

        {/* Right Panel - Applicant Details */}
        <div className="w-96 bg-white shadow-lg border-l border-gray-200 overflow-y-auto">
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
