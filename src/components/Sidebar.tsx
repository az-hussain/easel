import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { allDecks } from '@/lib/decks'
import { sharedSlides } from '@/lib/slides'
import { buildTree, type FolderNode } from '@/lib/tree'

export function Sidebar() {
  const tree = useMemo(() => buildTree(sharedSlides(), 'slides/'), [])
  return (
    <aside className="sidebar">
      <div className="workspace">
        <div className="mark">E</div>
        <div>
          <div className="title">Easel</div>
          <div className="subtitle">slide library</div>
        </div>
      </div>

      <div className="sidebar-scroll">
        <DecksSection />
        <SlidesSection root={tree} />
      </div>
    </aside>
  )
}

function DecksSection() {
  return (
    <div className="side-section">
      <div className="side-section-header">
        <h3>Decks</h3>
        <span
          className="add"
          title="npm run new:deck -- <name>"
        >
          +
        </span>
      </div>
      {allDecks.length === 0 ? (
        <div className="side-empty">No decks yet</div>
      ) : (
        allDecks.map((d) => (
          <NavLink
            key={d.name}
            to={`/decks/${d.name}`}
            className={({ isActive }) => 'side-row ' + (isActive ? 'active' : '')}
          >
            <span className="row-icon">
              <IconDeck />
            </span>
            <span className="row-label">{d.title}</span>
            <span className="row-meta">{d.slides.length}</span>
          </NavLink>
        ))
      )}
    </div>
  )
}

function SlidesSection({ root }: { root: FolderNode }) {
  return (
    <div className="side-section">
      <div className="side-section-header">
        <h3>Slides</h3>
        <span
          className="add"
          title="npm run new:slide -- <path>"
        >
          +
        </span>
      </div>
      <NavLink
        to="/slides"
        end
        className={({ isActive }) => 'side-row ' + (isActive ? 'active' : '')}
      >
        <span className="row-icon">
          <IconLibrary />
        </span>
        <span className="row-label">All slides</span>
        <span className="row-meta">{root.totalCount}</span>
      </NavLink>
      {root.children.length === 0 ? (
        <div className="side-empty">No shared slides yet</div>
      ) : (
        <ul className="tree-node" style={{ marginTop: 4 }}>
          {root.children.map((node) => (
            <TreeNode key={node.path} node={node} depth={0} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TreeNode({ node, depth }: { node: FolderNode; depth: number }) {
  const loc = useLocation()
  const myUrl = `/slides/${node.path}`
  const onMe = loc.pathname === myUrl
  const onDescendant = loc.pathname.startsWith(myUrl + '/')
  const [open, setOpen] = useState(onMe || onDescendant || depth === 0)
  const hasChildren = node.children.length > 0

  return (
    <li>
      <NavLink
        to={myUrl}
        className={({ isActive }) => 'side-row ' + (isActive ? 'active' : '')}
        style={{ marginLeft: depth === 0 ? undefined : 0 }}
      >
        <span
          className="row-icon"
          onClick={(e) => {
            if (!hasChildren) return
            e.preventDefault()
            e.stopPropagation()
            setOpen((v) => !v)
          }}
          style={{ cursor: hasChildren ? 'pointer' : 'default' }}
        >
          {hasChildren ? (
            <Chevron open={open} />
          ) : (
            <IconFolder />
          )}
        </span>
        <span className="row-label">{node.name}</span>
        <span className="row-meta">{node.totalCount}</span>
      </NavLink>
      {hasChildren && open && (
        <ul className="tree-children">
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span className={'tree-chevron ' + (open ? 'open' : '')}>
      <svg width="9" height="9" viewBox="0 0 8 8" fill="currentColor">
        <path d="M2 1 L6 4 L2 7 Z" />
      </svg>
    </span>
  )
}

function IconDeck() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="9" rx="1" />
      <rect x="4" y="1.5" width="10" height="9" rx="1" opacity="0.55" />
    </svg>
  )
}
function IconFolder() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1.5 4.5h5l1.5 1.5h6.5v7.5h-13z" />
    </svg>
  )
}
function IconLibrary() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="4" height="10" rx="0.5" />
      <rect x="7" y="3" width="3" height="10" rx="0.5" />
      <path d="M11.5 4.5 L13.5 13 L13 13.5 L11 13" />
    </svg>
  )
}
