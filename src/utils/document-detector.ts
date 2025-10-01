// Document upload detection utility

interface DocumentUploadRequest {
  documentType: string
  isUploadRequest: boolean
  sides?: ('front' | 'back')[]
}

interface DocumentField {
  fieldName: string
  url: string
}

interface ParsedDocumentUrls {
  documentType: string | null
  urls: string[]
  rawText: string
  fields: DocumentField[] // All document fields found
}

// Parse document URLs from text message - handles any document type pattern
export function parseDocumentUrls(text: string): ParsedDocumentUrls {
  const fields: DocumentField[] = []
  const urls: string[] = []
  
  // Match pattern: field_name='url' or field_name="url"
  // Handles formats like: aadhaar_card_front_url='...', aadhaar_card_back_url='...'
  const urlPattern = /(\w+_url[s]?)\s*=\s*["']([^"']+)["']/gi
  
  let match
  while ((match = urlPattern.exec(text)) !== null) {
    const fieldName = match[1]
    const url = match[2]
    
    if (url && url.startsWith('http')) {
      fields.push({ fieldName, url })
      urls.push(url)
    }
  }
  
  if (fields.length === 0) {
    return {
      documentType: null,
      urls: [],
      rawText: text,
      fields: []
    }
  }
  
  // Determine document type from the field names
  const documentType = extractDocumentType(fields)
  
  return {
    documentType,
    urls,
    rawText: text,
    fields
  }
}

// Extract document type from field names
function extractDocumentType(fields: DocumentField[]): string {
  if (fields.length === 0) return 'Document'
  
  // Get the base document type from the first field
  const firstField = fields[0].fieldName
  
  // Remove common suffixes to get the base type
  const baseType = firstField
    .replace(/_front_url[s]?$/i, '')
    .replace(/_back_url[s]?$/i, '')
    .replace(/_url[s]?$/i, '')
  
  // Check if it's a grouped document (e.g., aadhaar_card with front and back)
  if (fields.length > 1) {
    const allSameBase = fields.every(f => {
      const fBase = f.fieldName
        .replace(/_front_url[s]?$/i, '')
        .replace(/_back_url[s]?$/i, '')
        .replace(/_url[s]?$/i, '')
      return fBase === baseType
    })
    
    if (allSameBase) {
      return baseType
    }
  }
  
  return baseType
}

// Format document type for display
export function formatDocumentType(type: string): string {
  // Convert snake_case to Title Case
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function detectDocumentUploadRequest(message: string): DocumentUploadRequest {
  const normalizedMessage = message.toLowerCase()
  
  // Check for upload-related keywords
  const hasUploadKeywords = /upload|attach|send|provide|share|submit/i.test(message)
  
  if (!hasUploadKeywords) {
    return {
      documentType: '',
      isUploadRequest: false
    }
  }

  // Find all potential document matches with their contexts
  const documentPatterns = [
    {
      pattern: /(?:upload|attach|send|provide|share|submit).*?(?:proof.*?of.*?income|income.*?proof|income.*?statement|income.*?document)|(?:proof.*?of.*?income|income.*?proof).*?(?:photo|image|picture|document|pdf)/i,
      type: 'Proof of Income',
      sides: ['']
    },
    {
      pattern: /(?:upload|attach|send|provide|share|submit).*?bank.*?statement|bank.*?statement.*?(?:photo|image|picture)/i,
      type: 'Bank Statement',
      sides: ['']
    },
    {
      pattern: /(?:upload|attach|send|provide|share|submit).*?(?:salary.*?slip|pay.*?slip|payslip)|(?:salary.*?slip|pay.*?slip|payslip).*?(?:photo|image|picture)/i,
      type: 'Salary Slip',
      sides: ['']
    },
    {
      pattern: /(?:upload|attach|send|provide|share|submit).*?(?:your|a|the)?\s*photo(?!\s*(?:of|id|card))|(?:upload|attach|send|provide|share|submit).*?(?:selfie|picture|image)(?!\s*(?:of|card))/i,
      type: 'Photo',
      sides: ['']
    },
    
  ]

  // Find the most specific match by checking patterns in order of specificity
  for (const docPattern of documentPatterns) {
    if (docPattern.pattern.test(message)) {
      // Additional checks for sides based on message content
      let sides = docPattern.sides
      
      if (docPattern.type === 'Passport') {
        // For passport, check if only first/front page is mentioned
        if (/(?:first.*?page|front.*?page)(?!.*(?:last|back|both))/i.test(message) && !/(?:last|back)/i.test(message)) {
          sides = ['front']
        }
      }

      return {
        documentType: docPattern.type,
        isUploadRequest: true,
        sides: sides as ('front' | 'back')[]
      }
    }
  }

  // Generic document detection as fallback
  if (/(?:upload|attach|send|provide|share|submit).*?(?:document|doc|photo|image|picture|file)/i.test(message)) {
    return {
      documentType: 'Document',
      isUploadRequest: true,
      sides: ['front']
    }
  }

  return {
    documentType: '',
    isUploadRequest: false
  }
}

export function formatDocumentMessage(fileUrls: { front?: string; back?: string }, documentType: string): string {
  const fileDescriptions: string[] = []
  
  if (fileUrls.front) {
    fileDescriptions.push(`${documentType} (Front)`)
  }
  if (fileUrls.back) {
    fileDescriptions.push(`${documentType} (Back)`)
  }
  
  return `📎 Uploaded ${fileDescriptions.join(' and ')}`
}

export function formatApiMessage(fileUrls: { front?: string; back?: string }, documentType: string): string {
  // Format the message according to user's specific requirements
  const docTypeLower = documentType.toLowerCase().replace(/\s+/g, '_')
  const parts: string[] = []
  
  if (fileUrls.front) {
    parts.push(`${docTypeLower}_front_url='${fileUrls.front}'`)
  }
  if (fileUrls.back) {
    parts.push(`${docTypeLower}_back_url='${fileUrls.back}'`)
  }
  
  return parts.join(', ')
}
