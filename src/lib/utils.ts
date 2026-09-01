import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'relative' = 'short') {
  const d = new Date(date)
  const now = new Date()
  
  if (format === 'relative') {
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days}d ago`
  }
  
  if (format === 'long') {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function getPriorityColor(priority: number) {
  if (priority >= 4) return 'var(--danger)'
  if (priority >= 3) return 'var(--focus)'
  if (priority >= 2) return 'var(--growth)'
  return 'var(--text-dim)'
}

export function getPriorityLabel(priority: number) {
  if (priority >= 4) return 'Critical'
  if (priority >= 3) return 'High'
  if (priority >= 2) return 'Medium'
  return 'Low'
}

export function getMoodEmoji(mood: string) {
  const map: Record<string, string> = {
    amazing: '🚀',
    good: '😊',
    meh: '😐',
    bad: '😔',
    awful: '😞',
  }
  return map[mood] ?? '😐'
}

export function getMoodScore(mood: string) {
  const map: Record<string, number> = {
    amazing: 100,
    good: 75,
    meh: 50,
    bad: 25,
    awful: 0,
  }
  return map[mood] ?? 50
}

export function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len) + '…' : str
}

export function pluralize(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function stripMarkdown(str: string): string {
  if (!str) return ''
  return str
    .replace(/#+\s*/g, '')          // strip headers (#, ##, ###)
    .replace(/\*\*(.*?)\*\*/g, '$1') // strip bold **text** -> text
    .replace(/\*(.*?)\*/g, '$1')     // strip italic *text* -> text
    .replace(/__(.*?)__/g, '$1')     // strip underline __text__ -> text
    .replace(/_(.*?)_/g, '$1')       // strip italic _text_ -> text
    .replace(/`(.*?)`/g, '$1')       // strip inline code `code` -> code
    .replace(/[\*\_~`#]/g, '')      // strip leftover raw markdown symbols
    .replace(/^[\s-*+>]+/, '')      // strip bullet points and list markers at start
    .replace(/^\[[ xX]\]\s*/, '')   // strip todo checkboxes [ ] or [x]
    .replace(/^[\d]+\.\s*/, '')     // strip numbered list prefixes
    .trim()
}

