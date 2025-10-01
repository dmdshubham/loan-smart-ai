// Service for handling file uploads with presigned URLs

interface PresignedUrlRequest {
  contentType: string
}

interface PresignedUrlResponse {
  success: boolean
  message: string
  data: {
    presignedUrl: string
    fileKey: string
    maxFileSize: number
    expiresIn: number
  }
}

const PRESIGNED_URL_ENDPOINT = `${process.env.NEXT_PUBLIC_UPLOAD_FILE_BASE_URL}/api/v1/presigned-url`
  
export class UploadService {
  /**
   * Get presigned URL for file upload
   */
  static async getPresignedUrl(contentType: string): Promise<PresignedUrlResponse> {
    try {
      const response = await fetch(PRESIGNED_URL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contentType })
      })

      if (!response.ok) {
        throw new Error(`Failed to get presigned URL: ${response.status}`)
      }

      const data: PresignedUrlResponse = await response.json()
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to generate presigned URL')
      }

      return data
    } catch (error) {
      console.error('Error getting presigned URL:', error)
      throw error
    }
  }

  /**
   * Upload file to S3 using presigned URL
   */
  static async uploadFile(presignedUrl: string, file: File, contentType: string): Promise<void> {
    try {
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: file
      })

      if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.status}`)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    }
  }

  /**
   * Extract clean S3 URL from presigned URL (removes query parameters)
   */
  static getCleanS3Url(presignedUrl: string): string {
    try {
      const url = new URL(presignedUrl)
      return `${url.protocol}//${url.host}${url.pathname}`
    } catch (error) {
      console.error('Error extracting clean URL:', error)
      return presignedUrl // Return original if parsing fails
    }
  }

  /**
   * Complete upload process: get presigned URL and upload file
   */
  static async uploadFileWithPresignedUrl(file: File): Promise<{ fileKey: string; cleanUrl: string }> {
    try {
      // Step 1: Get presigned URL
      const presignedData = await this.getPresignedUrl(file.type)
      
      // Step 2: Upload file to S3
      await this.uploadFile(presignedData.data.presignedUrl, file, file.type)
      
      // Step 3: Extract clean S3 URL and return both fileKey and clean URL
      const cleanUrl = this.getCleanS3Url(presignedData.data.presignedUrl)
      
      return {
        fileKey: presignedData.data.fileKey,
        cleanUrl: cleanUrl
      }
      
    } catch (error) {
      console.error('Error in complete upload process:', error)
      throw error
    }
  }

  /**
   * Validate file before upload
   */
  static validateFile(file: File, maxSizeBytes: number = 5242880): { isValid: boolean; error?: string } {
    // Check file size (default 5MB)
    if (file.size > maxSizeBytes) {
      return {
        isValid: false,
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds limit (${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB)`
      }
    }

    // Check file type (images only)
    if (!file.type.startsWith('image/')) {
      return {
        isValid: false,
        error: 'Only image files are allowed'
      }
    }

    return { isValid: true }
  }

  /**
   * Get file extension from content type
   */
  static getFileExtension(contentType: string): string {
    const typeMap: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg', 
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp'
    }
    
    return typeMap[contentType] || 'jpg'
  }
}
