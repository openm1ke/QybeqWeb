import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('web shell', () => {
  it('opens the playable board from the main menu', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /new puzzle/i }))
    expect(screen.getByRole('heading', { name: /fill every free cell/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Puzzle')).toBeInTheDocument()
  })
})
