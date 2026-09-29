import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'

describe('web shell', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('qybeq.language.v1', 'en')
    localStorage.setItem('qybeq.analytics.v1', 'disabled')
  })

  it('shows the mobile main menu', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Qybeq' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /daily challenge/i })).toBeInTheDocument()
    for (const shortcut of ['How to Play', 'Customize', 'Settings']) {
      expect(screen.getByRole('button', { name: shortcut })).toBeInTheDocument()
    }
  })

  it('opens an empty board waiting for the dice', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(screen.getByText('Roll to set the puzzle')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Roll Dice' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Game menu' })).toBeInTheDocument()
  })

  it('opens the daily puzzle straight in play', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /daily challenge/i }))
    expect(screen.getByText('Daily Challenge')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Roll Dice' })).toBeDisabled()
    expect(screen.getAllByRole('img', { name: /^[A-F][1-6]$/ })).toHaveLength(6)
  })
})
