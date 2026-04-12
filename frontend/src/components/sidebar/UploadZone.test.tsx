import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UploadZone } from './UploadZone'

describe('UploadZone', () => {
  it('calls onClassify with a valid .txt file', async () => {
    const onClassify = vi.fn().mockResolvedValue(undefined)
    render(<UploadZone onClassify={onClassify} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.accept).toBe('.txt')
    const file = new File(['content'], 'book.txt', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onClassify).toHaveBeenCalledWith(file)
  })

  it('shows error message for non-txt files', async () => {
    const onClassify = vi.fn().mockRejectedValue(
      new Error('Only .txt files are accepted. Convert other formats using the provided script.'),
    )
    render(<UploadZone onClassify={onClassify} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const badFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [badFile] } })
    // Wait for error to appear
    await screen.findByText(/Only \.txt files are accepted/)
  })

  it('applies drag-over styling on dragover', () => {
    const onClassify = vi.fn()
    const { container } = render(<UploadZone onClassify={onClassify} />)
    const dropZone = container.firstChild as HTMLElement
    // Find the interactive div (role="button")
    const btn = dropZone.querySelector('[role="button"]') as HTMLElement
    fireEvent.dragOver(btn)
    expect(btn.style.borderColor).toBe('rgb(99, 102, 241)')
  })

  it('restores border on drag leave', () => {
    const onClassify = vi.fn()
    const { container } = render(<UploadZone onClassify={onClassify} />)
    const btn = (container.firstChild as HTMLElement).querySelector('[role="button"]') as HTMLElement
    fireEvent.dragOver(btn)
    fireEvent.dragLeave(btn)
    expect(btn.style.borderColor).toBe('rgb(42, 42, 58)') // #2A2A3A
  })

  it('has accept=".txt" on file input', () => {
    const onClassify = vi.fn()
    render(<UploadZone onClassify={onClassify} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.accept).toBe('.txt')
  })
})
