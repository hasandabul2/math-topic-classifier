/**
 * Test Suite: LoginPage Component
 *
 * Verifies rendering of form elements, form submission triggering the
 * correct API call, error display, and Google OAuth link.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'

// Helper: render with all required providers
function renderLoginPage() {
    return render(
        <ThemeProvider>
            <MemoryRouter initialEntries={['/login']}>
                <AuthProvider>
                    <LoginPage />
                </AuthProvider>
            </MemoryRouter>
        </ThemeProvider>
    )
}

describe('LoginPage', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        window.localStorage.clear()
    })

    it('renders username input field', () => {
        renderLoginPage()
        const input = screen.getByPlaceholderText(/enter your username/i)
        expect(input).toBeInTheDocument()
        expect(input).toHaveAttribute('type', 'text')
    })

    it('renders password input field', () => {
        renderLoginPage()
        const input = screen.getByPlaceholderText(/enter your password/i)
        expect(input).toBeInTheDocument()
        expect(input).toHaveAttribute('type', 'password')
    })

    it('renders the Sign In submit button', () => {
        renderLoginPage()
        const btn = screen.getByRole('button', { name: /sign in/i })
        expect(btn).toBeInTheDocument()
        expect(btn).toHaveAttribute('type', 'submit')
    })

    it('renders the Google OAuth link', () => {
        renderLoginPage()
        const link = screen.getByText(/sign in with google/i)
        expect(link).toBeInTheDocument()
        expect(link.closest('a')).toHaveAttribute('href', '/auth/google')
    })

    it('renders the "Create one" registration link', () => {
        renderLoginPage()
        const link = screen.getByText(/create one/i)
        expect(link).toBeInTheDocument()
    })

    it('calls /api/login with correct form data on submit', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({ success: true, username: 'demo', role: 'user' }),
        })
        global.fetch = mockFetch

        renderLoginPage()

        const user = userEvent.setup()
        await user.type(screen.getByPlaceholderText(/enter your username/i), 'demo')
        await user.type(screen.getByPlaceholderText(/enter your password/i), 'pass123')
        await user.click(screen.getByRole('button', { name: /sign in/i }))

        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalled()
            const [url, options] = mockFetch.mock.calls[0]
            expect(url).toBe('/api/login')
            expect(options.method).toBe('POST')
            expect(options.body).toBeInstanceOf(FormData)
        })
    })

    it('displays error message on failed login', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({ success: false, error: 'Invalid credentials' }),
        })
        global.fetch = mockFetch

        renderLoginPage()

        const user = userEvent.setup()
        await user.type(screen.getByPlaceholderText(/enter your username/i), 'bad')
        await user.type(screen.getByPlaceholderText(/enter your password/i), 'wrong')
        await user.click(screen.getByRole('button', { name: /sign in/i }))

        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
        })
    })
})
