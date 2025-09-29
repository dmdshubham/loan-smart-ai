import React, { useState, useRef } from 'react';
import { fileUploadService, UploadProgress, FileUploadResult } from '@/service/fileUpload';

interface FileUploadProps {
  onFileUploaded: (fileUrl: string) => void;
  onError: (error: string) => void;
}

interface FilePreview {
  file: File;
  progress: UploadProgress;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  fileUrl?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded, onError }) => {
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file
    const validation = fileUploadService.validateFile(file);
    if (!validation.valid) {
      onError(validation.error || 'Invalid file');
      return;
    }

    // Add file to preview list
    const filePreview: FilePreview = {
      file,
      progress: { loaded: 0, total: file.size, percentage: 0 },
      status: 'uploading',
    };

    setFilePreviews(prev => [...prev, filePreview]);
    setIsUploading(true);

    try {
      // Upload file with progress tracking
      const result = await fileUploadService.uploadFileWithProgress(
        file,
        (progress: UploadProgress) => {
          setFilePreviews(prev => 
            prev.map(fp => 
              fp.file === file 
                ? { ...fp, progress }
                : fp
            )
          );
        }
      );

      if (result.success && result.file_url) {
        // Update file preview with success status
        setFilePreviews(prev => 
          prev.map(fp => 
            fp.file === file 
              ? { ...fp, status: 'completed', fileUrl: result.file_url }
              : fp
          )
        );
        
        // Notify parent component
        onFileUploaded(result.file_url);
      } else {
        // Update file preview with error status
        setFilePreviews(prev => 
          prev.map(fp => 
            fp.file === file 
              ? { ...fp, status: 'error', error: result.error }
              : fp
          )
        );
        
        onError(result.error || 'Upload failed');
      }
    } catch (error) {
      // Update file preview with error status
      setFilePreviews(prev => 
        prev.map(fp => 
          fp.file === file 
            ? { ...fp, status: 'error', error: 'Upload failed' }
            : fp
        )
      );
      
      onError('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (file: File) => {
    setFilePreviews(prev => prev.filter(fp => fp.file !== file));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    } else if (fileType === 'application/pdf') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,application/pdf,.doc,.docx,.txt"
      />

      {/* Upload file button */}
      <button
        onClick={handleAttachmentClick}
        disabled={isUploading}
        className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
        title="Upload file"
      >
        <svg className="w8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L9 9.586V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </button>

      {/* File previews */}
      {filePreviews.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-3 space-y-2">
          {filePreviews.map((filePreview, index) => (
            <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
              <div className="text-blue-500">
                {getFileIcon(filePreview.file.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {filePreview.file.name}
                </div>
                <div className="text-xs text-gray-500">
                  {formatFileSize(filePreview.file.size)}
                </div>
                
                {/* Progress bar */}
                {filePreview.status === 'uploading' && (
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${filePreview.progress.percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {filePreview.progress.percentage}%
                    </div>
                  </div>
                )}
                
                {/* Status indicators */}
                {filePreview.status === 'completed' && (
                  <div className="flex items-center space-x-1 mt-1">
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-green-600">Uploaded</span>
                  </div>
                )}
                
                {filePreview.status === 'error' && (
                  <div className="flex items-center space-x-1 mt-1">
                    <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-red-600">
                      {filePreview.error || 'Upload failed'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Remove button */}
              <button
                onClick={() => removeFile(filePreview.file)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;