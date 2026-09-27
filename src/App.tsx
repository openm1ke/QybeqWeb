import { useState } from 'react'
import { GameScreen } from './screens/GameScreen'
import './App.css'

type Screen = 'menu' | 'game'

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  if (screen === 'game') return <GameScreen onBack={() => setScreen('menu')} />

  return (
    <main className="menu-screen">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="menu-topbar">
        <div className="stat"><b>0</b><span>Solved</span></div>
        <div className="stat"><b>0 ★</b><span>Stars</span></div>
        <button className="icon-button" type="button" aria-label="Settings">⚙</button>
      </header>
      <section className="hero-card">
        <span className="eyebrow">A DAILY LOGIC RITUAL</span>
        <div className="brand-lockup"><img src="./qybeq-icon.png" alt="" /><h1>QYBEQ</h1></div>
        <p>Six dice. Eight pieces. One perfect square.</p>
        <button className="primary-button" type="button" onClick={() => setScreen('game')}>New puzzle <span>→</span></button>
      </section>
      <section className="daily-card">
        <div><span className="eyebrow">DAILY CHALLENGE</span><h2>Today’s board is ready</h2><p>Build your streak and earn up to three stars.</p></div>
        <button type="button" onClick={() => setScreen('game')}>Play daily</button>
      </section>
      <footer className="menu-footer"><a href="./how-to-play.html">How to play</a><a href="./privacy.html">Privacy</a><span>Web preview 0.1</span></footer>
    </main>
  )
}
