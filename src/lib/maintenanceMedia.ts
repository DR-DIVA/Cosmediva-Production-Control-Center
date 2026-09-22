/**
 * Maintenance Media & Photo Upload Utility
 * Handles client-side compression and uploads directly to Supabase Storage via /api/maintenance/upload
 */

export async function compressImage(file: File, maxDimension = 1280, quality = 0.75): Promise<Blob> {
  return new Promise((resolve) => {
    // If not an image or if video, return original file
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(blob)
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

export async function uploadMaintenancePhoto(
  input: File | Blob | string,
  preferredFileName?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // If already a public URL, no upload needed
    if (typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))) {
      return { success: true, url: input }
    }

    // If input is a Base64 string / Data URL
    if (typeof input === 'string') {
      const res = await fetch('/api/maintenance/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: input, fileName: preferredFileName })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to upload image' }
      }
      return { success: true, url: data.url }
    }

    // If input is File or Blob
    const formData = new FormData()
    const name = preferredFileName || (input instanceof File ? input.name : 'photo.jpg')
    formData.append('file', input, name)

    const res = await fetch('/api/maintenance/upload', {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to upload photo' }
    }
    return { success: true, url: data.url }
  } catch (err: any) {
    console.error('Error in uploadMaintenancePhoto:', err)
    return { success: false, error: err.message || 'Upload connection failed' }
  }
}
