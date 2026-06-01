import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || ''

const PLAN_INFO = {
    starter: { name: 'Starter', monthly: 29, yearly: 290 },
    professional: { name: 'Professional', monthly: 39, yearly: 390 },
    enterprise: { name: 'Enterprise', monthly: 59, yearly: 590 },
    ultimate: { name: 'Ultimate', monthly: 99, yearly: 990 },
  }

export default function PaymentPage() {
  const navigate = useNavigate()
  const { isAuthenticated, token, refreshProfile} = useAuth()
  const [searchParams] = useSearchParams()
  const requestedPlan = (searchParams.get('plan') || 'starter').toLowerCase()
  const requestedBilling = (searchParams.get('billing') || 'monthly').toLowerCase()
  const planId = PLAN_INFO[requestedPlan] ? requestedPlan : 'starter'
  const billingCycle = ['monthly', 'yearly'].includes(requestedBilling) ? requestedBilling : 'monthly'
  const planInfo = PLAN_INFO[planId] || PLAN_INFO.starter
  const planPrice = planInfo[billingCycle] || planInfo.monthly

  // Payment method selection
  const [paymentMethod, setPaymentMethod] = useState('card')

  // PayPal states
  const paypalRef = useRef(null)
  const [paypalLoaded, setPaypalLoaded] = useState(false)
  const [paypalPlanId, setPaypalPlanId] = useState(null)
  const [loadingPayPal, setLoadingPayPal] = useState(true)

  // Credit card states
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [name, setName] = useState('')
  const [processing, setProcessing] = useState(false)

  // General states
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  // Load PayPal SDK
  useEffect(() => {
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'AU8pGj0hF09PcmBnAskqmFW3TDCP5VC50Sku0vCyup8xqZyTJdb69jx0pdw4iSQNGk0WH1NGV2jU6gSj'
    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription`
    script.addEventListener('load', () => setPaypalLoaded(true))
    document.body.appendChild(script)
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  // Fetch PayPal plan ID from backend
  useEffect(() => {
    async function fetchPlanId() {
      try {
        const response = await fetch(`${API_BASE}/api/paypal/create-subscription?plan=${planId}&billing=${billingCycle}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || 'Failed to fetch PayPal plan ID')
        }
        const data = await response.json()
        setPaypalPlanId(data.plan_id)
      } catch (err) {
        console.error('PayPal plan fetch error:', err)
        setError(err.message || 'Failed to load PayPal')
      } finally {
        setLoadingPayPal(false)
      }
    }
    if (isAuthenticated && token) {
      fetchPlanId()
    }
  }, [planId, billingCycle, token, isAuthenticated])

  // Render PayPal buttons
  useEffect(() => {
    if (paypalLoaded && paypalPlanId && paypalRef.current && paymentMethod === 'paypal') {
      paypalRef.current.innerHTML = ''
      window.paypal.Buttons({
        createSubscription: function(data, actions) {
          return actions.subscription.create({
            'plan_id': paypalPlanId
          })
        },
        onApprove: async function(data) {
          try {
            const response = await fetch(`${API_BASE}/api/paypal/success`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                subscription_id: data.subscriptionID,
                plan: planId,
                billing_cycle: billingCycle
              })
            })
            if (!response.ok) {
              const message = await response.text()
              throw new Error(message || 'Failed to activate subscription')
            }
            await refreshProfile()
            navigate('/app')
          } catch (err) {
            setError(err.message || 'Failed to complete subscription')
          }
        },
        onError: function(err) {
          setError('Payment failed. Please try again.')
          console.error('PayPal error:', err)
        }
      }).render(paypalRef.current)
    }
  }, [paypalLoaded, paypalPlanId, token, planId, billingCycle, navigate, refreshProfile, paymentMethod])

  async function handleCardSubmit(e) {
    e.preventDefault()
    setError('')
    setProcessing(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const response = await fetch(`${API_BASE}/api/user/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan: planId,
          billing_cycle: billingCycle
        })
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Failed to upgrade plan')
      }

      await refreshProfile()
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
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-4 py-8">
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

        {/* Payment Method Tabs */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-2 mb-6 flex gap-2">
          <button
            onClick={() => setPaymentMethod('card')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
              paymentMethod === 'card'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
              Credit Card
            </div>
          </button>
          <button
            onClick={() => setPaymentMethod('paypal')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
              paymentMethod === 'paypal'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.04.22-.63 3.993-.029.17a.804.804 0 01-.794.679H7.72a.483.483 0 01-.477-.558L7.418 21h1.518l.95-6.02h1.385c4.678 0 7.75-2.203 8.796-6.502z" />
                <path d="M2.197 21.99a.525.525 0 01-.518-.606L3.546 9.838a.972.972 0 01.96-.814h4.64c1.838 0 3.106.365 3.773 1.087.334.362.572.792.730 1.297.15.486.218 1.074.203 1.769l-.006.157.45.265c.382.2.675.43.898.704.476.581.633 1.393.467 2.417-.19.933-.517 1.726-1.017 2.367a4.81 4.81 0 01-1.618 1.32c-.617.309-1.316.47-2.095.47H9.23a.776.776 0 00-.768.655l-.031.17-.63 3.994-.024.143a.53.53 0 01-.525.456H2.197z" />
              </svg>
              PayPal
            </div>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3 mb-4">
            <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Payment Forms */}
        <div className="bg-white/3 border border-white/10 rounded-xl p-6">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-4">Complete Payment</h2>

          {/* Credit Card Form */}
          {paymentMethod === 'card' && (
            <div>
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

              <form onSubmit={handleCardSubmit} className="space-y-4">
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

                <button
                  type="submit"
                  disabled={processing}
                  className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60 disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>
          )}

          {/* PayPal Form */}
          {paymentMethod === 'paypal' && (
            <div>
              {loadingPayPal ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg className="animate-spin w-8 h-8 text-purple-400 mb-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-sm text-gray-400">Loading PayPal...</p>
                </div>
              ) : (
                <div>
                  <div ref={paypalRef} className="min-h-[200px]"></div>
                  <p className="text-xs text-gray-500 text-center mt-4">
                    🔒 Secure payment powered by PayPal
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

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
