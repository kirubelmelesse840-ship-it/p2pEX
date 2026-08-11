/**
 * Client-side image compression utility.
 * Compresses images using the Canvas API before uploading to the server.
 * This reduces bandwidth and storage requirements for KYC document uploads.
 */

export interface CompressionOptions {
  maxWidth?: number  // Max width in pixels (default: 1920)
  maxHeight?: number // Max height in pixels (default: 1920)
  quality?: number   // JPEG quality 0..1 (default: 0.85)
  mimeType?: string  // Output MIME type (default: 'image/jpeg')
}

/**
 * Compress an image file client-side using canvas.
 *
 * @param file - The original File/Blob from a file input
 * @param options - Compression options
 * @returns A Promise resolving to a compressed Blob
 */
export async function compressImage(file: File | Blob, options: CompressionOptions = {}): Promise<Blob> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    mimeType = 'image/jpeg',
  } = options

  // Read the file as a data URL
  const dataUrl = await readFileAsDataURL(file)
  // Load it into an Image element
  const img = await loadImage(dataUrl)

  // Calculate dimensions while preserving aspect ratio
  let { width, height } = img
  if (width > maxWidth) {
    height = (height * maxWidth) / width
    width = maxWidth
  }
  if (height > maxHeight) {
    width = (width * maxHeight) / height
    height = maxHeight
  }
  width = Math.round(width)
  height = Math.round(height)

  // Draw to canvas at the new size
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context not available')

  // White background (for transparent PNGs → JPEG)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)

  ctx.drawImage(img, 0, 0, width, height)

  // Convert canvas to compressed blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to compress image'))
      },
      mimeType,
      quality
    )
  })
}

/**
 * Compress an image and return as base64 string (for storing in DB or sending as JSON).
 */
export async function compressImageToBase64(file: File | Blob, options?: CompressionOptions): Promise<string> {
  const blob = await compressImage(file, options)
  return readFileAsDataURL(blob)
}

function readFileAsDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
