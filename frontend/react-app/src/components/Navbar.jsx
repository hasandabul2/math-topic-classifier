import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { Brain, FileSpreadsheet, History, CreditCard, Shield, LogOut, Menu, X, Moon, Sun, Globe } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
    const { user, logout } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const { language, toggleLanguage, t } = useLanguage()
    const location = useLocation()
    const navigate = useNavigate()
    const [mobileOpen, setMobileOpen] = useState(false)

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const navItems = [
        { path: '/', label: t('nav_classifier'), icon: Brain },
        { path: '/bulk', label: t('nav_bulk'), icon: FileSpreadsheet },
        { path: '/history', label: t('nav_history'), icon: History },
        { path: '/pricing', label: t('nav_pricing'), icon: CreditCard },
        ...(user?.role === 'admin' ? [{ path: '/admin', label: t('nav_admin'), icon: Shield }] : []),
    ]

    const isDark = theme === 'dark'

    const navBg = isDark ? 'bg-slate-900/80 border-slate-800 text-slate-100' : 'bg-white/80 border-slate-200 text-slate-700'
    const logoText = isDark ? 'text-slate-100' : 'text-slate-800'
    const chipBg = isDark ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-700'

    return (
        <nav className={`${navBg} backdrop-blur-sm border-b sticky top-0 z-50`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-md group-hover:shadow-lg">
                            <span className="text-white font-bold text-sm">π</span>
                        </div>
                        <span className={`font-bold text-lg hidden sm:block ${logoText}`}>MathClassifier</span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-1">
                        {navItems.map(({ path, label, icon: Icon }) => (
                            <Link
                                key={path}
                                to={path}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${location.pathname === path
                                        ? 'bg-primary-50 text-primary-700'
                                        : isDark
                                            ? 'text-slate-200 hover:bg-slate-800 hover:text-white'
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                            >
                                <Icon size={16} />
                                {label}
                            </Link>
                        ))}
                    </div>

                    {/* User info + Language + Theme + Logout */}
                    <div className="hidden md:flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${chipBg}`}>
                            <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center">
                                <span className="text-white text-xs font-bold">{user?.username?.[0]?.toUpperCase()}</span>
                            </div>
                            <span className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>{user?.username}</span>
                        </div>
                        {/* Language Toggle */}
                        <button
                            onClick={toggleLanguage}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${isDark
                                ? 'border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                                }`}
                            title={language === 'en' ? 'Türkçeye çevir' : 'Switch to English'}
                        >
                            <Globe size={14} />
                            {language === 'en' ? 'TR' : 'EN'}
                        </button>
                        <button
                            onClick={toggleTheme}
                            className={`p-2 rounded-lg transition-all ${isDark ? 'text-amber-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                            title="Toggle theme"
                        >
                            {isDark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title={t('nav_logout')}
                        >
                            <LogOut size={18} />
                        </button>
                    </div>

                    {/* Mobile menu toggle */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className={`md:hidden p-2 rounded-lg ${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className={`md:hidden border-t animate-fade-in ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                    <div className="px-4 py-3 space-y-1">
                        {navItems.map(({ path, label, icon: Icon }) => (
                            <Link
                                key={path}
                                to={path}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${location.pathname === path
                                        ? 'bg-primary-50 text-primary-700'
                                        : isDark
                                            ? 'text-slate-200 hover:bg-slate-800'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                <Icon size={18} />
                                {label}
                            </Link>
                        ))}
                        {/* Language toggle in mobile menu */}
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            <button
                                onClick={() => { toggleLanguage(); setMobileOpen(false) }}
                                className={`flex items-center gap-3 w-full text-left ${isDark ? 'hover:text-primary-300' : 'hover:text-slate-900'}`}
                            >
                                <Globe size={18} />
                                {language === 'en' ? 'Türkçe' : 'English'}
                            </button>
                        </div>
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            <button
                                onClick={() => { toggleTheme(); setMobileOpen(false) }}
                                className={`flex items-center gap-3 w-full text-left ${isDark ? 'hover:text-amber-300' : 'hover:text-slate-900'}`}
                            >
                                {isDark ? <Sun size={18} /> : <Moon size={18} />}
                                {isDark ? t('nav_light_mode') : t('nav_dark_mode')}
                            </button>
                        </div>
                        <hr className={`${isDark ? 'border-slate-800' : 'border-slate-100'}`} />
                        <button
                            onClick={handleLogout}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 w-full ${isDark ? 'hover:bg-red-900/30' : 'hover:bg-red-50'}`}
                        >
                            <LogOut size={18} />
                            {t('nav_logout')}
                        </button>
                    </div>
                </div>
            )}
        </nav>
    )
}
