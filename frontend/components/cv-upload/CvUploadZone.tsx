'use client'

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { useAuth } from '@clerk/nextjs'
import { validateCvFile, extractCv } from '../../lib/cv'
import { getUploadZoneStyles, type UploadState } from './cvStyles'

export type { UploadState }
export { getUploadZoneStyles }

export default function CvUploadZone({ onSuccess }: CvUploadZoneProps) {
  const { getToken } = useAuth()
  const [state, setState] = useState<UploadState>('default')
  const [fileName, setFileName] = useState<string>('')
  const [wordCount, setWordCount] = useState<number>(0)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (state !== 'uploading') {
      setState('dragging')
    }
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (state !== 'uploading') {
      setState('default')
    }
  }

  const processFile = async (file: File) => {
    const validation = validateCvFile(file)
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Invalid file')
      setState('error')
      return
    }

    setFileName(file.name)
    setState('uploading')

    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.')
      }

      const response = await extractCv(file, token)
      if (response.extraction_success) {
        setWordCount(response.word_count)
        setState('success')
        if (onSuccess) {
          onSuccess({
            extractedText: response.extracted_text,
            wordCount: response.word_count,
            fileName: file.name,
          })
        }
      } else {
        throw new Error('Could not extract text. The PDF might be scanned or empty.')
      }
    } catch (err: unknown) {
      // Narrow the unknown error safely before reading properties
      let message = 'Failed to extract text from PDF.'
      if (typeof err === 'object' && err !== null) {
        const axiosError = err as { response?: { data?: { error?: string } }; message?: string }
        message = axiosError.response?.data?.error ?? axiosError.message ?? message
      }
      setErrorMsg(message)
      setState('error')
    }
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (state === 'uploading') return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      if (files.length > 1) {
        setErrorMsg(`Multiple files detected. Only "${files[0].name}" will be used.`)
        setState('error')
        // Still process the first file after a brief delay so the user sees the warning
        setTimeout(() => processFile(files[0]), 1500)
        return
      }
      await processFile(files[0])
    } else {
      setState('default')
    }
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await processFile(files[0])
    }
  }

  const triggerBrowse = () => {
    if (state !== 'uploading' && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const resetUpload = () => {
    setFileName('')
    setWordCount(0)
    setErrorMsg('')
    setState('default')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf"
        className="hidden"
      />

      <div
        role="button"
        tabIndex={state === 'uploading' ? -1 : 0}
        aria-label="Upload CV PDF file. Drag and drop file or press Enter to browse."
        aria-live="polite"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={state === 'default' || state === 'error' ? triggerBrowse : undefined}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && (state === 'default' || state === 'error')) {
            e.preventDefault()
            triggerBrowse()
          }
        }}
        className={`relative overflow-hidden cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ease-out backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8796a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d2f3e] ${getUploadZoneStyles(
          state
        )}`}
      >
        {/* Subtle background overlay */}
        <div className="absolute -inset-10 bg-[#b8796a]/5 opacity-20 pointer-events-none" />

        {/* DEFAULT STATE */}
        {state === 'default' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="p-4 bg-[#575068]/80 border border-[#3d3a52] rounded-full text-[#d9998a] group-hover:scale-105 transition-transform duration-300">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-[#f5ede9]">
                Drag and drop your CV PDF here
              </p>
              <p className="text-sm text-[#a09098] mt-1">
                PDF only (Max 5MB)
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                triggerBrowse()
              }}
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-[#b8796a] hover:bg-[#d9998a] text-[#f5ede9] rounded-lg font-medium shadow-sm transition-colors duration-200"
            >
              Browse Files
            </button>
          </div>
        )}

        {/* DRAGGING STATE */}
        {state === 'dragging' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-4 pointer-events-none">
            <div className="p-4 bg-[#b8796a]/20 rounded-full text-[#d9998a]">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-[#d9998a]">
                Drop your PDF file now
              </p>
              <p className="text-sm text-[#d9998a]/80 mt-1">
                Release to start extraction
              </p>
            </div>
          </div>
        )}

        {/* UPLOADING STATE */}
        {state === 'uploading' && (
          <div className="flex flex-col items-center justify-center space-y-5 py-4">
            <div className="relative w-16 h-16">
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full border-4 border-[#b8796a]/20 animate-pulse motion-reduce:animate-none" />
              {/* Spinning loader */}
              <div className="w-16 h-16 rounded-full border-4 border-[#b8796a] border-t-transparent animate-spin motion-reduce:animate-none" />
            </div>
            <div>
              <p className="text-lg font-medium text-[#f5ede9]">
                Extracting text...
              </p>
              <p className="text-sm text-[#a09098] mt-1">
                Reading CV structure and filtering content
              </p>
            </div>
            {/* Styled progress bar */}
            <div className="w-48 h-1.5 bg-[#3d3a52] rounded-full overflow-hidden">
              <div className="h-full bg-[#b8796a] rounded-full w-2/3 transition-all duration-300 motion-reduce:transition-none" />
            </div>
          </div>
        )}

        {/* SUCCESS STATE */}
        {state === 'success' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="p-4 bg-emerald-500/20 rounded-full text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-emerald-400">
                Extraction Successful!
              </p>
              <p className="text-sm text-[#f5ede9] mt-2 font-medium max-w-md mx-auto truncate">
                {fileName}
              </p>
              <p className="text-xs text-[#a09098] mt-1">
                {wordCount} words extracted
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                resetUpload()
              }}
              className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 border border-[#3d3a52] hover:border-[#575068] bg-[#575068]/60 text-[#f5ede9] hover:text-white rounded-lg text-sm transition-all"
            >
              Try another file
            </button>
          </div>
        )}

        {/* ERROR STATE */}
        {state === 'error' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="p-4 bg-rose-500/20 rounded-full text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-rose-400">
                Upload Error
              </p>
              <p className="text-sm text-gray-300 mt-2 max-w-md mx-auto font-medium">
                {errorMsg}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                resetUpload()
              }}
              className="px-4 py-1.5 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900/60 hover:border-rose-900 text-rose-300 rounded-lg text-sm font-medium transition-all"
            >
              Try another file
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
