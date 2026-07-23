import { api } from './api'

export interface CvExtractResponse {
  extracted_text: string
  word_count: number
  extraction_success: boolean
}

/**
 * Validates a CV file on the client side (type and size constraints).
 * @param file The file to validate
 */
export function validateCvFile(file: File): { valid: boolean; error?: string } {
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'Invalid file type. PDF only.' }
  }

  const maxSizeBytes = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSizeBytes) {
    return { valid: false, error: 'File too large. Max 5MB.' }
  }

  return { valid: true }
}

/**
 * Uploads the CV file to the API for text extraction.
 * @param file The PDF file
 * @param token The auth token
 */
export async function extractCv(
  file: File,
  token: string
): Promise<CvExtractResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await api.post<CvExtractResponse>('/cv/extract', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  })

  return res.data
}
