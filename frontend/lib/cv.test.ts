import { describe, it } from 'node:test'
import assert from 'node:assert'
import { validateCvFile, extractCv } from './cv'
import { api } from './api'

describe('validateCvFile', () => {
  it('should return valid true for a valid PDF file under 5MB', () => {
    const mockFile = {
      type: 'application/pdf',
      size: 4 * 1024 * 1024, // 4MB
    } as File

    const result = validateCvFile(mockFile)
    assert.strictEqual(result.valid, true)
    assert.strictEqual(result.error, undefined)
  })

  it('should reject non-PDF files', () => {
    const mockFile = {
      type: 'image/png',
      size: 1 * 1024 * 1024,
    } as File

    const result = validateCvFile(mockFile)
    assert.strictEqual(result.valid, false)
    assert.strictEqual(result.error, 'Invalid file type. PDF only.')
  })

  it('should reject files larger than 5MB', () => {
    const mockFile = {
      type: 'application/pdf',
      size: 6 * 1024 * 1024, // 6MB
    } as File

    const result = validateCvFile(mockFile)
    assert.strictEqual(result.valid, false)
    assert.strictEqual(result.error, 'File too large. Max 5MB.')
  })
})

describe('extractCv', () => {
  const originalPost = api.post

  it('should call api.post with correct path, formData and auth headers', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockFile = { name: 'test.pdf', type: 'application/pdf' } as any
    const mockToken = 'mock-token'
    const expectedResponse = {
      data: {
        extracted_text: 'extracted text here',
        word_count: 3,
        extraction_success: true,
      },
    }

    let calledUrl: string | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let calledData: any = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let calledConfig: any = null

    // Overwrite api.post with mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api.post = async <T = any, R = any>(url: string, data?: any, config?: any): Promise<R> => {
      calledUrl = url
      calledData = data
      calledConfig = config
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return expectedResponse as any
    }

    try {
      const result = await extractCv(mockFile, mockToken)

      assert.strictEqual(calledUrl, '/cv/extract')
      assert.ok(calledData instanceof FormData)
      assert.strictEqual(calledData.get('file'), mockFile)
      assert.deepStrictEqual(calledConfig, {
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'multipart/form-data',
        },
      })

      assert.deepStrictEqual(result, {
        extracted_text: 'extracted text here',
        word_count: 3,
        extraction_success: true,
      })
    } finally {
      // Restore original post method
      api.post = originalPost
    }
  })
})
