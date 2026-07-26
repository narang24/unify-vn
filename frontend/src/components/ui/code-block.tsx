"use client";

import React, { useState, useCallback } from "react";
import { Check, Copy, FileCode } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  highlightLines?: number[];
}

export function CodeBlock({
  code,
  language = "plaintext",
  filename,
  highlightLines = [],
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const lines = code.split("\n");
  // Remove trailing empty line if code ends with \n
  const displayLines = lines[lines.length - 1] === "" ? lines.slice(0, -1) : lines;
  const highlightSet = new Set(highlightLines);

  return (
    <div className="code-block-root">
      {/* Header */}
      <div className="code-block-header">
        <div className="code-block-header-left">
          <FileCode className="code-block-header-icon" />
          {filename && <span className="code-block-filename">{filename}</span>}
          {language && (
            <span className="code-block-lang-badge">{language}</span>
          )}
        </div>
        <button
          className="code-block-copy-btn"
          onClick={handleCopy}
          aria-label="Copy code"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="code-block-copy-icon" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="code-block-copy-icon" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code body */}
      <div className="code-block-body">
        <pre className="code-block-pre">
          <table className="code-block-table">
            <tbody>
              {displayLines.map((line, i) => {
                const lineNumber = i + 1;
                const isHighlighted = highlightSet.has(lineNumber);
                return (
                  <tr
                    key={i}
                    className={`code-block-row${isHighlighted ? " code-block-row--highlighted" : ""}`}
                  >
                    <td className="code-block-line-num">{lineNumber}</td>
                    <td className="code-block-line-content">
                      <code>{line || " "}</code>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </pre>
      </div>
    </div>
  );
}
