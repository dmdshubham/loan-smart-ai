'use client';

import { useState, useEffect, useRef } from 'react';

export default function ChatPage() {
  const [isListening, setIsListening] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('welcome'); // 'welcome', 'documents', 'takePhoto'
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const toggleListening = () => {
    setIsListening(!isListening);
    // Move to documents screen on first interaction
    if (currentScreen === 'welcome') {
      setCurrentScreen('documents');
    } else if (currentScreen === 'documents') {
      setCurrentScreen('takePhoto');
    } else if (currentScreen === 'takePhoto') {
      // Navigate to agent chat after photo is taken
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
        setCurrentScreen('takePhoto');
      } else if (currentScreen === 'takePhoto') {
        // Navigate to agent chat after photo is taken
        const threadId = `loan-agent-thread-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
        window.location.href = `/agent-chat/${threadId}`;
      }
    }
  };

  // Camera initialization and cleanup
  useEffect(() => {
    if (currentScreen === 'takePhoto' && !capturedImage) {
      startCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [currentScreen, capturedImage]);

  useEffect(() => {
    // Only add global key listener for welcome and documents screens
    if (currentScreen === 'welcome' || currentScreen === 'documents' || currentScreen === 'takePhoto') {
      document.addEventListener('keydown', handleGlobalKeyPress);
      return () => {
        document.removeEventListener('keydown', handleGlobalKeyPress);
      };
    }
  }, [currentScreen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraReady(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please make sure you have granted camera permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCameraReady(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        // Store in localStorage
        localStorage.setItem('userPhoto', imageDataUrl);
        localStorage.setItem('userPhotoTimestamp', new Date().toISOString());
        
        setCapturedImage(imageDataUrl);
        stopCamera();
        
        console.log('Photo captured and saved to localStorage');
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setIsCameraReady(false);
    startCamera();
  };

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
                    <p className="text-gray-800 text-lg whitespace-pre-line text-left">
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

            {currentScreen === 'takePhoto' && (
              <div className="mb-6">
                <div className="text-center">
                  <div className="inline-block bg-gray-100 rounded-2xl px-6 py-4 max-w-lg">
                    <p className="text-gray-800 text-lg font-semibold mb-4">
                      {capturedImage ? 'Photo Captured Successfully!' : 'Smile Please!'}
                    </p>
                    
                    {/* Camera Preview or Captured Image */}
                    <div className="relative bg-black rounded-xl overflow-hidden mb-4" style={{ height: '360px' }}>
                      {!capturedImage ? (
                        <>
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            style={{ transform: 'scaleX(-1)' }}
                          />
                          {!isCameraReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                              <div className="text-white text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                                <p>Initializing camera...</p>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <img
                          src={capturedImage}
                          alt="Captured"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    
                    {/* Hidden canvas for capturing */}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    
                    {/* Capture/Retake Buttons */}
                    <div className="flex gap-3 justify-center">
                      {!capturedImage ? (
                        <button
                          onClick={capturePhoto}
                          disabled={!isCameraReady}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
                        >
                          Capture Photo
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={retakePhoto}
                            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                          >
                            Retake
                          </button>
                          <button
                            onClick={() => {
                              const threadId = `loan-agent-thread-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
                              window.location.href = `/agent-chat/${threadId}`;
                            }}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                          >
                            Continue
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Voice Interface - Hidden on takePhoto screen */}
          {currentScreen !== 'takePhoto' && (
            <>
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
            </>
          )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}