export type ScriptureSelection = {
  verseStart: number;
  verseEnd: number;
  charStart: number;
  charEnd: number;
  quote: string;
};

export type SelectionAnchorRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
};

export function snapshotSelectionRect(rect: DOMRect): SelectionAnchorRect {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom,
    right: rect.right,
  };
}

function scriptureElement(node: Node | null): HTMLElement | null {
  if (!node) return null;
  if (node instanceof HTMLElement) {
    return node.closest("[data-scripture]");
  }
  return node.parentElement?.closest("[data-scripture]") ?? null;
}

function verseNumber(el: HTMLElement | null): number | null {
  if (!el || el.dataset.verse === undefined) return null;
  const value = Number(el.dataset.verse);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function textOffsetInElement(container: HTMLElement, target: Node, offset: number): number {
  if (target === container) {
    return Math.min(offset, container.textContent?.length ?? 0);
  }
  const range = document.createRange();
  range.selectNodeContents(container);
  range.setEnd(target, offset);
  return range.toString().length;
}

function verseTextAt(
  root: HTMLElement,
  verse: number,
): { el: HTMLElement; text: string } | null {
  const el = root.querySelector<HTMLElement>(`[data-scripture][data-verse="${verse}"]`);
  if (!el) return null;
  return { el, text: el.textContent ?? "" };
}

function quoteFromVerses(
  root: HTMLElement,
  verseStart: number,
  verseEnd: number,
  charStart: number,
  charEnd: number,
): string {
  if (verseStart === verseEnd) {
    const row = verseTextAt(root, verseStart);
    if (!row) return "";
    return row.text.slice(charStart, charEnd);
  }

  const parts: string[] = [];
  for (let v = verseStart; v <= verseEnd; v++) {
    const row = verseTextAt(root, v);
    if (!row) continue;
    if (v === verseStart) {
      parts.push(row.text.slice(charStart));
    } else if (v === verseEnd) {
      parts.push(row.text.slice(0, charEnd));
    } else {
      parts.push(row.text);
    }
  }
  return parts.join(" ");
}

export function resolveScriptureSelection(
  root: HTMLElement,
): { selection: ScriptureSelection; rect: SelectionAnchorRect } | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

  const startEl = scriptureElement(range.startContainer);
  const endEl = scriptureElement(range.endContainer);
  if (!startEl || !endEl) return null;

  const verseStart = verseNumber(startEl);
  const verseEnd = verseNumber(endEl);
  if (verseStart === null || verseEnd === null) return null;

  const charStart = textOffsetInElement(startEl, range.startContainer, range.startOffset);
  const charEnd = textOffsetInElement(endEl, range.endContainer, range.endOffset);

  let normalizedStart = verseStart;
  let normalizedEnd = verseEnd;
  let normalizedCharStart = charStart;
  let normalizedCharEnd = charEnd;

  if (verseStart > verseEnd || (verseStart === verseEnd && charStart > charEnd)) {
    normalizedStart = verseEnd;
    normalizedEnd = verseStart;
    normalizedCharStart = charEnd;
    normalizedCharEnd = charStart;
  }

  const quote = quoteFromVerses(
    root,
    normalizedStart,
    normalizedEnd,
    normalizedCharStart,
    normalizedCharEnd,
  ).trim();
  if (!quote) return null;

  let rangeRect = range.getBoundingClientRect();
  if (rangeRect.width === 0 && rangeRect.height === 0) {
    rangeRect = startEl.getBoundingClientRect();
  }

  return {
    selection: {
      verseStart: normalizedStart,
      verseEnd: normalizedEnd,
      charStart: normalizedCharStart,
      charEnd: normalizedCharEnd,
      quote,
    },
    rect: snapshotSelectionRect(rangeRect),
  };
}

export function anchorForRect(rect: SelectionAnchorRect, barHeight = 44, gap = 8): { top: number; left: number } {
  const margin = 8;
  const barWidth = 280;
  let top = rect.top - barHeight - gap;
  if (top < margin) {
    top = rect.bottom + gap;
  }
  let left = rect.left + rect.width / 2 - barWidth / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - barWidth - margin));
  top = Math.max(margin, Math.min(top, window.innerHeight - barHeight - margin));
  return { top, left };
}
