import React from 'react';

interface DiffChunk {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

export function diffWords(oldStr: string = '', newStr: string = ''): DiffChunk[] {
  const oldWords = oldStr.split(/(\s+)/);
  const newWords = newStr.split(/(\s+)/);

  const dp: number[][] = Array(oldWords.length + 1)
    .fill(0)
    .map(() => Array(newWords.length + 1).fill(0));

  for (let i = 1; i <= oldWords.length; i++) {
    for (let j = 1; j <= newWords.length; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const chunks: DiffChunk[] = [];
  let i = oldWords.length;
  let j = newWords.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      chunks.unshift({ type: 'unchanged', text: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      chunks.unshift({ type: 'added', text: newWords[j - 1] });
      j--;
    } else {
      chunks.unshift({ type: 'removed', text: oldWords[i - 1] });
      i--;
    }
  }

  const merged: DiffChunk[] = [];
  for (const chunk of chunks) {
    const last = merged[merged.length - 1];
    if (last && last.type === chunk.type) {
      last.text += chunk.text;
    } else {
      merged.push({ ...chunk });
    }
  }

  return merged;
}

interface DiffViewerProps {
  oldText?: string;
  newText?: string;
}

export default function DiffViewer({ oldText = '', newText = '' }: DiffViewerProps) {
  const chunks = diffWords(oldText, newText);

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl font-mono text-[11px] leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-wrap text-left">
      {chunks.map((chunk, idx) => {
        if (chunk.type === 'added') {
          return (
            <ins
              key={idx}
              className="bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 no-underline rounded px-0.5"
            >
              {chunk.text}
            </ins>
          );
        }
        if (chunk.type === 'removed') {
          return (
            <del
              key={idx}
              className="bg-rose-100 dark:bg-rose-950/30 text-rose-800 dark:text-rose-400 line-through rounded px-0.5"
            >
              {chunk.text}
            </del>
          );
        }
        return <span key={idx}>{chunk.text}</span>;
      })}
    </div>
  );
}
