import React from "react";

interface CodeSnippetViewerProps {
  code: string;
  language: "openai" | "anthropic" | "curl";
}

export const CodeSnippetViewer: React.FC<CodeSnippetViewerProps> = ({ code, language }) => {
  const isCurl = language === "curl";

  const renderHighlightedLine = (line: string) => {
    if (!line) return "\n";

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    const regex = isCurl
      ? /(#[^\n]*)|("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')|(\bcurl\b)|(-[a-zA-Z]+)|(https?:\/\/[^\s\\]+)/g
      : /(\/\/[^\n]*)|("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')|(\b(?:import|from|const|let|var|new|await|async|for|of|in|if|return)\b)|(\b(?:true|false|null|undefined|\d+)\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*:))|(\b(?:OpenAI|Anthropic)\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\())/g;

    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="text-zinc-300">
            {line.substring(lastIndex, match.index)}
          </span>
        );
      }

      const token = match[0];
      const key = `token-${match.index}`;

      if (isCurl) {
        if (match[1]) {
          parts.push(<span key={key} className="text-zinc-500 italic">{token}</span>);
        } else if (match[2]) {
          parts.push(<span key={key} className="text-emerald-400 font-medium">{token}</span>);
        } else if (match[3]) {
          parts.push(<span key={key} className="text-cyan-400 font-bold">{token}</span>);
        } else if (match[4]) {
          parts.push(<span key={key} className="text-amber-400 font-medium">{token}</span>);
        } else if (match[5]) {
          parts.push(<span key={key} className="text-sky-300 underline underline-offset-2">{token}</span>);
        } else {
          parts.push(<span key={key} className="text-zinc-200">{token}</span>);
        }
      } else {
        if (match[1]) {
          parts.push(<span key={key} className="text-zinc-500 italic">{token}</span>);
        } else if (match[2]) {
          parts.push(<span key={key} className="text-emerald-400">{token}</span>);
        } else if (match[3]) {
          parts.push(<span key={key} className="text-pink-400 font-semibold">{token}</span>);
        } else if (match[4]) {
          parts.push(<span key={key} className="text-amber-300">{token}</span>);
        } else if (match[5]) {
          parts.push(<span key={key} className="text-sky-300 font-medium">{token}</span>);
        } else if (match[6]) {
          parts.push(<span key={key} className="text-yellow-300 font-semibold">{token}</span>);
        } else if (match[7]) {
          parts.push(<span key={key} className="text-blue-400">{token}</span>);
        } else {
          parts.push(<span key={key} className="text-zinc-200">{token}</span>);
        }
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(
        <span key={`text-tail-${lastIndex}`} className="text-zinc-200">
          {line.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  const lines = code.split("\n");

  return (
    <pre className="text-xs font-mono overflow-x-auto leading-relaxed text-zinc-100 selection:bg-zinc-700">
      <code>
        {lines.map((line, idx) => (
          <div key={idx} className="table-row">
            <span className="table-cell pr-4 select-none text-zinc-500 text-right text-[11px] w-7 font-mono">
              {idx + 1}
            </span>
            <span className="table-cell whitespace-pre">
              {renderHighlightedLine(line)}
            </span>
          </div>
        ))}
      </code>
    </pre>
  );
};
