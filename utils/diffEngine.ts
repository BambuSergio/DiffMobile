import { diffArrays, diffWords } from 'diff';
import { DiffLine, CharDiff, DiffStats } from '../types/diff';

interface WordChange {
  value: string;
  added?: boolean;
  removed?: boolean;
}

interface ArrayChange<T> {
  count: number;
  value: T[];
  added?: boolean;
  removed?: boolean;
}

export interface DiffOptions {
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
  ignoreEmptyLines?: boolean;
}

function preprocessLines(text: string, options: DiffOptions): string[] {
  let lines = text.split('\n');
  // Remove trailing empty line from final newline
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  if (options.ignoreWhitespace) {
    lines = lines.map(l => l.trim());
  }
  if (options.ignoreCase) {
    lines = lines.map(l => l.toLowerCase());
  }
  return lines;
}

export function computeDiff(
  original: string,
  modified: string,
  options: DiffOptions = {}
): { lines: DiffLine[]; stats: DiffStats } {
  const origLines = preprocessLines(original, options);
  const modLines = preprocessLines(modified, options);

  const lineChanges = diffArrays(origLines, modLines) as ArrayChange<string>[];

  const lines: DiffLine[] = [];
  let stats: DiffStats = { added: 0, removed: 0, modified: 0, total: 0 };

  let leftLineNum = 0;
  let rightLineNum = 0;

  for (let i = 0; i < lineChanges.length; i++) {
    const change = lineChanges[i];
    const isAdded = change.added === true;
    const isRemoved = change.removed === true;
    const changeLines = change.value;

    if (options.ignoreEmptyLines && !isAdded && !isRemoved) {
      const filtered = changeLines.filter((l: string) => l.trim() !== '');
      if (filtered.length === 0) continue;
    }

    if (!isAdded && !isRemoved) {
      // Equal lines
      for (const line of changeLines) {
        leftLineNum++;
        rightLineNum++;
        lines.push({
          left: { text: line, lineNumber: leftLineNum, charDiffs: [{ value: line, isDifferent: false }] },
          right: { text: line, lineNumber: rightLineNum, charDiffs: [{ value: line, isDifferent: false }] },
          type: 'equal',
        });
        stats.total++;
      }
    } else if (isRemoved) {
      // Check if next chunk is added with same count (true modification)
      const nextChange = lineChanges[i + 1];
      const isModification = nextChange?.added === true && change.count === nextChange.count;

      if (isModification) {
        const nextLines = nextChange.value as string[];
        for (let j = 0; j < change.count; j++) {
          const leftText = changeLines[j] ?? '';
          const rightText = nextLines[j] ?? '';

          leftLineNum++;
          rightLineNum++;

          const wordChanges = diffWords(leftText, rightText) as WordChange[];
          const leftCharDiffs: CharDiff[] = [];
          const rightCharDiffs: CharDiff[] = [];

          for (const wc of wordChanges) {
            if (wc.added) {
              rightCharDiffs.push({ value: wc.value, isDifferent: true });
            } else if (wc.removed) {
              leftCharDiffs.push({ value: wc.value, isDifferent: true });
            } else {
              leftCharDiffs.push({ value: wc.value, isDifferent: false });
              rightCharDiffs.push({ value: wc.value, isDifferent: false });
            }
          }

          lines.push({
            left: { text: leftText, lineNumber: leftLineNum, charDiffs: leftCharDiffs },
            right: { text: rightText, lineNumber: rightLineNum, charDiffs: rightCharDiffs },
            type: 'modified',
          });
          stats.modified++;
          stats.total++;
        }
        i++; // skip the added chunk
      } else {
        // Pure removal
        for (const line of changeLines) {
          leftLineNum++;
          lines.push({
            left: { text: line, lineNumber: leftLineNum, charDiffs: [{ value: line, isDifferent: true }] },
            right: null,
            type: 'removed',
          });
          stats.removed++;
          stats.total++;
        }
      }
    } else if (isAdded) {
      // Pure addition
      for (const line of changeLines) {
        rightLineNum++;
        lines.push({
          left: null,
          right: { text: line, lineNumber: rightLineNum, charDiffs: [{ value: line, isDifferent: true }] },
          type: 'added',
        });
        stats.added++;
        stats.total++;
      }
    }
  }

  return { lines, stats };
}

export function applyChangesToOriginal(lines: DiffLine[], direction: 'left-to-right' | 'right-to-left'): string {
  const result: string[] = [];

  for (const line of lines) {
    if (direction === 'left-to-right') {
      if (line.right) {
        result.push(line.right.text);
      }
    } else {
      if (line.left) {
        result.push(line.left.text);
      }
    }
  }

  return result.join('\n');
}

export function exportUnifiedDiff(original: string, modified: string, originalName = 'original', modifiedName = 'modified'): string {
  const origLines = original.split('\\n');
  const modLines = modified.split('\\n');
  if (origLines[origLines.length - 1] === '') origLines.pop();
  if (modLines[modLines.length - 1] === '') modLines.pop();

  const changes = diffArrays(origLines, modLines) as ArrayChange<string>[];
  let result = `--- ${originalName}\\n+++ ${modifiedName}\\n`;

  for (const change of changes) {
    const changeLines = change.value;

    for (const line of changeLines) {
      if (change.added) {
        result += `+${line}\\n`;
      } else if (change.removed) {
        result += `-${line}\\n`;
      } else {
        result += ` ${line}\\n`;
      }
    }
  }

  return result;
}

export function exportPlainText(lines: DiffLine[], direction: 'left-to-right' | 'right-to-left'): string {
  return applyChangesToOriginal(lines, direction);
}
