# Python Executor Next

A secure web-based Python code execution environment built with Next.js and Docker. This application allows users to write and execute Python code in a sandboxed environment with real-time output visualization.

## Features

- 🚀 Real-time Python code execution
- 🔒 Secure sandboxed environment using nsjail
- 📊 JSON output visualization
- 💻 Monaco code editor integration
- 🎨 Modern UI with Tailwind CSS
- 🐳 Containerized execution environment

## Technologies

- **Frontend:**
  - Next.js 15.3
  - React 19
  - Monaco Editor
  - Tailwind CSS
  - Geist Font Family

- **Backend:**
  - Node.js 18
  - Python 3
  - nsjail (for secure code execution)

## Running with Docker

1. **Build the Docker image:**
   ```bash
   npm run docker:build
   ```
   or
   ```bash
   docker build -t python-executer-next .
   ```

2. **Run the container:**
   ```bash
   npm run docker:run
   ```
   or
   ```bash
   docker run -p 3000:3000 python-executer-next
   ```

3. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`

## Security Features

- Sandboxed Python execution using nsjail
- Resource limits for CPU and memory usage
- Restricted file system access
- Network isolation
- Temporary workspace cleanup after execution

## Usage

1. Write your Python code in the editor
2. Ensure your code includes a `main()` function that returns JSON-serializable data
3. Click "Execute Code" to run your script
4. View the execution results and stdout in the right panel

## Example Code

```python
def main():
    """
    Example function that returns a simple JSON-serializable dictionary.
    """
    result = {
        "message": "Hello, World!",
        "numbers": [1, 2, 3, 4, 5]
    }
    return result  # Use Python syntax - no need for //

```

## Development Requirements

- Docker

## Notes

- Maximum execution time: 30 seconds
- Maximum payload size: 1MB
