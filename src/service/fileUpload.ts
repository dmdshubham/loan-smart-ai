export interface PresignedUrlResponse {
  success: boolean;
  message: string;
  data: {
    presignedUrl: string;
    fileKey: string;
    maxFileSize: number;
    expiresIn: number;
  };
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadResult {
  success: boolean;
  file_url?: string;
  error?: string;
}

export class FileUploadService {
  private static instance: FileUploadService;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_UPLOAD_FILE_BASE_URL || 'http://144.24.127.147:3000';
  }

  static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  /**
   * Generate presigned URL for file upload
   */
  async generatePresignedUrl(file: File): Promise<PresignedUrlResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contentType: file.type,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate presigned URL: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to generate presigned URL');
    }

    return result;
  }

  /**
   * Upload file to presigned URL with progress tracking
   */
  async uploadFile(
    file: File,
    presignedUrl: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileUploadResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          };
          onProgress(progress);
        }
      });

      // Handle upload completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            success: true,
            file_url: presignedUrl.split('?')[0], // Remove query parameters to get clean URL
          });
        } else {
          resolve({
            success: false,
            error: `Upload failed with status: ${xhr.status}`,
          });
        }
      });

      // Handle upload errors
      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: 'Upload failed due to network error',
        });
      });

      // Handle upload abort
      xhr.addEventListener('abort', () => {
        resolve({
          success: false,
          error: 'Upload was cancelled',
        });
      });

      // Start the upload
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  /**
   * Complete file upload process: generate presigned URL and upload file
   */
  async uploadFileWithProgress(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileUploadResult> {
    try {
      // Step 1: Generate presigned URL
      const presignedData = await this.generatePresignedUrl(file);
      
      // Step 2: Upload file to presigned URL
      const uploadResult = await this.uploadFile(file, presignedData.data.presignedUrl, onProgress);
      
      if (uploadResult.success) {
        // Extract the base URL from presigned URL (remove query parameters)
        const fileUrl = presignedData.data.presignedUrl.split('?')[0];
        return {
          success: true,
          file_url: fileUrl,
        };
      } else {
        return uploadResult;
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB (as per API response)
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size must be less than 5MB',
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not supported. Please upload images, PDFs, or documents.',
      };
    }

    return { valid: true };
  }
}

export const fileUploadService = FileUploadService.getInstance();