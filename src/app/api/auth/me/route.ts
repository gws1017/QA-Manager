import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('qa_user_id')?.value ?? null;
  const wsIdRaw = cookieStore.get('qa_ws_id')?.value;
  return NextResponse.json({ userId, workspaceId: wsIdRaw ? Number(wsIdRaw) : null });
}
