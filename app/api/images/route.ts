import { NextResponse } from 'next/server'
import { readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'])

export async function GET() {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      return NextResponse.json({ images: [] })
    }
    const files = await readdir(UPLOAD_DIR)
    const images = []
    for (const file of files) {
      const ext = path.extname(file).toLowerCase()
      if (!ALLOWED_EXT.has(ext)) continue
      const filepath = path.join(UPLOAD_DIR, file)
      const stats = await stat(filepath)
      const id = path.basename(file, ext)
      images.push({
        id,
        name: file,
        url: `/uploads/${file}`,
        size: stats.size,
        uploadedAt: stats.mtime.toISOString(),
      })
    }
    images.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    return NextResponse.json({ images })
  } catch (error) {
    console.error('List error:', error)
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 })
  }
}
