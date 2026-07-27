export default function DowngradeWarningModal({ currentPlan, targetPlan, losses, onCancel, onConfirm }) {
  if (!currentPlan || !targetPlan) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="downgrade-warning-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.7 2.2 17.8A1.5 1.5 0 0 0 3.5 20h17a1.5 1.5 0 0 0 1.3-2.2L13.7 3.7a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <div>
            <h2 id="downgrade-warning-title" className="text-xl font-bold text-white">
              You’re downgrading your package
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-400">
              Changing from <span className="font-semibold text-white">{currentPlan.name}</span> to{' '}
              <span className="font-semibold text-amber-400">{targetPlan.name}</span> means you’ll lose access to:
            </p>
          </div>
        </div>

        <ul className="mb-6 max-h-72 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-4">
          {losses.map((loss) => (
            <li key={loss} className="flex items-start gap-3 text-sm text-gray-200">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth="2.25" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
              </svg>
              <span>{loss}</span>
            </li>
          ))}
        </ul>

        <p className="mb-5 text-xs leading-5 text-gray-500">
          Features and usage above the {targetPlan.name} limits may stop working after the downgrade takes effect.
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Keep {currentPlan.name}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
          >
            Continue to {targetPlan.name}
          </button>
        </div>
      </div>
    </div>
  )
}
