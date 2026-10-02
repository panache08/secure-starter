import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadImage } from './assets.js'
import { documentSchema, formatIssues, themeSchema, type Doc, type Theme } from './schema.js'

export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const THEMES_DIR = path.join(PACKAGE_ROOT, 'themes')

export class InputError extends Error {
  override name = 'InputError'
}

/** A validated document plus everything resolved from disk to render it. */
export interface Loaded {
  doc: Doc
  theme: Theme
  sourcePath: string
  locale: string
  themeLogo?: string
  clientLogo?: string
}

async function readJson(file: string): Promise<unknown> {
  const text = await readFile(file, 'utf8').catch((err: NodeJS.ErrnoException) => {
    throw new InputError(`Cannot read ${file}: ${err.code ?? err.message}`)
  })
  try {
    return JSON.parse(text)
  } catch (err) {
    throw new InputError(`${file} is not valid JSON: ${(err as Error).message}`)
  }
}

export async function loadTheme(reference: string, relativeTo: string): Promise<{ theme: Theme; dir: string }> {
  // "vanorika" -> themes/vanorika.json; "./brands/acme.json" -> relative to the document.
  const isPath = reference.endsWith('.json')
  if (!isPath && !/^[a-z0-9-]+$/.test(reference)) {
    throw new InputError(`Theme "${reference}" must be a bundled theme name (a-z, 0-9, -) or a path to a .json file`)
  }
  const file = isPath ? path.resolve(relativeTo, reference) : path.join(THEMES_DIR, `${reference}.json`)
  const parsed = themeSchema.safeParse(await readJson(file))
  if (!parsed.success) throw new InputError(`Theme ${file} is invalid:\n${formatIssues(parsed.error)}`)
  return { theme: parsed.data, dir: path.dirname(file) }
}

export async function loadDocument(file: string): Promise<Loaded> {
  const sourcePath = path.resolve(file)
  const dir = path.dirname(sourcePath)
  const parsed = documentSchema.safeParse(await readJson(sourcePath))
  if (!parsed.success) throw new InputError(`${file} is invalid:\n${formatIssues(parsed.error)}`)
  const doc = parsed.data
  const { theme, dir: themeDir } = await loadTheme(doc.theme, dir)

  const wrap = (p: Promise<string>) => p.catch((err: Error) => Promise.reject(new InputError(err.message)))
  const [themeLogo, clientLogo] = await Promise.all([
    theme.logo ? wrap(loadImage(theme.logo, themeDir)) : undefined,
    doc.client?.logo ? wrap(loadImage(doc.client.logo, dir)) : undefined,
  ])

  const locale = doc.locale ?? theme.locale
  try {
    new Intl.NumberFormat(locale)
  } catch {
    throw new InputError(`Locale "${locale}" is not supported`)
  }
  if (doc.currency) {
    try {
      new Intl.NumberFormat(locale, { style: 'currency', currency: doc.currency })
    } catch {
      throw new InputError(`Currency "${doc.currency}" is not supported`)
    }
  }
  return { doc, theme, sourcePath, locale, themeLogo, clientLogo }
}
