import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const userId = (await cookies()).get('qa_user_id')?.value ?? null;
  return NextResponse.json({ userId });
}
