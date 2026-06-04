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
  const { isAuthenticated, token, refreshProfile } = useAuth()
  const [searchParams] = useSearchParams()
  const requestedPlan = (searchParams.get('plan') || 'starter').toLowerCase()
  const requestedBilling = (searchParams.get('billing') || 'monthly').toLowerCase()
  const requestedProvider = (searchParams.get('provider') || 'stripe').toLowerCase()
  const requestedStatus = (searchParams.get('status') || '').toLowerCase()
  const stripeSessionId = searchParams.get('session_id') || ''
  const planId = PLAN_INFO[requestedPlan] ? requestedPlan : 'starter'
  const billingCycle = ['monthly', 'yearly'].includes(requestedBilling) ? requestedBilling : 'monthly'
  const planInfo = PLAN_INFO[planId] || PLAN_INFO.starter
  const planPrice = planInfo[billingCycle] || planInfo.monthly
  const [provider, setProvider] = useState(requestedProvider === 'paypal' ? 'paypal' : 'stripe')

  // PayPal states
  const paypalRef = useRef(null)
  const [paypalLoaded, setPaypalLoaded] = useState(false)
  const [paypalPlanId, setPaypalPlanId] = useState(null)
  const [loadingPayPal, setLoadingPayPal] = useState(true)

  // General states
  const [error, setError] = useState('')
  const [stripeLoading, setStripeLoading] = useState(false)
  const [stripeVerifying, setStripeVerifying] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  // Finalize Stripe purchase after redirect back from Checkout.
  useEffect(() => {
    async function finalizeStripeSuccess() {
      if (!token || requestedProvider !== 'stripe' || requestedStatus !== 'success' || !stripeSessionId) return
      setStripeVerifying(true)
      setError('')
      try {
        const response = await fetch(`${API_BASE}/api/stripe/success`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ session_id: stripeSessionId }),
        })
        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || 'Failed to activate Stripe subscription')
        }
        await refreshProfile()
        navigate('/app')
      } catch (err) {
        setError(err.message || 'Failed to complete Stripe subscription')
      } finally {
        setStripeVerifying(false)
      }
    }
    finalizeStripeSuccess()
  }, [token, requestedProvider, requestedStatus, stripeSessionId, refreshProfile, navigate])

  // Load PayPal SDK
  useEffect(() => {
    if (provider !== 'paypal') {
      setPaypalLoaded(false)
      setLoadingPayPal(false)
      return undefined
    }
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'AU8pGj0hF09PcmBnAskqmFW3TDCP5VC50Sku0vCyup8xqZyTJdb69jx0pdw4iSQNGk0WH1NGV2jU6gSj'
    if (!clientId) return undefined
    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription`
    script.addEventListener('load', () => setPaypalLoaded(true))
    document.body.appendChild(script)
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [provider])

  // Fetch PayPal plan ID from backend
  useEffect(() => {
    async function fetchPlanId() {
      if (provider !== 'paypal') {
        setPaypalPlanId(null)
        setLoadingPayPal(false)
        return
      }
      try {
        setLoadingPayPal(true)
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
  }, [planId, billingCycle, token, isAuthenticated, provider])

  // Render PayPal buttons
  useEffect(() => {
    if (provider !== 'paypal') return
    if (paypalLoaded && paypalPlanId && paypalRef.current && window.paypal?.Buttons) {
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
  }, [paypalLoaded, paypalPlanId, token, planId, billingCycle, navigate, refreshProfile, provider])

  async function startStripeCheckout() {
    if (!token) return
    setStripeLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: planId,
          billing_cycle: billingCycle,
        }),
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Failed to create Stripe checkout session')
      }
      const data = await response.json()
      if (!data?.url) {
        throw new Error('Stripe checkout URL missing')
      }
      window.location.href = data.url
    } catch (err) {
      setError(err.message || 'Failed to start Stripe checkout')
      setStripeLoading(false)
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

        {/* Payment Info Banner */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/40 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-blue-200">
                Stripe is the primary checkout. PayPal remains available as an optional fallback.
              </p>
            </div>
          </div>
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

        {/* Payment Form */}
        <div className="bg-white/3 border border-white/10 rounded-xl p-6">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-4">Complete Payment</h2>

          {provider === 'stripe' ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                <p className="text-sm text-gray-300 text-center">
                  Pay securely with your debit or credit card.
                </p>
                <button
                  type="button"
                  onClick={startStripeCheckout}
                  disabled={stripeLoading || stripeVerifying}
                  className="mt-4 w-full px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold transition-colors"
                >
                  {stripeVerifying ? 'Finalizing payment...' : stripeLoading ? 'Redirecting to Stripe...' : 'Continue to Checkout'}
                </button>
                {requestedProvider === 'stripe' && requestedStatus === 'cancel' && !stripeLoading && !stripeVerifying && (
                  <p className="text-xs text-amber-300 mt-3 text-center">Checkout was canceled. You can try again anytime.</p>
                )}
                <p className="text-xs text-gray-500 text-center mt-4">
                  Secure payment processed by Stripe
                </p>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setProvider('paypal')}
                  className="text-sm text-gray-400 hover:text-white transition-colors underline underline-offset-4"
                >
                  Prefer PayPal instead?
                </button>
              </div>
            </div>
          ) : loadingPayPal ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="animate-spin w-8 h-8 text-purple-400 mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm text-gray-400">Loading PayPal...</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-4">
                Pay with a PayPal account or an eligible credit/debit card.
              </p>
              <div ref={paypalRef} className="min-h-[200px]"></div>
              <button
                type="button"
                onClick={() => setProvider('stripe')}
                className="mt-3 text-sm text-gray-400 hover:text-white transition-colors underline underline-offset-4"
              >
                Use Stripe instead
              </button>
              <p className="text-xs text-gray-500 text-center mt-4">
                Secure payment processed by PayPal
              </p>
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
