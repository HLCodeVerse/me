'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { ChevronRight, Play, CheckCircle2, GraduationCap, BookOpen, Brain, Sparkles, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import type { Course, Lesson, LessonProgress } from '@/lib/supabase/database.types'

interface CourseWithProgress extends Course {
  total_lessons: number
  completed_lessons: number
  modules?: ModuleWithLessons[]
}

interface ModuleWithLessons {
  id: string
  course_id: string
  title: string
  order_index: number
  lessons: (Lesson & { completed: boolean })[]
}

export default function LearnPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [courses, setCourses] = useState<CourseWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCourse, setActiveCourse] = useState<CourseWithProgress | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [explaining, setExplaining] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)

  const loadCourses = useCallback(async () => {
    const { data: coursesData } = await supabase
      .from('courses')
      .select(`*, modules(*, lessons(*))`)
      .order('order_index')

    if (!coursesData) { setLoading(false); return }

    let progress: LessonProgress[] = []
    if (user) {
      const { data } = await supabase.from('lesson_progress').select('*').eq('user_id', user.id)
      progress = data ?? []
    }
    const completedSet = new Set(progress.filter(p => p.status === 'completed').map(p => p.lesson_id))

    const withProgress = (coursesData as unknown as (Course & { modules: (ModuleWithLessons & { lessons: Lesson[] })[] })[]).map(c => {
      const allLessons = c.modules?.flatMap(m => m.lessons ?? []) ?? []
      return {
        ...c,
        total_lessons: allLessons.length,
        completed_lessons: allLessons.filter((l: Lesson) => completedSet.has(l.id)).length,
        modules: c.modules?.map(m => ({
          ...m,
          lessons: m.lessons?.map((l: Lesson) => ({ ...l, completed: completedSet.has(l.id) })) ?? [],
        })) ?? [],
      }
    })
    setCourses(withProgress)
    setLoading(false)
  }, [user, supabase])

  useEffect(() => { loadCourses() }, [loadCourses])

  async function markLessonComplete(lessonId: string) {
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('lesson_progress') as any).upsert({
      user_id: user.id,
      lesson_id: lessonId,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    toast.success('Lesson completed!')
    loadCourses()
  }

  async function askAITutor(lesson: Lesson) {
    setExplaining(true)
    toast.info(`AI Tutor is explaining "${lesson.title}"...`)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Explain the lesson "${lesson.title}" in 3 key actionable takeaways for self-improvement.`
          }],
          enableTools: false
        })
      })

      if (!res.ok) throw new Error('AI Tutor failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let explanationText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content ?? ''
              if (delta) explanationText += delta
            } catch {}
          }
        }
      }

      setAiSummary(explanationText)
      toast.success('AI Tutor summary generated!')
    } catch {
      toast.error('AI Tutor failed')
    } finally {
      setExplaining(false)
    }
  }

  const CATEGORY_COLORS: Record<string, string> = {
    career: '#60A5FA',
    mindset: '#8B5CF6',
    health: '#10B981',
    finance: '#F59E0B',
    skills: '#EC4899',
  }

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GraduationCap size={20} color="#60A5FA" />
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Learning Hub</h1>
          </div>
        </div>
      }
    >
      <div style={{ paddingTop: 16 }}>
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius)', marginBottom: 12 }} />)
        ) : courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <GraduationCap size={28} color="#60A5FA" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No courses available</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Check back soon for new personal growth modules.</p>
          </div>
        ) : !activeCourse ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {courses.map(course => {
              const pct = course.total_lessons > 0 ? Math.round((course.completed_lessons / course.total_lessons) * 100) : 0
              const color = CATEGORY_COLORS[course.category] ?? '#60A5FA'
              return (
                <button
                  key={course.id}
                  onClick={() => setActiveCourse(course)}
                  className="card"
                  style={{
                    display: 'flex', gap: 16, padding: '16px', textAlign: 'left',
                    cursor: 'pointer', border: '1px solid var(--border)', width: '100%',
                    transition: 'border-color 200ms',
                  }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                    background: `${color}18`,
                    border: `1px solid ${color}35`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <BookOpen size={24} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>{course.title}</p>
                      <ChevronRight size={16} color="var(--text-dim)" style={{ flexShrink: 0 }} />
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                      {course.description?.slice(0, 85)}{(course.description?.length ?? 0) > 85 ? '…' : ''}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="progress-track" style={{ flex: 1, height: 5, background: 'var(--surface-3)', borderRadius: 99 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 11, color, fontWeight: 700, flexShrink: 0 }}>
                        {course.completed_lessons}/{course.total_lessons}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : activeLesson ? (
          <div>
            <button
              onClick={() => { setActiveLesson(null); setAiSummary(null) }}
              style={{ fontSize: 13, color: '#60A5FA', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
            >
              <ArrowLeft size={14} /> Back to modules
            </button>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 14, letterSpacing: '-0.01em' }}>{activeLesson.title}</h2>

            <button
              onClick={() => askAITutor(activeLesson)}
              disabled={explaining}
              style={{
                marginBottom: 16, width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)',
                background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                color: '#A78BFA', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              {explaining ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
              {explaining ? 'AI Tutor Analyzing...' : 'Ask AI Tutor to Summarize'}
            </button>

            {aiSummary && (
              <div style={{
                marginBottom: 16, padding: '14px 16px', borderRadius: 'var(--radius)',
                background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Sparkles size={14} color="#A78BFA" />
                  <span style={{ fontSize: 11, color: '#A78BFA', fontWeight: 800, textTransform: 'uppercase' }}>AI Tutor Insights</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {aiSummary}
                </div>
              </div>
            )}

            {activeLesson.resource_url && (
              <div style={{ marginBottom: 16, borderRadius: 'var(--radius)', overflow: 'hidden', aspectRatio: '16/9', background: 'var(--surface-2)' }}>
                <iframe
                  src={activeLesson.resource_url}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            {activeLesson.content && (
              <div style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
                {activeLesson.content}
              </div>
            )}
            <button
              onClick={() => { markLessonComplete(activeLesson.id); setActiveLesson(null); setAiSummary(null) }}
              className="btn btn-primary"
              style={{ width: '100%', height: 48 }}
            >
              <CheckCircle2 size={18} /> Mark Complete
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setActiveCourse(null)}
              style={{ fontSize: 13, color: '#60A5FA', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
            >
              <ArrowLeft size={14} /> All Courses
            </button>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.01em' }}>{activeCourse.title}</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>{activeCourse.description}</p>
            
            <div style={{ marginBottom: 24, padding: '14px 16px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Course Completion</span>
                <span style={{ fontSize: 13, color: '#60A5FA', fontWeight: 700 }}>
                  {activeCourse.completed_lessons}/{activeCourse.total_lessons} lessons
                </span>
              </div>
              <div className="progress-track" style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99 }}>
                <div className="progress-fill" style={{ width: `${activeCourse.total_lessons > 0 ? (activeCourse.completed_lessons / activeCourse.total_lessons) * 100 : 0}%`, background: '#60A5FA', height: '100%', borderRadius: 99 }} />
              </div>
            </div>

            {activeCourse.modules?.map((mod, mIdx) => (
              <div key={mod.id} style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-dim)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Module {mIdx + 1}: {mod.title}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {mod.lessons.map((lesson, lIdx) => (
                    <button
                      key={lesson.id}
                      onClick={() => !lesson.completed && setActiveLesson(lesson)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px',
                        border: `1px solid ${lesson.completed ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)', cursor: lesson.completed ? 'default' : 'pointer',
                        textAlign: 'left', width: '100%',
                        background: lesson.completed ? 'rgba(16,185,129,0.06)' : 'var(--surface)',
                      } as React.CSSProperties}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: lesson.completed ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {lesson.completed
                          ? <CheckCircle2 size={16} color="#10B981" />
                          : <Play size={14} color="var(--text-dim)" />
                        }
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: lesson.completed ? 'var(--text-muted)' : 'var(--text)' }}>
                          {lIdx + 1}. {lesson.title}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{lesson.content_type}</p>
                      </div>
                      {lesson.completed && <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>Done</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
