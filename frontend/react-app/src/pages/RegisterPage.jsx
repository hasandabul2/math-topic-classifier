import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { UserPlus, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function RegisterPage() {
    const { register } = useAuth()
    const { t } = useLanguage()
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const result = await register(username, password, email)
        if (result.success) {
            navigate('/login')
        } else {
            setError(result.error)
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Left Panel — Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-20 left-20 text-9xl font-black text-white">∂</div>
                    <div className="absolute top-40 right-20 text-8xl font-black text-white">λ</div>
                    <div className="absolute bottom-40 left-40 text-7xl font-black text-white">Δ</div>
                    <div className="absolute bottom-20 right-40 text-9xl font-black text-white">∇</div>
                </div>
                <div className="relative z-10 flex flex-col justify-center px-16">
                    <h1 className="text-4xl font-extrabold text-white mb-6 leading-tight">
                        {t('register_heading')}<br />
                        <span className="bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
                            {t('register_heading_highlight')}
                        </span>
                    </h1>
                    <div className="space-y-4">
                        {[
                            t('register_feature_1'),
                            t('register_feature_2'),
                            t('register_feature_3'),
                            t('register_feature_4'),
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
                                <span className="text-slate-300">{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel — Form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shadow-lg">
                            <span className="text-white text-xl font-bold">π</span>
                        </div>
                        <span className="font-extrabold text-2xl text-slate-800">MathClassifier</span>
                    </div>

                    <h2 className="text-3xl font-extrabold text-slate-800 mb-2">{t('register_title')}</h2>
                    <p className="text-slate-500 mb-8">{t('register_desc')}</p>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-6 animate-fade-in">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="reg-username">{t('register_username')}</label>
                            <input
                                id="reg-username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent text-slate-800"
                                placeholder={t('register_username_placeholder')}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="reg-email">{t('register_email')}</label>
                            <input
                                id="reg-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent text-slate-800"
                                placeholder={t('register_email_placeholder')}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="reg-password">{t('register_password')}</label>
                            <div className="relative">
                                <input
                                    id="reg-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent text-slate-800 pr-12"
                                    placeholder={t('register_password_placeholder')}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            id="register-btn"
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all btn-press disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full spinner" />
                            ) : (
                                <>
                                    <UserPlus size={18} />
                                    {t('register_btn')}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-500 text-sm">
                            {t('register_has_account')}{' '}
                            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">
                                {t('register_signin')} <ArrowRight size={14} className="inline" />
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
