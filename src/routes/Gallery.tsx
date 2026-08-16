import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { sharedSlides } from '@/lib/slides'
import { buildTree, findFolder, type FolderNode } from '@/lib/tree'
import { SlideThumb } from '@/components/SlideThumb'
import type { SlideRecord } from '@/lib/types'

export function Gallery() {
  const { '*': splat = '' } = useParams()
  const folderPath = splat
  const tree = useMemo(() => buildTree(sharedSlides(), 'slides/'), [])
  const folder = useMemo(() => findFolder(tree, folderPath), [tree, folderPath])
  const [q, setQ] = useState('')

  if (!folder) {
    return (
      <>
        <Toolbar path={folderPath} />
        <div className="main-scroll">
          <div className="page">
            <div className="empty">
              <h3>Folder not found</h3>
              <p>
                No folder at <code>slides/{folderPath}</code>.
              </p>
              <Link className="btn ghost" to="/slides">
                ← all slides
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  const directSlides = folder.slidesHere
  const childFolders = folder.children

  const filtered = useMemo(() => {
    if (!q.trim()) return directSlides
    const needle = q.toLowerCase()
    return directSlides.filter((s) => s.name.toLowerCase().includes(needle))
  }, [directSlides, q])

  return (
    <>
      <Toolbar path={folderPath} />
      <div className="main-scroll">
        <div className="page">
          <div className="page-head">
            <h1>{folderPath ? prettyName(folder.name) : 'Slides'}</h1>
            <p className="lede">
              {folder.totalCount === 0
                ? 'Nothing here yet. Create a slide with the command in the empty state below.'
                : `${folder.totalCount} slide${folder.totalCount === 1 ? '' : 's'}${
                    childFolders.length ? ` across ${childFolders.length} folder${childFolders.length === 1 ? '' : 's'}` : ''
                  }.`}
            </p>
          </div>

          {childFolders.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div className="section-head">
                <h2>Folders</h2>
                <span className="right">
                  {childFolders.length} folder{childFolders.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid dense">
                {childFolders.map((c) => (
                  <FolderCard key={c.path} folder={c} />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="section-head">
              <h2>{childFolders.length > 0 ? 'Slides here' : 'Slides'}</h2>
              <div className="right" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {directSlides.length > 0 && (
                  <input
                    className="input"
                    placeholder="Filter by name…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    style={{ width: 220, height: 30 }}
                  />
                )}
                <span>
                  {filtered.length} / {directSlides.length}
                </span>
              </div>
            </div>

            {directSlides.length === 0 ? (
              <NoSlidesHere folderPath={folderPath} />
            ) : filtered.length === 0 ? (
              <p style={{ color: 'var(--text-3)' }}>No slides match “{q}”.</p>
            ) : (
              <div className="grid">
                {filtered.map((s) => (
                  <SlideCard key={s.path} slide={s} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

function Toolbar({ path }: { path: string }) {
  const parts = path.split('/').filter(Boolean)
  const crumbs: { label: string; to: string; leaf?: boolean }[] = [{ label: 'slides', to: '/slides' }]
  let acc = ''
  parts.forEach((p, i) => {
    acc = acc ? `${acc}/${p}` : p
    crumbs.push({ label: p, to: `/slides/${acc}`, leaf: i === parts.length - 1 })
  })
  return (
    <div className="toolbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <span key={c.to} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <span className="sep">/</span>}
            {c.leaf ? (
              <span className="leaf">{c.label}</span>
            ) : (
              <Link to={c.to}>{c.label}</Link>
            )}
          </span>
        ))}
      </div>
      <div className="spacer" />
    </div>
  )
}

function FolderCard({ folder }: { folder: FolderNode }) {
  return (
    <Link to={`/slides/${folder.path}`} style={{ display: 'block' }}>
      <div className="card">
        <div className="thumb" style={{ background: 'var(--bg-2)' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              color: 'var(--text-3)',
              letterSpacing: '-0.02em',
            }}
          >
            {folder.totalCount}
          </div>
        </div>
        <div className="meta">
          <div className="title">{prettyName(folder.name)}</div>
          <div className="sub">
            <span>{folder.totalCount} slide{folder.totalCount === 1 ? '' : 's'}</span>
            {folder.children.length > 0 && (
              <>
                <span className="dot">·</span>
                <span>
                  {folder.children.length} folder{folder.children.length === 1 ? '' : 's'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function SlideCard({ slide }: { slide: SlideRecord }) {
  return (
    <div className="card">
      <div className="thumb">
        <SlideThumb slide={slide} />
      </div>
      <div className="meta">
        <div className="title">{prettyName(slide.name.split('/').pop()!)}</div>
        <div className="path mono">{slide.path}</div>
      </div>
    </div>
  )
}

function NoSlidesHere({ folderPath }: { folderPath: string }) {
  const example = folderPath ? `${folderPath}/new-slide` : 'shared/intros/new-slide'
  return (
    <div className="empty">
      <h3>No slides in this folder.</h3>
      <p>Create one from the CLI:</p>
      <code>npm run new:slide -- {example}</code>
      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
        Or ask Claude: "create a slide at <code>slides/{example}.tsx</code>".
      </p>
    </div>
  )
}

function prettyName(s: string) {
  if (!s) return ''
  return s
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
