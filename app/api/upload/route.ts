import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export async function POST(request: NextRequest) {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }
    const uploaded: { id: string; name: string; url: string; size: number }[] = []
    for (const file of files) {
      const ext = path.extname(file.name) || '.jpg'
      const id = generateId()
      const filename = `${id}${ext}`
      const filepath = path.join(UPLOAD_DIR, filename)
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filepath, buffer)
      uploaded.push({ id, name: filename, url: `/uploads/${filename}`, size: file.size })
    }
    return NextResponse.json({ images: uploaded })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
