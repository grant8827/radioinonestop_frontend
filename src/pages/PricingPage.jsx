import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import appLogo from '../assets/radioinonestop_logo .png'

const RAW_API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || ''
const API_BASE = import.meta.env.DEV ? '' : RAW_API_BASE

const DEFAULT_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [
      'Radio DJ & Mixer',
      '96 kbps audio streaming',
      'Custom stream URL',
      'Embeddable player widget',
      'Listeners analytics',
      'Up to 500 concurrent listeners',
      'Record sessions',
    ],
    monthlySalePercent: 0,
    yearlySalePercent: 0,
    isFeatured: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 39,
    yearlyPrice: 390,
    features: [
      'Everything in Starter',
      '96 or 128 kbps audio streaming',
      'Track Scheduler',
      'Conference rooms (up to 2 guests)',
      'Priority audio processing',
      'Up to 1,000 concurrent listeners',
    ],
    monthlySalePercent: 0,
    yearlySalePercent: 0,
    isFeatured: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 59,
    yearlyPrice: 590,
    features: [
      'Everything in Professional',
      'Conference rooms (up to 5 guests)',
      '96, 128 or 192 kbps audio streaming',
      'Advanced listener reporting',
      'Priority station support',
      'Up to 2,000 concurrent listeners',
    ],
    monthlySalePercent: 0,
    yearlySalePercent: 0,
    isFeatured: false,
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    monthlyPrice: 99,
    yearlyPrice: 990,
    features: [
      'Everything in Enterprise',
      '96, 128, 192 or 320 kbps audio streaming',
      'Conference rooms (up to 20 guests)',
      'Premium radio automation',
      'Advanced analytics dashboard',
      'Custom branding options',
      'Unlimited concurrent listeners',
    ],
    monthlySalePercent: 0,
    yearlySalePercent: 0,
    isFeatured: false,
  },
]

export default function PricingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, logout, user } = useAuth()
  const currentPlan = (user?.plan || '').toLowerCase()
  const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' or 'yearly'
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadWarning, setLoadWarning] = useState('')

  useEffect(() => {
    async function fetchPricing() {
      try {
        const res = await fetch(`${API_BASE}/api/public/pricing`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setPlans(data)
            setLoadWarning('')
          } else {
            setPlans(DEFAULT_PLANS)
            setLoadWarning('Live pricing is temporarily unavailable. Showing default prices.')
          }
        } else {
          setPlans(DEFAULT_PLANS)
          setLoadWarning('Live pricing is temporarily unavailable. Showing default prices.')
        }
      } catch (err) {
        console.error('Failed to fetch pricing:', err)
        setPlans(DEFAULT_PLANS)
        setLoadWarning('Live pricing is temporarily unavailable. Showing default prices.')
      } finally {
        setLoading(false)
      }
    }
    fetchPricing()
  }, [])

  function selectPlan(planId) {
    const checkoutPath = `/payment?plan=${planId}&billing=${billingCycle}`
    navigate(isAuthenticated ? checkoutPath : `/register?plan=${planId}&billing=${billingCycle}`)
  }

  // Calculate price with sale discount
  function getDisplayPrice(plan) {
    const basePrice = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
    const salePercent = billingCycle === 'yearly' ? plan.yearlySalePercent : plan.monthlySalePercent
    
    const hasSale = salePercent > 0
    const discountedPrice = hasSale ? basePrice * (1 - salePercent / 100) : basePrice
    
    return {
      original: basePrice,
      discounted: Math.round(discountedPrice * 100) / 100,
      hasSale,
      salePercent
    }
  }

  const yearlySalePercents = [...new Set(
    plans
      .map((plan) => Number(plan.yearlySalePercent))
      .filter((percent) => Number.isFinite(percent) && percent > 0)
  )]
  const yearlySaleLabel = yearlySalePercents.length === 1
    ? `Save ${yearlySalePercents[0]}%`
    : yearlySalePercents.length > 1
      ? `Save up to ${Math.max(...yearlySalePercents)}%`
      : ''

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="text-gray-400">Loading pricing...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ── Navbar ── */}
      <nav className="border-b border-white/5 backdrop-blur-lg bg-gray-950/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <img src={appLogo} alt="Radio In One Stop logo" className="w-7 h-7 rounded-sm object-contain" />
            <span className="font-bold text-sm tracking-tight">Radio In One Stop</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/#features')}
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-1.5 rounded-lg hover:bg-white/5"
            >
              Features
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="text-sm font-medium text-amber-400 transition-colors px-4 py-1.5 rounded-lg bg-red-900/20"
            >
              Pricing
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate('/app')}
                  className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-1.5 rounded-lg hover:bg-white/5"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                  className="px-5 py-2 rounded-lg border border-white/20 hover:bg-white/5 text-white font-semibold text-sm transition-all"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-1.5 rounded-lg hover:bg-white/5"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-700/20 blur-3xl" />
          <div className="absolute -top-20 right-0 w-80 h-80 rounded-full bg-blue-700/15 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300 bg-red-900/20 border border-red-800/40 rounded-full px-3 py-1 mb-6">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
            Simple, transparent pricing
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-4">
            Choose Your Plan
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-gray-400 leading-relaxed">
            Start broadcasting today. All plans include secure stream keys, HLS playback, and 24/7 uptime.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-14 h-7 bg-white/10 rounded-full transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-950"
            >
              <div
                className={`absolute top-0.5 left-0.5 w-6 h-6 rio-logo-gradient rounded-full transition-transform shadow-lg ${
                  billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'text-white' : 'text-gray-500'}`}>
              Yearly
            </span>
            {yearlySaleLabel && (
              <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400">
                {yearlySaleLabel}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Pricing Cards ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {loadWarning && (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
            {loadWarning}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const pricing = getDisplayPrice(plan)
            const isHighlighted = plan.isFeatured
            const isCurrentPlan = isAuthenticated && plan.id.toLowerCase() === currentPlan

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border ${
                  isCurrentPlan
                    ? 'border-green-500/70 bg-green-900/10 shadow-xl shadow-green-900/20 ring-1 ring-green-500/30'
                    : isHighlighted
                    ? 'border-red-500/60 bg-red-900/10 shadow-xl shadow-red-900/20'
                    : 'border-white/10 bg-white/3'
                } p-8 transition-all hover:border-amber-500/40 hover:shadow-lg`}
              >
                {isCurrentPlan ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      Current Plan
                    </span>
                  </div>
                ) : isHighlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-block rio-logo-gradient text-white text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  
                  {/* Price Display with Sale */}
                  <div className="mb-4">
                    {pricing.hasSale && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-medium text-gray-500 line-through">
                          ${pricing.original}
                        </span>
                        <span className="inline-block text-xs font-bold bg-green-900/30 text-green-400 border border-green-800/40 rounded-full px-2 py-0.5">
                          {pricing.salePercent}% OFF
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-extrabold">
                        ${pricing.discounted}
                      </span>
                      <span className="text-gray-400 text-sm">
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <p className="text-xs text-gray-500 mt-1">
                        ${(pricing.discounted / 12).toFixed(2)}/month billed annually
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => !isCurrentPlan && selectPlan(plan.id)}
                  disabled={isCurrentPlan}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all mb-6 ${
                    isCurrentPlan
                      ? 'bg-green-600/20 text-green-300 border border-green-500/40 cursor-default'
                      : isHighlighted
                      ? 'rio-logo-gradient text-white shadow-lg shadow-red-900/40'
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20'
                  }`}
                >
                  {isCurrentPlan ? `✓ ${plan.name} — Active` : `Select ${plan.name}`}
                </button>

                <div className="space-y-3">
                  {plan.features && plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <svg
                        className={`w-5 h-5 shrink-0 mt-0.5 ${
                          isHighlighted ? 'text-amber-400' : 'text-gray-500'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* FAQ or additional info */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 text-sm mb-4">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <p className="text-gray-500 text-xs">
            Need a custom enterprise solution?{' '}
            <button className="text-amber-400 hover:text-amber-300 underline">
              Contact our sales team
            </button>
          </p>
        </div>
      </section>
    </div>
  )
}
