// ---------------------------------------------------------------------------
// Minimal safe HTML building. Every interpolated value is escaped unless it is
// already a SafeHtml produced by this module, so client names, line item text
// and terms can never inject markup into the rendered document.
// ---------------------------------------------------------------------------

export class SafeHtml {
  constructor(readonly value: string) {}
  toString(): string {
    return this.value
  }
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c)
}

type Interpolation = SafeHtml | string | number | null | undefined | false | ReadonlyArray<Interpolation>

function render(value: Interpolation): string {
  if (value === null || value === undefined || value === false) return ''
  if (value instanceof SafeHtml) return value.value
  if (Array.isArray(value)) return value.map(render).join('')
  return escapeHtml(String(value))
}

/** Tagged template: `html\`<p>${userText}</p>\`` escapes userText. */
export function html(strings: TemplateStringsArray, ...values: Interpolation[]): SafeHtml {
  let out = strings[0] ?? ''
  for (let i = 0; i < values.length; i++) out += render(values[i]) + (strings[i + 1] ?? '')
  return new SafeHtml(out)
}

/** Trusted, already-built markup (internal CSS, data URIs we created). */
export function raw(value: string): SafeHtml {
  return new SafeHtml(value)
}

/**
 * Escape, then allow exactly one inline style: **bold**. Nothing else in user
 * prose is interpreted, which keeps the input format obvious and safe.
 */
export function inline(text: string): SafeHtml {
  const escaped = escapeHtml(text)
  return new SafeHtml(escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'))
}
