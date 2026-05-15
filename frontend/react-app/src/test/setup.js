/**
 * Global Test Setup for Vitest + React Testing Library
 *
 * - Extends expect() with DOM-specific matchers (toBeInTheDocument, etc.)
 * - Mocks browser APIs not available in jsdom (localStorage, fetch)
 * - Cleans up after each test
 */

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Automatic cleanup after each test
afterEach(() => {
    cleanup()
})

// Mock localStorage
const localStorageMock = (() => {
    let store = {}
    return {
        getItem: vi.fn((key) => store[key] ?? null),
        setItem: vi.fn((key, value) => { store[key] = String(value) }),
        removeItem: vi.fn((key) => { delete store[key] }),
        clear: vi.fn(() => { store = {} }),
    }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock window.location
delete window.location
window.location = { href: '', assign: vi.fn(), replace: vi.fn(), reload: vi.fn() }
