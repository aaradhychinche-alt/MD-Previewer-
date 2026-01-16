
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasGithubId: !!process.env.AUTH_GITHUB_ID || !!process.env.GITHUB_ID,
    hasGithubSecret: !!process.env.AUTH_GITHUB_SECRET || !!process.env.GITHUB_SECRET,
    nodeEnv: process.env.NODE_ENV,
    authUrl: process.env.AUTH_URL || 'Not Set',
  });
}
