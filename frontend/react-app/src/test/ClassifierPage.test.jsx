/**
 * Test Suite: ClassifierPage Component
 *
 * Verifies rendering of the question input, classify button states,
 * random question loading, API call on form submission, and result display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ClassifierPage from '../pages/ClassifierPage'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'

function renderClassifierPage() {
    // Pre-seed localStorage so AuthProvider thinks user is logged in
    window.localStorage.setItem('user', JSON.stringify({ username: 'testuser', role: 'user' }))

    return render(
        <ThemeProvider>
            <MemoryRouter>
                <AuthProvider>
                    <ClassifierPage />
                </AuthProvider>
            </MemoryRouter>
        </ThemeProvider>
    )
}

describe('ClassifierPage', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        window.localStorage.clear()
    })

    it('renders the question textarea', () => {
        renderClassifierPage()
        const textarea = screen.getByPlaceholderText(/eigenvalues/i)
        expect(textarea).toBeInTheDocument()
        expect(textarea.tagName.toLowerCase()).toBe('textarea')
    })

    it('renders the Classify Question button', () => {
        renderClassifierPage()
        const btn = screen.getByText(/classify question/i)
        expect(btn).toBeInTheDocument()
    })

    it('classify button is disabled when textarea is empty', () => {
        renderClassifierPage()
        const btn = screen.getByText(/classify question/i).closest('button')
        expect(btn).toBeDisabled()
    })

    it('classify button is enabled when textarea has text', async () => {
        renderClassifierPage()
        const user = userEvent.setup()
        const textarea = screen.getByPlaceholderText(/eigenvalues/i)

        await user.type(textarea, 'Solve x + 1 = 2')

        const btn = screen.getByText(/classify question/i).closest('button')
        expect(btn).not.toBeDisabled()
    })

    it('renders the Random button', () => {
        renderClassifierPage()
        // The random button has text "Random" (hidden on mobile) or Shuffle icon
        const btn = screen.getByTitle(/load a random question/i)
        expect(btn).toBeInTheDocument()
    })

    it('clicking Random populates the textarea with a question', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({ question: 'What is 2+2?' }),
        })
        global.fetch = mockFetch

        renderClassifierPage()
        const user = userEvent.setup()

        await user.click(screen.getByTitle(/load a random question/i))

        await waitFor(() => {
            const textarea = screen.getByPlaceholderText(/eigenvalues/i)
            expect(textarea.value).toBe('What is 2+2?')
        })
    })

    it('sends POST /predict with the question on classify', async () => {
        const mockFetch = vi.fn().mockImplementation((url) => {
            if (url === '/predict') {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        success: true,
                        prediction: 'Algebra',
                        confidence: 85.5,
                        rationale: 'Test rationale',
                        matched_keywords: ['solve'],
                    }),
                })
            }
            return Promise.resolve({ json: () => Promise.resolve({}) })
        })
        global.fetch = mockFetch

        renderClassifierPage()
        const user = userEvent.setup()

        await user.type(screen.getByPlaceholderText(/eigenvalues/i), 'Solve x^2 = 4')
        await user.click(screen.getByText(/classify question/i).closest('button'))

        await waitFor(() => {
            const predictCalls = mockFetch.mock.calls.filter(([url]) => url === '/predict')
            expect(predictCalls.length).toBeGreaterThanOrEqual(1)
            const [, options] = predictCalls[0]
            expect(options.method).toBe('POST')
            expect(options.body).toBeInstanceOf(FormData)
        })
    })

    it('displays prediction result after successful classify', async () => {
        const mockFetch = vi.fn().mockImplementation((url) => {
            if (url === '/predict') {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        success: true,
                        prediction: 'Calculus and Analysis',
                        confidence: 91.2,
                        rationale: 'Detected derivative keyword',
                        matched_keywords: ['derivative'],
                    }),
                })
            }
            return Promise.resolve({ json: () => Promise.resolve({}) })
        })
        global.fetch = mockFetch

        renderClassifierPage()
        const user = userEvent.setup()

        await user.type(screen.getByPlaceholderText(/eigenvalues/i), 'Find the derivative of x^3')
        await user.click(screen.getByText(/classify question/i).closest('button'))

        await waitFor(() => {
            const matches = screen.getAllByText(/91\.2/)
            expect(matches.length).toBeGreaterThanOrEqual(1)
        })
    })

    it('renders the Upload Image (OCR) button', () => {
        renderClassifierPage()
        const ocrBtn = screen.getByText(/upload image/i)
        expect(ocrBtn).toBeInTheDocument()
    })

    it('renders example question buttons', () => {
        renderClassifierPage()
        const tryExample = screen.getByText(/try an example/i)
        expect(tryExample).toBeInTheDocument()
    })
})
