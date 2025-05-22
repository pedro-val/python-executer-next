"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  { ssr: false }
);

const JSONValue = ({ value }) => {
  const valueType = typeof value;
  
  if (value === null) return <span className="text-gray-500">null</span>;
  
  if (value === undefined) return <span className="text-gray-500">undefined</span>;
  
  if (valueType === 'string') return <span className="text-green-600">&quot;{value}&quot;</span>;
  
  if (valueType === 'number') return <span className="text-blue-600">{value}</span>;
  
  if (valueType === 'boolean') return <span className="text-purple-600">{value.toString()}</span>;
  
  if (Array.isArray(value)) return <JSONArray data={value} />;
  
  if (valueType === 'object') return <JSONObject data={value} />;
  
  return <span>{String(value)}</span>;
};

const JSONArray = ({ data, isRoot = false }) => {
  const [isOpen, setIsOpen] = useState(isRoot);
  
  return (
    <div className="ml-2">
      <span 
        className="cursor-pointer select-none" 
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '▼' : '▶'} Array[{data.length}]
      </span>
      
      {isOpen && (
        <div className="ml-4 border-l-2 border-gray-300 pl-2">
          {data.map((item, index) => (
            <div key={index} className="my-1">
              <span className="text-gray-500">{index}: </span>
              <JSONValue value={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const JSONObject = ({ data, isRoot = false }) => {
  const [isOpen, setIsOpen] = useState(isRoot);
  const entries = Object.entries(data);
  
  return (
    <div className="ml-2">
      <span 
        className="cursor-pointer select-none" 
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '▼' : '▶'} Object{entries.length > 0 ? ` {${entries.length}}` : ''}
      </span>
      
      {isOpen && (
        <div className="ml-4 border-l-2 border-gray-300 pl-2">
          {entries.map(([key, val], index) => (
            <div key={key} className="my-1">
              <span className="text-gray-800 font-medium">{key}: </span>
              <JSONValue value={val} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const JSONViewer = ({ data }) => {
  if (!data) return null;
  return (
    <pre className="bg-gray-100 p-3 rounded whitespace-pre-wrap font-mono text-sm">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};

export default function Home() {
  const [code, setCode] = useState(`def main():
    print("Hi stdout!")
    return {
        "message": "Hello, World!",
        "numbers": [1, 2, 3, 4, 5]
    }`);
  const [result, setResult] = useState(null);
  const [stdout, setStdout] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCodeChange = (value) => {
    setCode(value);
  };

  const extractPythonError = (errorMessage) => {
    if (!errorMessage) return 'Erro desconhecido';
    
    // Extrai apenas a parte relevante do erro Python
    const pythonErrorRegex = /File ".*?", line \d+[\s\S]*?(\w+Error:.*?)(?:\n\[I\]|\n$|$)/;
    const syntaxErrorRegex = /File ".*?", line \d+[\s\S]*?\^\s*\n\s*(\w+Error:.*?)(?:\n\[I\]|\n$|$)/;
    
    // Tenta encontrar erros de sintaxe primeiro (que têm o marcador ^)
    const syntaxMatch = errorMessage.match(syntaxErrorRegex);
    if (syntaxMatch) {
      // Extrai as linhas relevantes do erro de sintaxe
      const errorLines = errorMessage.match(/File ".*?", line \d+[\s\S]*?\^\s*\n\s*\w+Error:.*?(?:\n\[I\]|\n$|$)/);
      return errorLines ? errorLines[0].trim() : syntaxMatch[0].trim();
    }
    
    // Tenta encontrar outros erros Python
    const pythonMatch = errorMessage.match(pythonErrorRegex);
    if (pythonMatch) {
      // Extrai as linhas relevantes do erro
      const errorLines = errorMessage.match(/File ".*?", line \d+[\s\S]*?\w+Error:.*?(?:\n\[I\]|\n$|$)/);
      return errorLines ? errorLines[0].trim() : pythonMatch[0].trim();
    }
    
    // Se não encontrar um padrão específico, tenta extrair qualquer mensagem de erro
    const anyErrorMatch = errorMessage.match(/(\w+Error:.*?)(?:\n\[I\]|\n$|$)/);
    if (anyErrorMatch) {
      return anyErrorMatch[0].trim();
    }
    
    // Se tudo falhar, retorna apenas as primeiras linhas da mensagem
    const lines = errorMessage.split('\n');
    const relevantLines = lines.filter(line => 
      !line.startsWith('[I]') && 
      !line.includes('Mode:') && 
      !line.includes('Jail parameters:') &&
      !line.includes('Mount:')
    );
    
    return relevantLines.length > 0 
      ? relevantLines.join('\n').trim() 
      : 'Erro ao executar o código Python';
  };

  const executeCode = async () => {
    setIsLoading(true);
    setResult(null);
    setStdout('');
    setError(null);
    
    try {
      const response = await fetch('/api/python-executor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ script: code }),
      });
      
      const data = await response.json();
      
      // Registra a resposta completa para depuração
      console.log('Resposta completa:', data);
      
      if (data.error) {
        let errorMessage = '';
        
        if (typeof data.error === 'object') {
          // Se o erro for um objeto, extrai a mensagem ou detalhes
          errorMessage = JSON.stringify(data.error.details);
        } else {
          // Se for uma string, usa diretamente
          errorMessage = data.error;
        }
        
        // Também verifica se há algo em stderr
        if (data.stderr && data.stderr.trim()) {
          errorMessage = data.stderr;
        }
        
        // Exibe o erro completo sem processamento adicional
        setError(extractPythonError(errorMessage));
        setStdout(data.stdout || '');
        return;
      }
      
      setResult(data.result);
      setStdout(data.stdout || '');
    } catch (err) {
      console.error('Erro ao executar código:', err);
      setError('Falha ao executar o código. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-xl font-semibold">Python Code</h2>
              <p className="text-sm text-gray-600">
                Write Python code with a main() function that returns JSON serializable data.
              </p>
            </div>
            <button
              onClick={executeCode}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {isLoading ? 'Executing...' : 'Execute Code'}
            </button>
          </div>
          
          <div className="h-[60vh] border rounded-md overflow-hidden">
            <MonacoEditor
              height="100%"
              language="python"
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                tabSize: 4,
                automaticLayout: true,
              }}
            />
          </div>
        </div>
        
        {/* Seção de Erro */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <pre className="whitespace-pre-wrap font-mono text-sm overflow-auto">{error}</pre>
            <button 
              className="absolute top-0 right-0 px-4 py-3" 
              onClick={() => setError(null)}
            >
              <span className="text-red-500 font-bold">×</span>
            </button>
          </div>
        )}
        
        {/* Seção dos Resultados */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Standard Output</h2>
            <pre className="bg-gray-100 p-3 rounded whitespace-pre-wrap font-mono text-sm min-h-[150px] max-h-[300px] overflow-auto">
              {stdout}
            </pre>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-2">Result</h2>
            {result ? (
              <JSONViewer data={result} />
            ) : (
              <pre className="bg-gray-100 p-3 rounded whitespace-pre-wrap font-mono text-sm min-h-[150px] max-h-[300px] overflow-auto"></pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
