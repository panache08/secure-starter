// ---------------------------------------------------------------------------
// Pagination. Pure and synchronous so it can be unit tested without a browser.
//
// Each unit has two measured heights: `own` (its border box) and `advance`
// (distance to the next unit's top, i.e. own + the gap after it). A unit fits
// when used + own <= capacity; placing it consumes `advance`. Units marked
// keepWithNext form a chain that moves to the next page as one piece.
// ---------------------------------------------------------------------------

export interface MeasuredUnit {
  own: number
  advance: number
  keepWithNext: boolean
  breakBefore: boolean
  /** Height of the header row to repeat if this unit starts a page mid-table; 0 if none. */
  continuationHead: number
  /** Table header units are never repeated for themselves. */
  isHead: boolean
}

export interface Capacities {
  first: number
  rest: number
}

export class PaginationError extends Error {
  override name = 'PaginationError'
}

/** Small tolerance for sub-pixel rounding between measurement and print. */
const EPSILON = 0.5

export function paginate(units: MeasuredUnit[], capacity: Capacities): number[][] {
  const pages: number[][] = [[]]
  let used = 0
  const cap = () => (pages.length === 1 ? capacity.first : capacity.rest)

  const newPage = () => {
    pages.push([])
    used = 0
  }

  // Height a run of units needs when it starts at the current position.
  const runHeight = (from: number, to: number, startsPage: boolean) => {
    let h = startsPage ? (units[from]!.isHead ? 0 : units[from]!.continuationHead) : 0
    for (let i = from; i < to; i++) h += units[i]!.advance
    return h - units[to - 1]!.advance + units[to - 1]!.own
  }

  let i = 0
  while (i < units.length) {
    // The chain: this unit plus every following unit it must stay with.
    let end = i + 1
    while (end < units.length && units[end - 1]!.keepWithNext && !units[end]!.breakBefore) end++

    if (units[i]!.breakBefore && pages[pages.length - 1]!.length > 0) newPage()

    const pageEmpty = pages[pages.length - 1]!.length === 0
    const need = runHeight(i, end, pageEmpty)

    if (used + need <= cap() + EPSILON) {
      placeRun(i, end, pageEmpty)
      i = end
      continue
    }
    if (!pageEmpty) {
      newPage()
      continue
    }
    // Chain is taller than an empty page: place what fits, unit by unit.
    const single = runHeight(i, i + 1, true)
    if (single > cap() + EPSILON) {
      throw new PaginationError(
        `Unit ${i} is ${Math.round(single)}px tall but a page only holds ${Math.round(cap())}px. Split it into smaller pieces.`,
      )
    }
    placeRun(i, i + 1, true)
    i += 1
  }
  return pages.filter((p) => p.length > 0)

  function placeRun(from: number, to: number, startsPage: boolean) {
    if (startsPage && !units[from]!.isHead) used += units[from]!.continuationHead
    for (let k = from; k < to; k++) {
      pages[pages.length - 1]!.push(k)
      used += units[k]!.advance
    }
  }
}
