import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DeckView } from '../routes/DeckView'
import { getDeck } from '../lib/decks'
import '../styles.css'

const deckName = import.meta.env.VITE_PUBLISH_DECK as string

function PublishRoot() {
  useEffect(() => {
    const d = getDeck(deckName)
    if (d) document.title = d.title
  }, [])

  return (
    <MemoryRouter
      initialEntries={[`/decks/${deckName}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/decks/:name" element={<DeckView />} />
      </Routes>
    </MemoryRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PublishRoot />
  </StrictMode>,
)
