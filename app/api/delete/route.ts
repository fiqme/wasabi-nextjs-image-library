import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

export async function DELETE(request: NextRequest) {
  try {
    const { filename } = await request.json()
    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 })
    }
    const safe = path.basename(filename)
    const filepath = path.join(UPLOAD_DIR, safe)
    if (!existsSync(filepath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    await unlink(filepath)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
