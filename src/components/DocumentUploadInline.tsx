import { useState } from 'react';
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
}

export default function DocumentUploadInline({
  documentType,
  maxFiles = 1,
  onUpload,
  isUploading = false,
}: DocumentUploadInlineProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileData[]>([]);

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

  const hasSuccessfulUploads = uploadedFiles.some(f => f.url && !f.error);
  const isAnyUploading = uploadedFiles.some(f => f.uploading);
  const canAddMore = uploadedFiles.length < maxFiles;

  return (
    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-blue-700">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
          </svg>
          <span className="text-sm font-medium">Upload {documentType}</span>
        </div>
        {maxFiles > 1 && (
          <span className="text-xs text-gray-600">
            {uploadedFiles.length} / {maxFiles} files
          </span>
        )}
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

      {/* Upload button - show if can add more files */}
      {canAddMore && (
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
    </div>
  );
}
