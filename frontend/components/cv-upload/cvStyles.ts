export type UploadState = 'default' | 'dragging' | 'uploading' | 'success' | 'error'

/**
 * Gets the CSS border and background classes based on the current upload state.
 * @param state The current UploadState
 */
export function getUploadZoneStyles(state: UploadState): string {
  switch (state) {
    case 'dragging':
      return 'border-[#b8796a] bg-[#b8796a]/15 shadow-[0_0_20px_rgba(184,121,106,0.15)] scale-[1.01]'
    case 'uploading':
      return 'border-[#d9998a] bg-[#d9998a]/10 cursor-not-allowed'
    case 'success':
      return 'border-emerald-500 bg-emerald-950/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
    case 'error':
      return 'border-rose-500 bg-rose-950/10 shadow-[0_0_20px_rgba(244,63,94,0.1)]'
    case 'default':
    default:
      return 'border-[#3d3a52] bg-[#575068]/40 hover:border-[#575068] hover:bg-[#575068]/60 hover:shadow-[0_0_15px_rgba(255,255,255,0.02)]'
  }
}
