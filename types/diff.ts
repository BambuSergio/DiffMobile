export interface DiffPart {
  type: 'equal' | 'added' | 'removed' | 'modified';
  value: string;
  originalIndex?: number;
  modifiedIndex?: number;
  charDiffs?: CharDiff[];
}

export interface CharDiff {
  value: string;
  isDifferent: boolean;
}

export interface DiffStats {
  added: number;
  removed: number;
  modified: number;
  total: number;
}

export interface DiffLine {
  left: DiffLineSide | null;
  right: DiffLineSide | null;
  type: 'equal' | 'added' | 'removed' | 'modified';
}

export interface DiffLineSide {
  text: string;
  lineNumber: number;
  charDiffs: CharDiff[];
}
