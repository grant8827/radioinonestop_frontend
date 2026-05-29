import { useNavigate } from 'react-router-dom'

/**
 * ListenerLimitModal - Shows when user exceeds their listener limit
 * 
 * Props:
 * - status: 'warning' (1-5 over) or 'suspended' (6+ over)
 * - current: current listener count
 * - limit: plan listener limit
 * - plan: current plan name
 * - onClose: function to close modal (temp dismiss for current session)
 */
export default function ListenerLimitModal({ status, current, limit, plan, onClose }) {
  const navigate = useNavigate()

  if (status !== 'warning' && status !== 'suspended') {
    return null
  }

  const overBy = current - limit
  const isSuspended = status === 'suspended'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className={`bg-gradient-to-br ${
          isSuspended 
            ? 'from-red-900/90 to-rose-950/90' 
            : 'from-amber-900/90 to-orange-950/90'
        } border ${
          isSuspended 
            ? 'border-red-500/40' 
            : 'border-amber-500/40'
        } rounded-2xl shadow-2xl max-w-lg w-full`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          isSuspended 
            ? 'border-red-500/30' 
            : 'border-amber-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${
              isSuspended 
                ? 'bg-red-500/20 text-red-400' 
                : 'bg-amber-500/20 text-amber-400'
            } flex items-center justify-center`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isSuspended ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isSuspended ? 'Streaming Suspended' : 'Listener Limit Exceeded'}
              </h2>
              <p className={`text-sm ${
                isSuspended 
                  ? 'text-red-300' 
                  : 'text-amber-300'
              }`}>
                {current.toLocaleString()} / {limit.toLocaleString()} listeners
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          <div className={`p-4 rounded-lg ${
            isSuspended 
              ? 'bg-red-500/10 border border-red-500/20' 
              : 'bg-amber-500/10 border border-amber-500/20'
          }`}>
            <p className="text-white text-base leading-relaxed">
              {isSuspended ? (
                <>
                  Your stream has been <strong>suspended</strong> because you exceeded your {plan} plan 
                  limit by <strong>{overBy} listeners</strong>. You can still access your dashboard 
                  and use the DJ mixer, but you cannot start new broadcasts.
                </>
              ) : (
                <>
                  You're currently <strong>{overBy} listener{overBy !== 1 ? 's' : ''} over</strong> your 
                  {' '}{plan} plan limit. If you reach <strong>{limit + 6} listeners</strong>, your 
                  streaming will be suspended until you upgrade.
                </>
              )}
            </p>
          </div>

          {!isSuspended && (
            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
              <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-amber-200 text-sm">
                Warning window: {limit + 1} - {limit + 5} listeners. Suspension at {limit + 6}+
              </p>
            </div>
          )}

          <div className="pt-2">
            <h3 className="text-white font-semibold mb-2">Upgrade Benefits:</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-white/90">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Higher listener capacity</span>
              </li>
              <li className="flex items-center gap-2 text-white/90">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>No interruptions or suspensions</span>
              </li>
              <li className="flex items-center gap-2 text-white/90">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Additional premium features</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-white/10 flex gap-3">
          <button
            onClick={() => navigate('/pricing')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              isSuspended
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
                : 'bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/30'
            }`}
          >
            Upgrade Now
          </button>
          {!isSuspended && (
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-lg font-semibold bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              Remind Later
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
