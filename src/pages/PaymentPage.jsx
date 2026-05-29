import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PLAN_INFO = {
    starter: { name: 'Starter', monthly: 29, yearly: 290 },
    professional: { name: 'Professional', monthly: 39, yearly: 390 },
    enterprise: { name: 'Enterprise', monthly: 59, yearly: 590 },
    ultimate: { name: 'Ultimate', monthly: 99, yearly: 990 },
  }

export default function PaymentPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [searchParams] = useSearchParams()
  const planId = searchParams.get('plan') || 'starter'
  const billingCycle = searchParams.get('billing') || 'monthly'
  const planInfo = PLAN_INFO[planId] || PLAN_INFO.starter
  const planPrice = planInfo[billingCycle] || planInfo.monthly

  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [name, setName] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Redirect to home if not authenticated
    if (!isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setProcessing(true)

    try {
      // TODO: Integrate with Stripe or your payment processor
      // For now, simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // On success, redirect to dashboard
      navigate('/app')
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-purple-400 bg-purple-900/20 border border-purple-800/40 rounded-full px-4 py-1.5 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            Secure Checkout
          </div>
          <h1 className="text-3xl font-bold mb-2">Complete Your Purchase</h1>
          <p className="text-gray-400 text-sm">
            You're subscribing to the <span className="font-semibold text-white">{planInfo.name}</span> plan
            <span className="text-gray-500 ml-1">({billingCycle === 'yearly' ? 'Yearly' : 'Monthly'})</span>
          </p>
        </div>

        {/* Plan Summary Card */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm">Plan</span>
            <span className="font-semibold">{planInfo.name}</span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm">Billing Cycle</span>
            <span className="font-semibold">{billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}</span>
          </div>
          {billingCycle === 'yearly' && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400 text-sm">Savings</span>
              <span className="font-semibold text-green-400">17% off</span>
            </div>
          )}
          <div className="border-t border-white/10 pt-4 flex items-center justify-between">
            <span className="text-lg font-bold">Total</span>
            <span className="text-2xl font-extrabold text-purple-400">
              ${planPrice}{billingCycle === 'yearly' ? '/yr' : '/mo'}
            </span>
          </div>
        </div>

        {/* Test Mode Notice */}
        <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-300 mb-2">Test Mode - Use Test Card</h3>
              <div className="space-y-1 text-xs text-blue-200/80">
                <p><span className="font-semibold text-blue-300">Card Number:</span> 4242 4242 4242 4242</p>
                <p><span className="font-semibold text-blue-300">Expiry:</span> Any future date (e.g., 12/25)</p>
                <p><span className="font-semibold text-blue-300">CVC:</span> Any 3 digits (e.g., 123)</p>
                <p><span className="font-semibold text-blue-300">Name:</span> Any name</p>
              </div>
              <p className="text-xs text-blue-300/60 mt-2 italic">
                No real charges will be made. This is for testing purposes only.
              </p>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="bg-white/3 border border-white/10 rounded-xl p-6">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-4">Payment Details</h2>

          {error && (
            <div className="flex items-start gap-2 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3 mb-4">
              <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Cardholder Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full bg-gray-900/60 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Card Number
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="1234 5678 9012 3456"
                required
                maxLength={19}
                className="w-full bg-gray-900/60 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="MM/YY"
                  required
                  maxLength={5}
                  className="w-full bg-gray-900/60 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  CVC
                </label>
                <input
                  type="text"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  placeholder="123"
                  required
                  maxLength={4}
                  className="w-full bg-gray-900/60 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full mt-6 py-3 rounded-xl bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              `Pay $${planPrice}${billingCycle === 'yearly' ? '/year' : '/month'}`
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            🔒 Your payment information is encrypted and secure
          </p>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  )
}
