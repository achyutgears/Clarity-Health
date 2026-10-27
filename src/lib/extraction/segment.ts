/**
 * Sentence segmentation that preserves exact character offsets into the source.
 */
import type { Sentence, SourceSpan } from "./types";

/**
 * Split `source` into sentences. Each sentence's `text` is exactly
 * `source.slice(span.start, span.end)` — no trimming of the stored span.
 *
 * Boundaries:
 * - `.` `!` `?` followed by whitespace or end of string
 * - one or more newlines when they separate non-empty content
 *
 * Leading/trailing whitespace inside a span is kept so offsets stay faithful;
 * empty or whitespace-only segments are dropped.
 */
export function segmentSentences(source: string): Sentence[] {
  if (!source) return [];

  const ranges = findSentenceRanges(source);
  const sentences: Sentence[] = [];

  for (const span of ranges) {
    const text = source.slice(span.start, span.end);
    if (!text.trim()) continue;
    const index = sentences.length + 1;
    sentences.push({
      id: `s${index}`,
      index,
      text,
      span,
    });
  }

  return sentences;
}

function findSentenceRanges(source: string): SourceSpan[] {
  const ranges: SourceSpan[] = [];
  let cursor = 0;
  const n = source.length;

  while (cursor < n) {
    // Skip whitespace between sentences (not part of either span).
    while (cursor < n && isWs(source.charAt(cursor))) cursor += 1;
    if (cursor >= n) break;

    const start = cursor;
    let end = start;

    while (end < n) {
      const ch = source.charAt(end);

      if (ch === "." || ch === "!" || ch === "?") {
        // Consume repeated terminal punctuation: "Really?!"
        let term = end + 1;
        while (term < n) {
          const t = source.charAt(term);
          if (t === "." || t === "!" || t === "?") term += 1;
          else break;
        }
        // Boundary if followed by whitespace, newline, or EOS.
        if (term >= n || isWs(source.charAt(term))) {
          end = term;
          break;
        }
        end = term;
        continue;
      }

      // Blank line (or any newline run) ends a sentence when content follows
      // after the newlines, or at EOS.
      if (ch === "\n" || ch === "\r") {
        let nl = end;
        while (nl < n && (source.charAt(nl) === "\n" || source.charAt(nl) === "\r")) nl += 1;
        // End sentence before the newlines; remaining text starts next.
        if (nl > end) {
          break;
        }
      }

      end += 1;
    }

    if (end > start) {
      ranges.push({ start, end });
    }
    cursor = end;
  }

  return ranges;
}

function isWs(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === "\f";
}
