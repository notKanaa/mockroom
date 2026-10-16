/**
 * Reads the JSON object in an AI model's reply. Small local models wrap it in
 * text or a code fence, leave trailing commas, forget closing brackets, or use
 * single quotes: those are repaired when the reply isn't valid JSON as it is.
 * Undefined when no object can be read.
 */
export function readJsonObject(reply: string): Record<string, unknown> | undefined {
  const start = reply.indexOf("{");
  if (start === -1) return undefined;
  const end = reply.lastIndexOf("}");
  const whole = end > start ? reply.slice(start, end + 1) : undefined;
  const candidates = [
    whole,
    // The reply may stop before its last closing brackets: read on to its end (or its code fence's).
    repair(reply.slice(start).replace(/`{3}[\s\S]*$/, "")),
    whole === undefined ? undefined : repair(whole),
  ].filter((candidate) => candidate !== undefined);

  for (const candidate of candidates) {
    try {
      const data: unknown = JSON.parse(candidate);
      if (isRecord(data)) return data;
    } catch {
      // Try the next candidate.
    }
  }
  return undefined;
}

function repair(text: string): string {
  let repaired = text.replace(/[“”]/g, '"');
  // Only when there are no double quotes, so apostrophes inside proper strings are left alone.
  if (!repaired.includes('"')) {
    repaired = repaired.replace(/'([^'\n]*)'/g, '"$1"').replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":');
  }
  return closeBrackets(repaired.replace(/,\s*([}\]])/g, "$1"));
}

/** Closes the string and brackets left open at the end of the text. */
function closeBrackets(text: string): string {
  const open: string[] = [];
  let inString = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (char === "\\") index++;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === "{" || char === "[") {
      open.push(char === "{" ? "}" : "]");
    } else if ((char === "}" || char === "]") && open.at(-1) === char) {
      open.pop();
    }
  }
  let closed = inString ? `${text}"` : text;
  closed = closed.replace(/[\s,:]+$/, "");
  return closed + open.reverse().join("");
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
