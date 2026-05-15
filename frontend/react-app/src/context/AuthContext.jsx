import { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user')
        return saved ? JSON.parse(saved) : null
    })

    const login = async (username, password) => {
        const formData = new FormData()
        formData.append('username', username)
        formData.append('password', password)

        const res = await fetch('/api/login', {
            method: 'POST',
            body: formData,
            credentials: 'include',
        })

        const data = await res.json()

        if (data.success) {
            const userData = { username: data.username, role: data.role }
            setUser(userData)
            localStorage.setItem('user', JSON.stringify(userData))
            return { success: true }
        }

        return { success: false, error: data.error || 'Invalid username or password' }
    }

    const register = async (username, password, email) => {
        const formData = new FormData()
        formData.append('username', username)
        formData.append('password', password)
        formData.append('email', email)

        const res = await fetch('/api/register', {
            method: 'POST',
            body: formData,
        })

        const data = await res.json()
        return data
    }

    const logout = async () => {
        await fetch('/api/logout', { credentials: 'include' })
        setUser(null)
        localStorage.removeItem('user')
    }

    return (
        <AuthContext.Provider value={{ user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
