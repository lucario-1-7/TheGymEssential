import { useEffect, useRef } from 'react'

// A transient popup message that auto-dismisses after `duration` ms.
// Use for notification/celebration messages — not for prompts that need a response.
export default function Popup({ show, onClose, duration = 5000, children }) {
  // Keep the latest onClose without restarting the timer on every parent render.
  const cb = useRef(onClose)
  cb.current = onClose

  useEffect(() => {
    if (!show) return
    const t = setTimeout(() => cb.current?.(), duration)
    return () => clearTimeout(t)
  }, [show, duration])

  if (!show) return null

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-yellow-700/50 bg-gray-900 px-5 py-4 shadow-xl">
        {children}
      </div>
    </div>
  )
}
