import type { SlideRecord } from './types'

export interface FolderNode {
  /** Last segment, e.g. "examples" */
  name: string
  /** Full path *relative to the slides root*, e.g. "shared/examples". Empty string at root. */
  path: string
  /** Slides directly in this folder (not recursive) */
  slidesHere: SlideRecord[]
  /** Total slides at or below this folder */
  totalCount: number
  children: FolderNode[]
}

/**
 * Build a folder tree from a flat list of slide records.
 * Records are expected to all live under a common prefix (e.g. "slides/").
 * The returned root has no name; iterate its `children`.
 */
export function buildTree(slides: SlideRecord[], stripPrefix: string): FolderNode {
  const root: FolderNode = { name: '', path: '', slidesHere: [], totalCount: 0, children: [] }

  for (const slide of slides) {
    let relative = slide.path
    if (relative.startsWith(stripPrefix)) relative = relative.slice(stripPrefix.length)
    relative = relative.replace(/\.tsx$/, '')
    const parts = relative.split('/')
    const fileName = parts.pop()!

    let cur = root
    let acc = ''
    for (const seg of parts) {
      acc = acc ? `${acc}/${seg}` : seg
      let child = cur.children.find((c) => c.name === seg)
      if (!child) {
        child = { name: seg, path: acc, slidesHere: [], totalCount: 0, children: [] }
        cur.children.push(child)
      }
      cur = child
    }
    // Push the slide into its immediate parent folder
    cur.slidesHere.push(slide)
    // Track for the file name (unused for now but kept for future)
    void fileName
  }

  // Sort folders alphabetically, slides by name
  const visit = (n: FolderNode) => {
    n.children.sort((a, b) => a.name.localeCompare(b.name))
    n.slidesHere.sort((a, b) => a.name.localeCompare(b.name))
    n.totalCount = n.slidesHere.length
    for (const c of n.children) {
      visit(c)
      n.totalCount += c.totalCount
    }
  }
  visit(root)

  return root
}

/** Walk the tree to a folder by path. Returns null if not found. */
export function findFolder(root: FolderNode, path: string): FolderNode | null {
  if (!path) return root
  const parts = path.split('/').filter(Boolean)
  let cur: FolderNode | null = root
  for (const p of parts) {
    cur = cur.children.find((c) => c.name === p) ?? null
    if (!cur) return null
  }
  return cur
}

/** Get every slide at or below a folder. */
export function slidesUnder(folder: FolderNode): SlideRecord[] {
  const out: SlideRecord[] = [...folder.slidesHere]
  for (const c of folder.children) out.push(...slidesUnder(c))
  return out
}
