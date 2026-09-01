import { toast } from 'sonner'

let lastBackPressTime = 0

export function initDoubleBackToExit(pathname: string) {
  if (typeof window === 'undefined') return

  const handlePopState = (e: PopStateEvent) => {
    // Only intercept exit on root pages (e.g. /dashboard or /)
    if (pathname === '/dashboard' || pathname === '/') {
      const now = Date.now()
      if (now - lastBackPressTime < 2000) {
        // Exit app or let browser pop back
        return
      } else {
        lastBackPressTime = now
        // Push state again so history isn't immediately popped
        window.history.pushState(null, '', window.location.href)
        toast.info('Press back again to exit NIRMAAN 📱', {
          duration: 2000,
          id: 'press-back-exit-toast',
        })
      }
    }
  }

  window.addEventListener('popstate', handlePopState)

  return () => {
    window.removeEventListener('popstate', handlePopState)
  }
}
