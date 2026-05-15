import { useState, useRef, useEffect } from 'react'
import { Check, Star, Zap, Crown, Loader2, CreditCard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const tiers = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    icon: Zap,
    color: 'from-slate-500 to-slate-600',
    features: [
      'Up to 10 classifications per day',
      'Basic prediction accuracy',
      'Standard support',
      '7-day history',
    ],
    cta: 'Current Plan',
    popular: false,
    payable: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 9.99,
    icon: Star,
    color: 'from-primary-500 to-primary-600',
    features: [
      'Unlimited classifications',
      'Advanced prediction accuracy',
      'Priority support',
      '30-day history',
      'Export results as CSV',
      'Custom analytics',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
    payable: true,
  },
  {
    key: 'premium',
    name: 'Premium',
    price: 19.99,
    icon: Crown,
    color: 'from-amber-500 to-orange-600',
    features: [
      'Unlimited classifications',
      'Highest prediction accuracy',
      '24/7 Premium support',
      'Unlimited history',
      'Export as CSV/PDF',
      'Custom analytics & reports',
      'API access',
      'Batch processing',
      'Admin dashboard',
    ],
    cta: 'Upgrade to Premium',
    popular: false,
    payable: true,
  },
]

export default function PricingPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(null)
  const [checkoutHtml, setCheckoutHtml] = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const [error, setError] = useState('')
  const checkoutRef = useRef(null)

  // When checkout HTML changes, inject it and execute scripts
  useEffect(() => {
    if (showCheckout && checkoutHtml && checkoutRef.current) {
      const container = checkoutRef.current
      container.innerHTML = checkoutHtml

      // Find all script tags and re-create them so the browser executes them
      const scripts = container.querySelectorAll('script')
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script')
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value)
        })
        newScript.textContent = oldScript.textContent
        oldScript.parentNode.replaceChild(newScript, oldScript)
      })
    }
  }, [showCheckout, checkoutHtml])

  const handleUpgrade = async (tierKey) => {
    if (!user) {
      setError('Please log in first to upgrade')
      return
    }

    setLoading(tierKey)
    setError('')

    try {
      const formData = new FormData()
      formData.append('tier', tierKey)

      const res = await fetch('/api/payment/init', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await res.json()

      if (res.status === 401) {
        // Session expired (backend restarted) — force re-login
        localStorage.removeItem('user')
        window.location.reload()
        return
      }

      if (data.success && data.paymentPageUrl) {
        // Redirect to iyzico's hosted payment page
        window.location.href = data.paymentPageUrl
      } else {
        setError(data.error || 'Failed to initialize payment')
      }
    } catch (err) {
      setError('Failed to connect to payment service')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium mb-4">
          <CreditCard size={14} />
          Powered by iyzico
        </div>
        <h1 className="text-4xl font-extrabold text-slate-800 mb-3">Simple, transparent pricing</h1>
        <p className="text-lg text-slate-500 max-w-lg mx-auto">
          Choose the plan that fits your needs. Secure payments via iyzico.
        </p>
      </div>

      {error && (
        <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center animate-fade-in">
          {error}
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8">
        {tiers.map((tier) => {
          const Icon = tier.icon
          return (
            <div
              key={tier.name}
              className={`relative bg-white rounded-2xl border p-8 card-hover ${
                tier.popular
                  ? 'border-primary-300 shadow-xl shadow-primary-500/10 ring-2 ring-primary-500/20'
                  : 'border-slate-200 shadow-lg'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs font-bold rounded-full shadow-md">
                    Most Popular
                  </span>
                </div>
              )}

              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${tier.color} flex items-center justify-center mb-6`}>
                <Icon size={24} className="text-white" />
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-1">{tier.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-slate-900">{tier.price === 0 ? 'Free' : `₺${tier.price}`}</span>
                {tier.price > 0 && <span className="text-slate-400 text-sm">/month</span>}
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600">{f}</span>
                  </li>
                ))}
              </ul>

              {tier.payable ? (
                <button
                  onClick={() => handleUpgrade(tier.key)}
                  disabled={loading === tier.key}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all btn-press ${
                    tier.popular
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:-translate-y-0.5'
                      : 'bg-slate-800 text-white hover:bg-slate-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === tier.key ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard size={16} />
                      {tier.cta}
                    </>
                  )}
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl font-semibold text-sm text-center bg-slate-100 text-slate-500">
                  {tier.cta}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Sandbox test card info */}
      <div className="mt-12 max-w-md mx-auto p-5 bg-amber-50 border border-amber-200 rounded-2xl">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">🧪 Sandbox Test Mode</p>
        <p className="text-sm text-amber-800 mb-3">Use these test card details:</p>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-amber-600 font-medium">Card Number</p>
            <p className="font-mono font-bold text-amber-900">5528 7900 0000 0008</p>
          </div>
          <div>
            <p className="text-xs text-amber-600 font-medium">Expiry</p>
            <p className="font-mono font-bold text-amber-900">12/30</p>
          </div>
          <div>
            <p className="text-xs text-amber-600 font-medium">CVC</p>
            <p className="font-mono font-bold text-amber-900">123</p>
          </div>
        </div>
      </div>

      {/* iyzico Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <CreditCard size={20} className="text-primary-600" />
                <h3 className="font-bold text-slate-800">Secure Payment</h3>
              </div>
              <button
                onClick={() => { setShowCheckout(false); setCheckoutHtml(''); }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="p-6" ref={checkoutRef} />
          </div>
        </div>
      )}
    </div>
  )
}
