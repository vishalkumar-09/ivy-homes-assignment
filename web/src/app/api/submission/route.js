import { NextResponse } from 'next/server';
import submissionData from '../../../../submission.json';

export async function GET() {
  return NextResponse.json(submissionData);
}
