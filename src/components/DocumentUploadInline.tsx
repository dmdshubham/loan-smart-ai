import { useState, useRef, useEffect } from 'react';
import { UploadService } from '@/service/upload-service';

interface UploadedFileData {
  file: File;
  url?: string;
  uploading: boolean;
  error?: string;
}

interface DocumentUploadInlineProps {
  documentType: string;
  maxFiles?: number; // Maximum number of files allowed (default: 1)
  onUpload: (fileUrls: string[], documentType: string) => void;
  isUploading?: boolean;
  onUploadedUrlsChange?: (urls: string[]) => void; // Callback when uploaded URLs change
}

export default function DocumentUploadInline({
  documentType,
  maxFiles = 1,
  onUpload,
  isUploading = false,
  onUploadedUrlsChange,
}: DocumentUploadInlineProps) {

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileData[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showPhotoUI, setShowPhotoUI] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = async (file: File) => {
    // Custom validation for images and PDFs
    const validateFileWithPdf = (file: File): { isValid: boolean; error?: string } => {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return {
          isValid: false,
          error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 5MB limit`
        };
      }

      // Check file type (images and PDFs)
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      
      if (!isImage && !isPdf) {
        return {
          isValid: false,
          error: 'Only image files (JPG, PNG) and PDF files are allowed'
        };
      }

      return { isValid: true };
    };

    // Validate file
    const validation = validateFileWithPdf(file);
    if (!validation.isValid) {
      // Add file with error
      setUploadedFiles(prev => [...prev, {
        file,
        uploading: false,
        error: validation.error
      }]);
      return;
    }

    // Create a unique file entry with uploading state
    const newFileEntry: UploadedFileData = {
      file,
      uploading: true,
    };

    // Add file and get its index
    let fileIndex: number = -1;
    setUploadedFiles(prev => {
      fileIndex = prev.length;
      return [...prev, newFileEntry];
    });

    try {
      // Upload file and get clean URL
      const uploadResult = await UploadService.uploadFileWithPresignedUrl(file);
      
      // Save image URL to localStorage for user photo
      const isImage = file.type.startsWith('image/');
      if (isImage && uploadResult.cleanUrl) {
        localStorage.setItem('userPhoto', uploadResult.cleanUrl);
        localStorage.setItem('userPhotoTimestamp', new Date().toISOString());
        console.log('Photo URL saved to localStorage:', uploadResult.cleanUrl);
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('userPhotoUpdated', { 
          detail: { photoUrl: uploadResult.cleanUrl } 
        }));
      }
      
      // Update with success - find by file object reference
      setUploadedFiles(prev => prev.map((f) => 
        f.file === file
          ? { ...f, uploading: false, url: uploadResult.cleanUrl }
          : f
      ));
    } catch (error) {
      console.error('Upload error:', error);
      // Update with error - find by file object reference
      setUploadedFiles(prev => prev.map((f) => 
        f.file === file
          ? { 
              ...f, 
              uploading: false, 
              error: error instanceof Error ? error.message : 'Upload failed. Please try again.' 
            }
          : f
      ));
    }
  };

  const handleSubmit = async () => {
    const uploadedUrls = uploadedFiles
      .filter(f => f.url && !f.error)
      .map(f => f.url!);
    
    console.log('uploadedUrls', uploadedUrls, documentType);
    await onUpload(uploadedUrls, documentType);
  };

  const handleRemove = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, // 'user' for front camera (selfie)
        audio: false 
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
      
      // Set video stream once the video element is ready
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame to canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob and create File
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
            handleFileSelect(file);
            closeCamera();
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Set video source when stream is available
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Notify parent when uploaded URLs change
  useEffect(() => {
    if (onUploadedUrlsChange) {
      const urls = uploadedFiles
        .filter(f => f.url && !f.error)
        .map(f => f.url!);
      onUploadedUrlsChange(urls);
    }
  }, [uploadedFiles, onUploadedUrlsChange]);

  const hasSuccessfulUploads = uploadedFiles.some(f => f.url && !f.error);
  const isAnyUploading = uploadedFiles.some(f => f.uploading);
  const canAddMore = uploadedFiles.length < maxFiles;

  // Hide Photo UI after submission if isUploading changes from true to false
  useEffect(() => {
    if (documentType === 'Photo' && !isUploading && hasSuccessfulUploads) {
      // Hide the Photo UI after successful submission
      setShowPhotoUI(false);
    }
  }, [isUploading, documentType, hasSuccessfulUploads]);

  return (
    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-blue-700">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
          </svg>
          <span className="text-sm font-medium">Upload {documentType}</span>
        </div>
        {/* {maxFiles > 1 && (
          <span className="text-xs text-gray-600">
            {uploadedFiles.length} / {maxFiles} files
          </span>
        )} */}
      </div>
      
      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((fileData, index) => {
            const isPdf = fileData.file.type === 'application/pdf';
            
            return (
              <div key={index} className="bg-white rounded border p-2 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {/* File type icon */}
                    {isPdf ? (
                      <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18.5,9H13V3.5L18.5,9M6,20V4H12V10H18V20H6Z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19M8.5,13.5L11,16.5L14.5,12L19,18H5L8.5,13.5Z" />
                      </svg>
                    )}
                    <span className="truncate text-gray-800">{fileData.file.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                    {fileData.uploading ? (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : fileData.url ? (
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    ) : fileData.error ? (
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                    ) : null}
                    <button
                      onClick={() => handleRemove(index)}
                      className="text-red-500 hover:text-red-700"
                      disabled={fileData.uploading}
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                </div>
                {fileData.error && (
                  <p className="text-xs text-red-600">{fileData.error}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload options - show if can add more files */}
      {canAddMore && (
        <div className="space-y-2 flex gap-2" >
          {/* File Upload Option */}
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-lg p-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <svg className="w-5 h-5 text-blue-400 mb-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
            </svg>
            <span className="text-xs text-blue-600">
              {uploadedFiles.length === 0 ? `Upload ${documentType}` : 'Add another file'}
            </span>
            <span className="text-xs text-gray-500 mt-0.5">Max 5MB • JPG, PNG, PDF</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple={maxFiles > 1}
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                // Only process files up to the max limit
                const remainingSlots = maxFiles - uploadedFiles.length;
                const filesToUpload = files.slice(0, remainingSlots);
                
                filesToUpload.forEach(file => handleFileSelect(file));
                e.target.value = ''; // Reset input
              }}
            />
          </label>

      {(documentType === 'Photo' || true) && (
        <button
            onClick={openCamera}
            className="w-1/2 mb-2 flex flex-col items-center justify-center border-2 border-dashed border-green-300 rounded-lg p-3 hover:border-green-400 hover:bg-green-50 transition-colors"
          >
            <svg className="w-5 h-5 text-green-400 mb-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z" />
            </svg>
            <span className="text-xs text-green-600 font-medium">Capture Photo</span>
            <span className="text-xs text-gray-500">Use your camera</span>
          </button>
        )}
        </div>
      )}

      {/* Submit button - show if has successful uploads */}
      {hasSuccessfulUploads && (
        <button
          onClick={handleSubmit}
          disabled={isUploading || isAnyUploading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Submitting...</span>
            </div>
          ) : (
            `Submit ${documentType}`
          )}
        </button>
      )}

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Take Selfie</h3>
              <button
                onClick={closeCamera}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Video Preview */}
            <div className="relative bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-h-[60vh] object-contain"
              />
              {/* Guide overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-white border-dashed rounded-full w-64 h-64 opacity-50"></div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 p-6">
              <button
                onClick={closeCamera}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="px-8 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9,2L7.17,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6A2,2 0 0,0 20,4H16.83L15,2H9M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z" />
                </svg>
                Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
