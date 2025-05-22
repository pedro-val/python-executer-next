import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const execPromise = promisify(exec);
const PYTHON_PATH = process.env.PYTHON_PATH || 'python';
const NSJAIL_CONFIG_PATH = process.env.NSJAIL_CONFIG_PATH || path.join(process.cwd(), 'config', 'nsjail_config.proto');
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.join(process.cwd(), 'workspace');

/**
 * Execute Python code securely using nsjail
 * @param {string} pythonCode
 * @returns {Promise<{result: Object, stdout: string}>}
 */
export async function executePythonCode(pythonCode) {
  if (!pythonCode.includes('def main():')) {
    throw new Error('Script must contain a main() function');
  }

  const scriptName = `script-${uuidv4()}.py`;
  const workspacePath = path.join(WORKSPACE_DIR, scriptName);
  
  try {
    const wrapperScript = createWrapperScript(pythonCode);
    
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });
    
    await fs.writeFile(workspacePath, wrapperScript);
    
    let command;
    
    try {
      await execPromise('which nsjail');
      
      command = `nsjail --config ${NSJAIL_CONFIG_PATH} -- ${PYTHON_PATH} ${workspacePath}`;
      console.info(`Using nsjail for secure execution with config: ${NSJAIL_CONFIG_PATH}`);
    } catch (error) {
      console.error('nsjail not found. Secure execution is mandatory.');
      throw new Error('nsjail is not installed. Secure execution is mandatory for this service.');
    }

    const { stdout, stderr } = await execPromise(command, { timeout: 30000 });
    
    if (stderr) {
      console.warn(`Python stderr: ${stderr}`);
    }

    const result = parseExecutionOutput(stdout);
    return result;
  } catch (error) {
    console.error(`Execution error: ${error.message}`);
    throw new Error(`Failed to execute Python code: ${error.message}`);
  } finally {
    try {
      await fs.unlink(workspacePath);
    } catch (error) {
      console.warn(`Failed to clean up temporary file: ${error.message}`);
    }
  }
}

/**
 * Create a wrapper script to capture main() return value and stdout
 * @param {string} originalScript
 * @returns {string}
 */
function createWrapperScript(originalScript) {
  return `
import sys
import os
import json
import io
import traceback
from contextlib import redirect_stdout, redirect_stderr

def format_error(error_type, error_message, error_traceback):
    """Format error information into a structured dictionary."""
    return {
        "error": {
            "type": error_type,
            "message": str(error_message),
            "traceback": error_traceback
        }
    }

# Capture both stdout and stderr
stdout_buffer = io.StringIO()
stderr_buffer = io.StringIO()

# Original script
${originalScript}

try:
    # Validate main function exists
    if 'main' not in globals() or not callable(globals()['main']):
        result = format_error(
            "RuntimeError",
            "main() function not found or not callable",
            ""
        )
    else:
        # Execute main() and capture output
        with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
            try:
                main_result = main()
                
                # Validate JSON serialization
                try:
                    json.dumps(main_result)
                    result = {
                        "success": True,
                        "data": main_result
                    }
                except (TypeError, OverflowError) as e:
                    result = format_error(
                        "JSONSerializationError",
                        "Return value from main() is not JSON serializable",
                        str(e)
                    )
            except Exception as e:
                result = format_error(
                    e.__class__.__name__,
                    str(e),
                    traceback.format_exc()
                )
except Exception as e:
    # Catch any other unexpected errors
    result = format_error(
        "SystemError",
        "Unexpected error during execution",
        traceback.format_exc()
    )

# Output the final result with stdout and stderr
final_output = {
    **result,
    "stdout": stdout_buffer.getvalue(),
    "stderr": stderr_buffer.getvalue()
}

print("___EXECUTION_RESULT___")
print(json.dumps(final_output))
`;
}

/**
 * Parse the execution output to extract result and output streams
 * @param {string} output
 * @returns {{result: Object, stdout: string, stderr: string, error?: Object}}
 */
function parseExecutionOutput(output) {
  try {
    const parts = output.split('___EXECUTION_RESULT___');
    if (parts.length < 2) {
      throw new Error('Failed to parse execution result');
    }
    
    const resultJson = parts[1].trim();
    const executionResult = JSON.parse(resultJson);
    
    return {
      success: executionResult.success || false,
      result: executionResult.data,
      error: executionResult.error,
      stdout: executionResult.stdout || '',
      stderr: executionResult.stderr || ''
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'ParseError',
        message: 'Failed to parse Python execution output',
        details: error.message
      },
      stdout: '',
      stderr: output
    };
  }
}