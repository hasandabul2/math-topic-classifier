import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft, Crown } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export default function PaymentResultPage() {
    const { t } = useLanguage()
    const [searchParams] = useSearchParams()
    const status = searchParams.get('status')
    const tier = searchParams.get('tier')
    const error = searchParams.get('error')

    const isSuccess = status === 'success'
    const isFailed = status === 'failed'

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-10 max-w-md w-full text-center">
                {isSuccess ? (
                    <>
                        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={40} className="text-emerald-500" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-800 mb-2">{t('payment_success')}</h1>
                        <p className="text-slate-500 mb-6">
                            {t('payment_upgraded')}{' '}
                            <span className="font-bold text-primary-600 capitalize">{tier || 'Pro'}</span>.
                        </p>
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-6">
                            <div className="flex items-center justify-center gap-2">
                                <Crown size={18} className="text-emerald-600" />
                                <span className="font-semibold text-emerald-700 capitalize">{tier || 'Pro'} {t('payment_plan_active')}</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                            {isFailed ? (
                                <XCircle size={40} className="text-red-500" />
                            ) : (
                                <AlertTriangle size={40} className="text-amber-500" />
                            )}
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-800 mb-2">
                            {isFailed ? t('payment_failed') : t('payment_error')}
                        </h1>
                        <p className="text-slate-500 mb-6">
                            {error || t('payment_error_desc')}
                        </p>
                    </>
                )}

                <div className="flex gap-3 justify-center">
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-5 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-500 transition-all btn-press"
                    >
                        <ArrowLeft size={16} />
                        {t('payment_go_classifier')}
                    </Link>
                    {!isSuccess && (
                        <Link
                            to="/pricing"
                            className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                        >
                            {t('payment_try_again')}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}
