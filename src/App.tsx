import { Route, Routes } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Gallery } from './routes/Gallery'
import { DeckList } from './routes/DeckList'
import { DeckView } from './routes/DeckView'
import { DeckEdit } from './routes/DeckEdit'
import { PrintView } from './routes/PrintView'
import { Overview } from './routes/Overview'

export function App() {
  return (
    <Routes>
      {/* Print mode is fullscreen, no sidebar */}
      <Route path="/print/:name" element={<PrintView />} />
      {/* Deck viewer takes over the whole screen */}
      <Route path="/decks/:name" element={<DeckView />} />
      <Route path="/*" element={<Shell />} />
    </Routes>
  )
}

function Shell() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/slides/*" element={<Gallery />} />
          <Route path="/decks" element={<DeckList />} />
          <Route path="/decks/:name/edit" element={<DeckEdit />} />
        </Routes>
      </main>
    </div>
  )
}
