/**
 * Test Suite: Navbar Component
 *
 * Verifies rendering of navigation links, user avatar, theme toggle,
 * and conditional admin link visibility based on user role.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'

function renderNavbar(userOverride = { username: 'testuser', role: 'user' }) {
    window.localStorage.setItem('user', JSON.stringify(userOverride))
    return render(
        <ThemeProvider>
            <MemoryRouter>
                <AuthProvider>
                    <Navbar />
                </AuthProvider>
            </MemoryRouter>
        </ThemeProvider>
    )
}

describe('Navbar', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        window.localStorage.clear()
    })

    it('renders the MathClassifier brand name', () => {
        renderNavbar()
        expect(screen.getByText(/mathclassifier/i)).toBeInTheDocument()
    })

    it('renders the Classifier navigation link', () => {
        renderNavbar()
        const link = screen.getByRole('link', { name: 'Classifier' })
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href', '/')
    })

    it('renders the Bulk navigation link', () => {
        renderNavbar()
        const link = screen.getByRole('link', { name: /bulk/i })
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href', '/bulk')
    })

    it('renders the History navigation link', () => {
        renderNavbar()
        const link = screen.getByRole('link', { name: /history/i })
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href', '/history')
    })

    it('renders the Pricing navigation link', () => {
        renderNavbar()
        const link = screen.getByRole('link', { name: /pricing/i })
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href', '/pricing')
    })

    it('displays the user avatar with first letter of username', () => {
        renderNavbar({ username: 'hasan', role: 'user' })
        // The avatar displays the first letter uppercased
        expect(screen.getByText('H')).toBeInTheDocument()
    })

    it('displays the username', () => {
        renderNavbar({ username: 'hasan', role: 'user' })
        expect(screen.getByText('hasan')).toBeInTheDocument()
    })

    it('renders the Logout button', () => {
        renderNavbar()
        const logoutBtn = screen.getByTitle(/logout/i)
        expect(logoutBtn).toBeInTheDocument()
    })

    it('renders the theme toggle button', () => {
        renderNavbar()
        const themeBtn = screen.getByTitle(/toggle theme/i)
        expect(themeBtn).toBeInTheDocument()
    })

    // ── Admin Link Visibility ────────────────────────────────────────

    it('shows Admin link when user role is admin', () => {
        renderNavbar({ username: 'admin', role: 'admin' })
        const adminLink = screen.getByRole('link', { name: /admin/i })
        expect(adminLink).toBeInTheDocument()
        expect(adminLink).toHaveAttribute('href', '/admin')
    })

    it('hides Admin link when user role is regular user', () => {
        renderNavbar({ username: 'regular', role: 'user' })
        const adminLink = screen.queryByRole('link', { name: /admin/i })
        expect(adminLink).not.toBeInTheDocument()
    })
})
