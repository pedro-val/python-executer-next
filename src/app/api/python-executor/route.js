import { NextResponse } from 'next/server';
import { executePythonCode } from '@/utils/python-executor';

export async function POST(request) {
  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error: {
          type: 'PayloadError',
          message: 'Payload size exceeds 1MB limit'
        }
      }, { status: 413 });
    }
    
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: {
          type: 'ParseError',
          message: 'Invalid JSON in request body'
        }
      }, { status: 400 });
    }
    
    if (!body.script) {
      return NextResponse.json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Script not provided'
        }
      }, { status: 400 });
    }
    
    if (!body.script.includes('def main():')) {
      return NextResponse.json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Script must contain a main() function'
        }
      }, { status: 400 });
    }

    const result = await executePythonCode(body.script);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        result: result.result,
        stdout: result.stdout,
        stderr: result.stderr
      });
    }
    
    const statusCode = result.error?.type === 'SystemError' ? 500 : 400;
    
    // Modificação para capturar e retornar o erro completo
    return NextResponse.json({
      success: false,
      error: result.stderr || result.error?.message || result.error || 'Erro desconhecido',
      stdout: result.stdout,
      stderr: result.stderr
    }, { status: statusCode });
    
  } catch (error) {
    console.error('Unhandled error:', error);
    return NextResponse.json({
      success: false,
      error: {
        type: 'SystemError',
        message: 'Internal server error',
        details: error.message
      }
    }, { status: 500 });
  }
}