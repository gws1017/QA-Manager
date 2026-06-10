import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const filepath = path.join(process.cwd(), 'data', 'screenshots', filename);
  if (!fs.existsSync(filepath)) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const ext = filename.split('.').pop()?.toLowerCase() ?? 'png';
  const mimeMap: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
  };
  const contentType = mimeMap[ext] ?? 'application/octet-stream';
  const buffer = fs.readFileSync(filepath);
  return new Response(buffer, { headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000' } });
}
