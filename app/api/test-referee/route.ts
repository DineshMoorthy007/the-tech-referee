import { NextRequest, NextResponse } from 'next/server';
import { callOpenAI } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    console.log('Test referee endpoint called');
    
    const body = await request.json();
    const { tech1, tech2 } = body;
    
    console.log('Technologies:', tech1, 'vs', tech2);
    
    // Simple prompt for testing
    const simplePrompt = `Compare ${tech1} vs ${tech2} in a brief paragraph.`;
    
    console.log('Calling OpenAI with simple prompt...');
    const response = await callOpenAI(simplePrompt);
    
    console.log('OpenAI response received, length:', response.length);
    
    return NextResponse.json({
      success: true,
      data: {
        tech1,
        tech2,
        analysis: response,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Test referee error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}