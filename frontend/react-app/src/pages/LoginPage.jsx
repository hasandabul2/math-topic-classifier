import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogIn, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function LoginPage() {
    const { login } = useAuth()
    const { theme } = useTheme()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const isDark = theme === 'dark'
    const bgShell = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50'
    const cardBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
    const labelText = isDark ? 'text-slate-200' : 'text-slate-700'
    const mutedText = isDark ? 'text-slate-400' : 'text-slate-500'

    // Handle Google OAuth redirect
    useEffect(() => {
        if (searchParams.get('google_success') === 'true') {
            const googleUsername = searchParams.get('username')
            const googleRole = searchParams.get('role')
            if (googleUsername) {
                const userData = { username: googleUsername, role: googleRole || 'user' }
                localStorage.setItem('user', JSON.stringify(userData))
                // Force page reload to pick up the new user state
                window.location.href = '/'
            }
        }
        // Show error from Google OAuth if any
        const googleError = searchParams.get('error')
        if (googleError) {
            setError(decodeURIComponent(googleError))
        }
    }, [searchParams])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const result = await login(username, password)
            if (result.success) {
                navigate('/')
            } else {
                setError(result.error)
            }
        } catch (err) {
            setError(err.message || 'Connecting to the server failed.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`min-h-screen flex ${bgShell}`}>
            {/* Left Panel — Branding */}
            <div className="hidden lg:flex lg:w-1/2 gradient-bg relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 left-20 text-9xl font-black text-white">∫</div>
                    <div className="absolute top-40 right-20 text-8xl font-black text-white">π</div>
                    <div className="absolute bottom-40 left-40 text-7xl font-black text-white">Σ</div>
                    <div className="absolute bottom-20 right-40 text-9xl font-black text-white">∞</div>
                    <div className="absolute top-60 left-1/2 text-6xl font-black text-white">√</div>
                </div>
                <div className="relative z-10 flex flex-col justify-center px-16">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8">
                        <span className="text-white text-3xl font-bold">π</span>
                    </div>
                    <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight">
                        Math Question<br />Classifier
                    </h1>
                    <p className="text-xl text-white/80 max-w-md leading-relaxed">
                        AI-powered classification of mathematical questions into 8 specialized topics
                    </p>
                    <div className="flex gap-3 mt-8">
                        {['Algebra', 'Calculus', 'Statistics', 'Topology'].map(t => (
                            <span key={t} className="px-3 py-1 bg-white/15 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel — Form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shadow-lg">
                            <span className="text-white text-xl font-bold">π</span>
                        </div>
                        <span className={`font-extrabold text-2xl ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>MathClassifier</span>
                    </div>

                    <h2 className="text-3xl font-extrabold mb-2">Welcome back</h2>
                    <p className={`${mutedText} mb-8`}>Sign in to your account to continue</p>

                    {error && (
                        <div className={`p-4 rounded-xl text-sm mb-6 animate-fade-in ${isDark ? 'bg-red-900/30 border border-red-800 text-red-100' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className={`block text-sm font-semibold mb-2 ${labelText}`} htmlFor="login-username">Username</label>
                            <input
                                id="login-username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}
                                placeholder="Enter your username"
                                required
                            />
                        </div>

                        <div>
                            <label className={`block text-sm font-semibold mb-2 ${labelText}`} htmlFor="login-password">Password</label>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent pr-12 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}
                                    placeholder="Enter your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            id="login-btn"
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all btn-press disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full spinner" />
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className={`flex-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                        <span className={`text-xs font-medium ${mutedText}`}>OR</span>
                        <div className={`flex-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    </div>

                    {/* Google Sign In */}
                    <a
                        href="/auth/google"
                        className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm border-2 transition-all hover:-translate-y-0.5 shadow-sm ${isDark ? 'border-slate-800 bg-slate-900 text-slate-100 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'}`}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Sign in with Google
                    </a>

                    <div className="mt-6 text-center">
                        <p className={`${mutedText} text-sm`}>
                            Don't have an account?{' '}
                            <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700">
                                Create one <ArrowRight size={14} className="inline" />
                            </Link>
                        </p>
                    </div>

                </div>
            </div>
        </div>
    )
}
