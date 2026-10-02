import { readFile, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

// ---------------------------------------------------------------------------
// Local asset loading. Everything the PDF needs (fonts, logos) is inlined as a
// data URI, so the renderer can block every network and file request and the
// intermediate HTML is a single self-contained file.
// ---------------------------------------------------------------------------

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

const IMAGE_TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}

/**
 * Read an image referenced from a JSON file. The path must stay inside the
 * directory of the file that referenced it, so a document cannot pull in
 * arbitrary files from the machine (e.g. "../../.ssh/id_rsa").
 */
export async function loadImage(reference: string, baseDir: string): Promise<string> {
  const root = path.resolve(baseDir)
  const target = path.resolve(root, reference)
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error(`Image "${reference}" must be inside ${root}`)
  }
  const type = IMAGE_TYPES[path.extname(target).toLowerCase()]
  if (!type) throw new Error(`Image "${reference}" must be .svg, .png, .jpg or .jpeg`)
  const info = await stat(target).catch(() => null)
  if (!info?.isFile()) throw new Error(`Image "${reference}" not found at ${target}`)
  if (info.size > MAX_IMAGE_BYTES) throw new Error(`Image "${reference}" is larger than 2 MB`)
  const bytes = await readFile(target)
  checkMagic(bytes, type, reference)
  return `data:${type};base64,${bytes.toString('base64')}`
}

function checkMagic(bytes: Buffer, type: string, reference: string): void {
  const ok =
    type === 'image/png'
      ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      : type === 'image/jpeg'
        ? bytes[0] === 0xff && bytes[1] === 0xd8
        : /<svg[\s>]/i.test(bytes.subarray(0, 4096).toString('utf8'))
  if (!ok) throw new Error(`Image "${reference}" content does not match its extension`)
}

const require = createRequire(import.meta.url)

interface FontFace {
  family: string
  pkg: string
  file: string
  weight: number
}

const FONTS: FontFace[] = [
  { family: 'Outfit', pkg: '@fontsource/outfit', file: 'outfit-latin-300-normal.woff2', weight: 300 },
  { family: 'Outfit', pkg: '@fontsource/outfit', file: 'outfit-latin-400-normal.woff2', weight: 400 },
  { family: 'Outfit', pkg: '@fontsource/outfit', file: 'outfit-latin-500-normal.woff2', weight: 500 },
  { family: 'Outfit', pkg: '@fontsource/outfit', file: 'outfit-latin-600-normal.woff2', weight: 600 },
  { family: 'IBM Plex Mono', pkg: '@fontsource/ibm-plex-mono', file: 'ibm-plex-mono-latin-400-normal.woff2', weight: 400 },
  { family: 'IBM Plex Mono', pkg: '@fontsource/ibm-plex-mono', file: 'ibm-plex-mono-latin-500-normal.woff2', weight: 500 },
  { family: 'Bebas Neue', pkg: '@fontsource/bebas-neue', file: 'bebas-neue-latin-400-normal.woff2', weight: 400 },
]

let fontCss: Promise<string> | undefined

/** @font-face rules with the font files embedded. Cached per process. */
export function embeddedFontCss(): Promise<string> {
  fontCss ??= Promise.all(
    FONTS.map(async (f) => {
      const pkgDir = path.dirname(require.resolve(`${f.pkg}/package.json`))
      const data = await readFile(path.join(pkgDir, 'files', f.file))
      return `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};font-display:block;src:url(data:font/woff2;base64,${data.toString('base64')}) format('woff2');}`
    }),
  ).then((rules) => rules.join('\n'))
  return fontCss
}
