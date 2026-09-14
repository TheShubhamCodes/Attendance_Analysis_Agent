import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

/**
 * Format inline text: **bold**, `code`, and status badges
 */
function renderInline(text) {
  if (!text) return null;

  // Split by inline code `...`
  const codeParts = text.split(/(`[^`]+`)/g);
  return codeParts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono text-xs border border-slate-200 dark:border-slate-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Split by bold **...**
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return (
      <React.Fragment key={i}>
        {boldParts.map((bPart, j) => {
          if (bPart.startsWith('**') && bPart.endsWith('**')) {
            const inner = bPart.slice(2, -2);
            // Highlight percentages and status keywords
            if (inner.includes('Safe') || inner.includes('safe')) {
              return (
                <span
                  key={j}
                  className="inline-flex items-center font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 rounded"
                >
                  {inner}
                </span>
              );
            }
            if (inner.includes('At Risk') || inner.includes('Defaulter') || inner.includes('Critical')) {
              return (
                <span
                  key={j}
                  className="inline-flex items-center font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1 rounded"
                >
                  {inner}
                </span>
              );
            }
            return (
              <strong key={j} className="font-bold text-slate-900 dark:text-slate-100">
                {inner}
              </strong>
            );
          }
          return bPart;
        })}
      </React.Fragment>
    );
  });
}

/**
 * Parse and render markdown tables
 */
function renderTable(tableLines, key) {
  if (tableLines.length < 2) return null;

  const headerLine = tableLines[0];
  const bodyLines = tableLines.slice(2); // Skip separator row line 1

  const parseRow = (line) =>
    line
      .split('|')
      .map((c) => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

  const headers = parseRow(headerLine);
  const rows = bodyLines.map((line) => parseRow(line)).filter((r) => r.length > 0);

  return (
    <div key={key} className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3.5 py-2.5 font-semibold uppercase tracking-wider text-[11px]">
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {rows.map((row, rIdx) => {
            const isAtRisk = row.some((cell) => cell.toLowerCase().includes('risk') || cell.toLowerCase().includes('defaulter'));
            return (
              <tr
                key={rIdx}
                className={`transition-colors ${
                  isAtRisk
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                {row.map((cell, cIdx) => {
                  const cellLower = cell.toLowerCase();
                  let badge = null;
                  if (cellLower === 'safe' || cellLower === 'eligible') {
                    badge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                        {cell}
                      </span>
                    );
                  } else if (cellLower === 'at risk' || cellLower.includes('risk')) {
                    badge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300">
                        {cell}
                      </span>
                    );
                  }

                  return (
                    <td key={cIdx} className="px-3.5 py-2 text-slate-700 dark:text-slate-300">
                      {badge || renderInline(cell)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * AgentMessageRenderer
 * Parses rich Markdown formatted responses from the Attendance Analysis Agent.
 */
export const AgentMessageRenderer = ({ content, onSelectPrompt }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let tableBuffer = [];
  let inTable = false;

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      elements.push(renderTable(tableBuffer, `table-${elements.length}`));
      tableBuffer = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check for markdown table line
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableBuffer.push(trimmed);
      continue;
    } else {
      flushTable();
    }

    if (!trimmed) {
      // Empty line spacer
      elements.push(<div key={`spacer-${i}`} className="h-1.5" />);
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-sm font-bold text-slate-900 dark:text-white mt-3 mb-1 flex items-center space-x-1.5"
        >
          <span>{renderInline(trimmed.slice(4))}</span>
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-base font-extrabold text-slate-900 dark:text-white mt-3 mb-1.5"
        >
          {renderInline(trimmed.slice(3))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-lg font-black text-slate-900 dark:text-white mt-4 mb-2"
        >
          {renderInline(trimmed.slice(2))}
        </h1>
      );
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div
          key={`bullet-${i}`}
          className="flex items-start space-x-2 text-xs text-slate-700 dark:text-slate-300 my-0.5 ml-1 leading-relaxed"
        >
          <span className="text-blue-500 font-bold mt-0.5">•</span>
          <span className="flex-1">{renderInline(trimmed.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Numbered lists
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div
          key={`num-${i}`}
          className="flex items-start space-x-2 text-xs text-slate-700 dark:text-slate-300 my-0.5 ml-1 leading-relaxed"
        >
          <span className="font-semibold text-blue-600 dark:text-blue-400 min-w-[1.2rem]">
            {numMatch[1]}.
          </span>
          <span className="flex-1">{renderInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Blockquote / Alerts
    if (trimmed.startsWith('> ')) {
      elements.push(
        <div
          key={`quote-${i}`}
          className="my-2 pl-3 py-1.5 border-l-3 border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 rounded-r-lg text-xs text-slate-700 dark:text-slate-300 italic"
        >
          {renderInline(trimmed.slice(2))}
        </div>
      );
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***') {
      elements.push(
        <hr
          key={`hr-${i}`}
          className="my-2.5 border-slate-200 dark:border-slate-800"
        />
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p
        key={`p-${i}`}
        className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed my-1"
      >
        {renderInline(trimmed)}
      </p>
    );
  }

  flushTable();

  return <div className="space-y-0.5">{elements}</div>;
};

export default AgentMessageRenderer;
