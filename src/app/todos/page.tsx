'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { Loader2, CheckSquare } from 'lucide-react'

export default function TodosPageRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/tasks?category=todo')
  }, [router])

  return (
    <AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckSquare size={24} color="#06B6D4" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Opening Unified Tasks & Todos...</div>
        <Loader2 size={20} color="#06B6D4" className="animate-spin" />
      </div>
    </AppShell>
  )
}
