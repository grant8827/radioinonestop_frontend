import { useNavigate } from 'react-router-dom'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 22,
    description: 'Perfect for getting started with radio broadcasting',
    features: [
      'Radio DJ & Mixer',
      'Custom stream URL',
      'Embeddable player widget',
      'Listeners analytics',
      'Up to 300 concurrent listeners',
      'Basic support',
    ],
    highlighted: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 28,
    description: 'All Starter features plus conference calling',
    features: [
      'Everything in Starter',
      'Conference call rooms',
      'Screen sharing',
      'Up to 10 participants per call',
      'Up to 1000 concurrent listeners',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 40,
    description: 'Complete solution with video streaming',
    features: [
      'Everything in Professional',
      'Video live streaming',
      'Multistream up to 3 channels',
      'Social media live streaming',
      'Up to 2000 concurrent listeners',
      'Dedicated support',
    ],
    highlighted: false,
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    price: 55,
    description: 'Maximum power for professional broadcasters',
    features: [
      'Everything in Enterprise',
      'Multistream up to 6 channels',
      'Advanced analytics dashboard',
      'Custom branding options',
      'Unlimited concurrent listeners',
      '24/7 dedicated support',
    ],
    highlighted: false,
  },
]

export default function PricingPage() {
  const navigate = useNavigate()

  function selectPlan(planId) {
    navigate(`/register?plan=${planId}`)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* ── Navbar ── */}
      <nav className="border-b border-white/5 backdrop-blur-lg bg-gray-950/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 19.5l2.25-2.25m0 0l.75-.75m-.75.75A8.953 8.953 0 0112 15a8.953 8.953 0 015.999 2.25m-12-2.25A8.953 8.953 0 0112 6a8.953 8.953 0 016 3m-12 0L3.75 7.5M3.75 4.5l2.25 2.25m12-2.25l-2.25 2.25m0 0l-.75.75m.75-.75A8.953 8.953 0 0112 9a8.953 8.953 0 016 3m-6-3V3m0 18v-1.5" />
            </svg>
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
              className="text-sm font-medium text-purple-400 transition-colors px-4 py-1.5 rounded-lg bg-purple-900/20"
            >
              Pricing
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-1.5 rounded-lg hover:bg-white/5"
            >
              Sign In
            </button>
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
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-purple-400 bg-purple-900/20 border border-purple-800/40 rounded-full px-3 py-1 mb-6">
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
        </div>
      </section>

      {/* ── Pricing Cards ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border ${
                plan.highlighted
                  ? 'border-purple-500/60 bg-purple-900/10 shadow-xl shadow-purple-900/20'
                  : 'border-white/10 bg-white/3'
              } p-8 transition-all hover:border-purple-500/40 hover:shadow-lg`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-block bg-linear-to-r from-purple-600 to-blue-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold">${plan.price}</span>
                  <span className="text-gray-400 text-sm">/month</span>
                </div>
              </div>

              <button
                onClick={() => selectPlan(plan.id)}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all mb-6 ${
                  plan.highlighted
                    ? 'bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-900/40'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20'
                }`}
              >
                Select {plan.name}
              </button>

              <div className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <svg
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        plan.highlighted ? 'text-purple-400' : 'text-gray-500'
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
          ))}
        </div>

        {/* FAQ or additional info */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 text-sm mb-4">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <p className="text-gray-500 text-xs">
            Need a custom enterprise solution?{' '}
            <button className="text-purple-400 hover:text-purple-300 underline">
              Contact our sales team
            </button>
          </p>
        </div>
      </section>
    </div>
  )
}
