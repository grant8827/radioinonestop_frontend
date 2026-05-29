import { useNavigate } from 'react-router-dom'

const PLAN_DETAILS = {
  professional: {
    name: 'Professional',
    price: { monthly: 28, yearly: 280 },
    features: ['Conference calls', 'Up to 10 participants', 'Screen sharing', '1000 concurrent listeners']
  },
  enterprise: {
    name: 'Enterprise',
    price: { monthly: 40, yearly: 400 },
    features: ['Video live streaming', 'Up to 3 streaming channels', 'Social media multistream', '2000 concurrent listeners']
  },
  ultimate: {
    name: 'Ultimate',
    price: { monthly: 55, yearly: 550 },
    features: ['Up to 6 streaming channels', 'Advanced analytics', 'Custom branding', 'Unlimited listeners']
  }
}

export default function UpgradeModal({ requiredPlan, featureName, onClose }) {
  const navigate = useNavigate()
  const plan = PLAN_DETAILS[requiredPlan]

  if (!plan) return null

  function handleUpgrade() {
    navigate('/pricing')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative bg-gray-900 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-purple-900/40">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Upgrade Required
        </h2>
        <p className="text-gray-400 text-center mb-6">
          <span className="font-semibold text-white">{featureName}</span> is available in the <span className="font-semibold text-purple-400">{plan.name}</span> plan
        </p>

        {/* Features */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {plan.name} Plan Includes:
          </p>
          <ul className="space-y-2.5">
            {plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <svg
                  className="w-5 h-5 text-purple-400 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-sm text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing */}
        <div className="flex items-baseline justify-center gap-1.5 mb-6">
          <span className="text-xs text-gray-500">Starting at</span>
          <span className="text-3xl font-extrabold text-white">${plan.price.monthly}</span>
          <span className="text-gray-400 text-sm">/month</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm transition-all"
          >
            Maybe Later
          </button>
          <button
            onClick={handleUpgrade}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-900/40"
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  )
}
