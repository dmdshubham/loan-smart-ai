'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAgentChat } from '@/hooks/useAgentChat';
import FileUpload from '@/components/FileUpload';
import RightPanel, { RightPanelRef } from '@/components/RightPanel';
import DocumentUploadInline from '@/components/DocumentUploadInline';
import { speechRecognitionService } from '@/service/speechRecognition';
import { openLinkInNewTab, processBotMessageHTML } from '@/common/utils';
import { parseDocumentUrls, formatDocumentType, detectDocumentUploadRequest, formatApiMessage } from '@/utils/document-detector';
import { SocketDataProvider, useSocketData } from '@/contexts/SocketDataContext';



// Inner component that uses the socket data context
function AgentChatContent() {
  const params = useParams();
  const initialThreadId = params.threadId as string;
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [speechText, setSpeechText] = useState('');
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<RightPanelRef>(null);
  const bottomSheetRightPanelRef = useRef<RightPanelRef>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isButtonAnimating, setIsButtonAnimating] = useState(false);
  
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

  // Use socket data from context
  const {
    stageData,
    expandHighlightedSections,
    sectionUpdateCounter,
  } = useSocketData();

  // Watch for section updates and animate the floating button
  useEffect(() => {
    if (sectionUpdateCounter > 0) {
      console.log("Section updated, animating button");
      setIsButtonAnimating(true);
      const timeout = setTimeout(() => {
        setIsButtonAnimating(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [sectionUpdateCounter]);

  // Load user photo from localStorage and listen for updates
  useEffect(() => {
    const storedPhoto = localStorage.getItem('userPhoto');
    if (storedPhoto) {
      setUserPhoto(storedPhoto);
    }

    // Listen for custom event when localStorage userPhoto is updated
    const handlePhotoUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ photoUrl: string }>;
      if (customEvent.detail?.photoUrl) {
        setUserPhoto(customEvent.detail.photoUrl);
        console.log('User photo updated:', customEvent.detail.photoUrl);
      }
    };

    window.addEventListener('userPhotoUpdated', handlePhotoUpdate);

    return () => {
      window.removeEventListener('userPhotoUpdated', handlePhotoUpdate);
    };
  }, []);

  // Auto-scroll to bottom when messages change or streaming updates
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 3) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentStreamingMessage, uploadedUrls]);

  // Initialize speech recognition
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const isSupported = speechRecognitionService.isSupported();
      setIsSpeechSupported(isSupported);

      if (isSupported) {
        speechRecognitionService.setCallbacks({
          onStart: () => {
            setIsListening(true);
            setSpeechText('');
          },
          onResult: (result) => {
            // Show interim transcript inside the input box
            if (!result.isFinal) {
              setSpeechText(result.transcript);
              setInputText(result.transcript);
            }
          },
          onFinalResult: (transcript) => {
            setSpeechText(transcript);
            setInputText(transcript);
            // Auto-send the final transcript
            if (transcript.trim()) {
              handleSendSpeechMessage(transcript);
            }
          },
          onEnd: (final) => {
            setIsListening(false);
            // Ensure we don't concatenate with previous input; prefer final transcript
            if (final && final.trim()) {
              setInputText(final);
            }
            setSpeechText('');
          },
          onError: (error) => {
            setIsListening(false);
            setSpeechText('');
            console.error('Speech recognition error:', error);
            // You could show a toast notification here
          }
        });
      }
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      setIsSpeechSupported(false);
    }

    return () => {
      try {
        if (speechRecognitionService.isSupported()) {
          speechRecognitionService.stopListening();
        }
      } catch (error) {
        console.error('Error cleaning up speech recognition:', error);
      }
    };
  }, []);

  const handleSendMessage = async () => {
    if (!inputText.trim() && attachedFiles.length === 0) return;
    const text = inputText;
    const files = [...attachedFiles];
    
    setInputText('');
    setAttachedFiles([]);
    
    // Reset expanded sections in right panel
    rightPanelRef.current?.resetExpandedSections();
    
    // Send message with attached files
    await sendMessage(text, files);
  };

  const handleSendSpeechMessage = async (transcript: string) => {
    const text = transcript.trim();
    if (!text) return;
    setInputText('');
    speechRecognitionService.clearTranscripts();
    
    // Reset expanded sections in right panel
    rightPanelRef.current?.resetExpandedSections();
    
    await sendMessage(text, []);
  };

  const handleDocumentUpload = async (fileUrls: string[], documentType: string) => {
    setIsUploadingDoc(true);
    try {
      // Format the message according to API requirements
      // Convert snake_case document type
      const docTypeLower = documentType.toLowerCase().replace(/\s+/g, '_');
      
      let formattedMessage: string;
      if (fileUrls.length === 1) {
        // Single file: document_type_url='url'
        formattedMessage = `${docTypeLower}_url='${fileUrls[0]}'`;
      } else {
        // Multiple files: document_type_urls="url1", "url2", "url3"
        formattedMessage = `${docTypeLower}_urls="${fileUrls.join('", "')}"`;
      }
      
      // Reset expanded sections in right panel
      rightPanelRef.current?.resetExpandedSections();
      
      // Send the formatted message to the API
      await sendMessage(formattedMessage, []);
    } catch (error) {
      console.error('Error sending document upload message:', error);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleUploadedUrlsChange = useCallback((urls: string[]) => {
    setUploadedUrls(urls);
  }, []);



  const handleTextareaKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

 

  const toggleListening = () => {
    if (!isSpeechSupported) {
      console.warn('Speech recognition not supported');
      return;
    }

    if (isListening) {
      speechRecognitionService.stopListening();
    } else {
      // Clear the input before starting a fresh session to avoid concatenation
      setInputText('');
      setSpeechText('');
      speechRecognitionService.startListening();
    }
  };

  // Render document URLs component with field labels
  const renderDocumentUrls = (parsedData: ReturnType<typeof parseDocumentUrls>) => {
    const { urls, documentType, fields } = parsedData;
    if (!documentType || urls.length === 0) return null;
    
    return (
      <div className="mt-1 space-y-2">
        {/* <p className="text-xs text-white font-medium">
        {formatDocumentType(documentType)} {urls.length > 1 ? `(${urls.length} files)` : ''}
        </p> */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {fields.map((field, index) => {
            const isPdf = field.url.toLowerCase().endsWith('.pdf');
            
            // Extract label from field name
            // Handles: "aadhaar_card_front_url" -> "Front", "salary_slip_urls_1" -> "1", etc.
            const frontBackMatch = field.fieldName.match(/_(front|back)_url/i);
            const indexMatch = field.fieldName.match(/_(\d+)$/);
            const label = frontBackMatch 
              ? frontBackMatch[1].charAt(0).toUpperCase() + frontBackMatch[1].slice(1)
              : indexMatch 
                ? indexMatch[1]
                : `${index + 1}`;
            
            return (
              <div
                key={index}
                onClick={() => field.url && openLinkInNewTab(field.url)}
                className="relative group"
              >
                {isPdf ? (
                  <div className="h-16 sm:h-20 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors">
                    <div className="text-center">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18.5,9H13V3.5L18.5,9M6,20V4H12V10H18V20H6Z" />
                      </svg>
                      <p className="text-xs text-red-600 mt-1">PDF</p>
                    </div>
                  </div>
                ) : (
                  <img 
                    src={field.url} 
                    alt={`${label}`}
                    className="w-full h-16 sm:h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                  />
                )}
                {/* Label badge */}
                {/* <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 bg-black bg-opacity-60 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded">
                  {label}
                </div> */}
                {/* Hover overlay */}
                {/* <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" />
                  </svg>
                </div> */}
              </div>
            );
          })}
        </div>
      </div>
    );
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
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full z-10">
        <div className="flex-1 sm:ml-1 my-0 sm:my-2 sm:mb-2 lg:my-4">
          <div 
            className="p-0 sm:p-1 rounded-none sm:rounded-[20px] lg:rounded-[30px] h-[100dvh] sm:h-[calc(100dvh-32px)] lg:h-[calc(100dvh-42px)] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #2E71FE 0%, #6AFFB6 100%)',
              boxShadow: '0px 0px 20px 0px #00000026'
            }}
          >
            <div className="bg-gradient-to-br h-[100dvh] sm:h-[calc(100dvh-40px)] lg:h-[calc(100dvh-50px)] from-green-50 via-pink-50 to-blue-50 flex flex-col relative overflow-hidden backdrop-blur-sm rounded-none sm:rounded-[16px] lg:rounded-[26px]">
              {/* Subtle inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-100/30 via-pink-100/20 to-blue-100/30 rounded-lg"></div>
            
              {/* Sticky Header inside chat container */}
              <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-3 sm:px-4 md:px-3 py-2 md:py-3">
                <div className="flex items-center justify-between">
                  {/* Qualtech Logo */}
                  <div className="flex items-center">
                    <img 
                      src="/icons/qualtech-blk.png" 
                      alt="Qualtech Logo" 
                      className="h-5 w-auto xs:h-6 sm:h-7 md:h-8 object-contain" 
                    />
                  </div>

                  {/* Center - miFIN.AI branding */}
                  <div className="flex items-center justify-center flex-shrink-0">
                    <img 
                      src="/icons/myfinai.jpeg" 
                      alt="miFin" 
                      className="h-6 w-auto sm:h-10 md:h-12 object-contain" 
                    />
                  </div>
                  
                  {/* User profile */}
                  <div className="flex items-center space-x-1 sm:space-x-2">

                  {/* Desktop progress indicator */}
                  <div className="hidden sm:flex items-center space-x-3 mr-3">
                      <span className="text-sm font-bold text-gray-800">
                        {stageData?.completed_steps.length || 0}/{stageData?.total_steps || 5}
                      </span>
                      <div className="flex space-x-1">
                        {Array.from({ length: stageData?.total_steps || 5 }).map((_, index) => (
                          <div 
                            key={index}
                            className={`w-1 h-5 rounded-full shadow-sm ${
                              index < (stageData?.completed_steps.length || 0)
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Mobile/Compact progress indicator */}
                    <div className="flex sm:hidden items-center space-x-2 mr-3">
                      <span className="text-xs font-bold text-gray-800">
                        {stageData?.completed_steps.length || 0}/{stageData?.total_steps || 5}
                      </span>
                      <div className="flex space-x-0.5">
                        {Array.from({ length: stageData?.total_steps || 5 }).map((_, index) => (
                          <div 
                            key={index}
                            className={`w-1 h-4 rounded-full ${
                              index < (stageData?.completed_steps.length || 0)
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {userPhoto ? (
                      <img 
                        src={userPhoto} 
                        alt="User" 
                        className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-gray-300 flex items-center justify-center border-2 border-white shadow-sm">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                    )}
                    <span className="hidden sm:inline text-xs md:text-sm font-semibold text-gray-800">User</span>
                  </div>
                </div>
              </div>
            
            {/* Messages Area */}
            <div className="relative flex-1 px-3 sm:px-4 md:px-6 py-4 md:py-6 overflow-y-auto overflow-x-hidden space-y-3 md:space-y-4" style={{ maxHeight: 'calc(100% - 200px)' }}>
              {messages.map((message, index) => {
                // Parse document URLs from message text
                const parsedUrls = parseDocumentUrls(message.text);
                const hasDocumentUrls = parsedUrls.documentType !== null && parsedUrls.urls.length > 0;
                
                // Detect document upload request for bot messages
                const uploadRequest = message.isBot ? detectDocumentUploadRequest(message.text) : null;
                console.log('uploadRequest', uploadRequest);
                const showUploadUI = uploadRequest?.isUploadRequest && !hasDocumentUrls && index === messages.length - 1;

                console.log('uploadRequest', uploadRequest,showUploadUI);
                return (
                  <div key={`message-${message.id}-${index}`} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                    {message.isBot ? (
                      <div className="bg-white rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 max-w-[85%] sm:max-w-md shadow-sm border border-gray-100">
                        {!hasDocumentUrls && (
                          <div 
                            className="text-gray-800 text-sm bot-message-content"
                            dangerouslySetInnerHTML={{__html: processBotMessageHTML(message.text)}}
                            style={{
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word'
                            }}
                          />
                        )}
                        {hasDocumentUrls && renderDocumentUrls(parsedUrls)}
                        {showUploadUI && uploadRequest && (
                          <DocumentUploadInline
                            documentType={uploadRequest.documentType}
                            maxFiles={3}
                            onUpload={handleDocumentUpload}
                            isUploading={isUploadingDoc}
                            onUploadedUrlsChange={handleUploadedUrlsChange}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="bg-blue-500 text-white rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 max-w-[85%] sm:max-w-sm shadow-sm">
                        {hasDocumentUrls ? (
                          <>
                            <p className="text-xs leading-relaxed mb-2">
                              Uploaded {formatDocumentType(parsedUrls.documentType!)} {parsedUrls.urls.length > 1 ? `(${parsedUrls.urls.length} files)` : ''}
                            </p>
                            <div>
                              {renderDocumentUrls(parsedUrls)}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs sm:text-sm leading-relaxed">
                            {message.text}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Show streaming message in real-time - always at the end */}
              {isStreaming && currentStreamingMessage && (() => {
                const parsedUrls = parseDocumentUrls(currentStreamingMessage);
                const hasDocumentUrls = parsedUrls.documentType !== null && parsedUrls.urls.length > 0;
                
                return (
                  <div key="streaming-message" className="flex justify-start">
                    <div className="bg-white rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 max-w-[85%] sm:max-w-md shadow-sm border border-gray-100 bg-opacity-90">
                      {!hasDocumentUrls && (
                        <div 
                          className="text-gray-800 text-sm bot-message-content"
                          dangerouslySetInnerHTML={{__html: processBotMessageHTML(currentStreamingMessage)}}
                          style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word'
                          }}
                        />
                      )}
                      {hasDocumentUrls && renderDocumentUrls(parsedUrls)}
                    </div>
                  </div>
                );
              })()}
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
            <div className="relative px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-8">
              <div className="flex items-center justify-center">
                {/* Keyboard Icon - hide on mobile */}
                {/* <button className="hidden sm:block p-2 md:p-3 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 5H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>
                  </svg>
                </button> */}

                <div 
                  onClick={isSpeechSupported ? toggleListening : undefined}
                  className={`mic ${isListening ? 'listening' : ''} ${!isSpeechSupported ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{ width: '70px', height: '70px' }}
                >
                  <img src="/icons/voice.svg" alt="Voice mic" className="mic-img" />
                  <div className="pulse-ring" aria-hidden="true"></div>
                </div>

                {/* <button className="hidden sm:block p-2 md:p-3 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                </button> */}

                {/* Spacer for mobile centering */}
                <div className="sm:hidden w-8"></div>
              </div>
              
              {/* "Speak your answers" text - Hidden on mobile (icon in input box instead), shown on tablet+ */}
              <div className="hidden sm:block text-center">
                {isSpeechSupported ? (
                  <p className="text-gray-500 text-xs font-medium">Speak your answers</p>
                ) : (
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">Voice input not supported in this browser</p>
                )}
              </div>

              {/* Speech Text Indicator (removed in favor of showing in input) */}

              {/* Text Input Area */}
              <div className="mt-3 sm:mt-4">
                <div className="flex items-center space-x-2 bg-white rounded-full border border-gray-200 px-3 sm:px-4 py-2 shadow-sm">
                  {/* <FileUpload 
                    onFileUploaded={handleFileUploaded}
                    onError={handleFileUploadError}
                  /> */}
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleTextareaKeyPress}
                    placeholder="Type your message here..."
                    className="flex-1 outline-none text-xs sm:text-sm text-gray-700 placeholder-gray-400"
                  />
                  
                  {/* Microphone icon - Shown only on mobile, beside send button */}
                  <button
                    onClick={toggleListening}
                    disabled={!isSpeechSupported}
                    className={`sm:hidden p-1 transition-colors flex-shrink-0 ${
                      !isSpeechSupported 
                        ? 'text-gray-300 cursor-not-allowed' 
                        : isListening 
                          ? 'text-purple-500' 
                          : 'text-gray-500 hover:text-purple-600'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  </button>
                  
                  <button
                    onClick={handleSendMessage}
                    className="p-1 text-blue-500 hover:text-blue-600 transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  </button>
                </div>
                
                {/* Show attached files count */}
                {attachedFiles.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    {attachedFiles.length} file(s) attached
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Hide on mobile, show on tablet and desktop */}
        <div className="hidden sm:block">
          <RightPanel ref={rightPanelRef} />
        </div>
      </div>

      {/* Floating Button - Show only on mobile */}
      <button
        onClick={() => {
          setIsBottomSheetOpen(true);
          // Expand highlighted sections when opening bottom sheet
          setTimeout(() => {
            bottomSheetRightPanelRef.current?.expandHighlightedSections();
          }, 100);
        }}
        className={`sm:hidden fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg flex items-center justify-center text-white transition-all duration-300 ${
          isButtonAnimating ? 'animate-bounce scale-110' : 'scale-100'
        }`}
        style={{
          boxShadow: isButtonAnimating 
            ? '0 0 30px rgba(59, 130, 246, 0.6), 0 8px 16px rgba(0, 0, 0, 0.2)' 
            : '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
      >
        {/* Icon - Document/Info icon */}
        <svg 
          className={`w-6 h-6 transition-transform duration-300 ${isButtonAnimating ? 'rotate-12' : ''}`} 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-1-7H7v-2h10v2zm0 4H7v-2h10v2z"/>
        </svg>
        
        {/* Notification Badge */}
        {isButtonAnimating && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        )}
        
        {/* Pulse ring animation when active */}
        {isButtonAnimating && (
          <>
            <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75"></div>
            <div className="absolute inset-0 rounded-full bg-purple-400 animate-pulse opacity-50"></div>
          </>
        )}
      </button>

      {/* Bottom Sheet Modal Overlay - Only show when open */}
      {isBottomSheetOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-end animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-transparent backdrop-blur-sm bg-opacity-10 transition-opacity"
            onClick={() => setIsBottomSheetOpen(false)}
          ></div>
          
          {/* Bottom Sheet */}
          <div 
            className="relative w-full bg-white rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up"
            style={{ maxHeight: '85vh' }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Application Details</h2>
              <button 
                onClick={() => setIsBottomSheetOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content - RightPanel */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 80px)' }}>
              <RightPanel ref={bottomSheetRightPanelRef} />
            </div>
          </div>
        </div>
      )}

      {/* Add keyframe animation for slide up */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

// Wrapper component that provides the socket data context
export default function AgentChatPage() {
  const params = useParams();
  const initialThreadId = params.threadId as string;
  const { actualThreadId } = useAgentChat(initialThreadId);

  return (
    <SocketDataProvider conversationId={actualThreadId}>
      <AgentChatContent />
    </SocketDataProvider>
  );
}
