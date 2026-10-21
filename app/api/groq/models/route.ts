import { NextResponse } from 'next/server';
import { groqModels, groqKey, pickChatModel } from '@/lib/groq';

export const dynamic = 'force-dynamic';

// Live Groq model list (all models available to the server's key).
export async function GET() {
  if (!groqKey()) return NextResponse.json({ error: 'GROQ_API_KEY Vercel environment variables mein set nahi hai.', models: [] }, { status: 500 });
  const models = await groqModels();
  return NextResponse.json({ models, defaultModel: pickChatModel(models) });
}
