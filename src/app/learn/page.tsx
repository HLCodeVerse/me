'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import { ChevronRight, Play, CheckCircle2 } from 'lucide-react'
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
    loadCourses()
  }

  const CATEGORY_COLORS: Record<string, string> = {
    career: '#60A5FA',
    mindset: '#A78BFA',
    health: '#34D399',
    finance: '#F59E0B',
    skills: '#FB923C',
  }

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Learn</h1>
        </div>
      }
    >
      <div style={{ paddingTop: 16 }}>
        {loading
          ? [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius)', marginBottom: 12 }} />)
          : courses.length === 0
          ? (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🎓</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No courses yet</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Courses will appear here once added to the platform.</p>
            </div>
          )
          : !activeCourse
          ? (
            /* Course grid */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {courses.map(course => {
                const pct = course.total_lessons > 0 ? Math.round((course.completed_lessons / course.total_lessons) * 100) : 0
                const color = CATEGORY_COLORS[course.category] ?? 'var(--growth)'
                return (
                  <button
                    key={course.id}
                    onClick={() => setActiveCourse(course)}
                    className="card"
                    style={{
                      display: 'flex', gap: 16, padding: '16px', textAlign: 'left',
                      cursor: 'pointer', border: 'none', width: '100%',
                      transition: 'border-color 200ms',
                    }}
                  >
                    <div style={{
                      width: 56, height: 56, borderRadius: 12, flexShrink: 0,
                      background: `${color}20`,
                      border: `1px solid ${color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 26,
                    }}>
                      {course.cover_image ?? '📚'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>{course.title}</p>
                        <ChevronRight size={16} color="var(--text-dim)" style={{ flexShrink: 0 }} />
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                        {course.description?.slice(0, 80)}{(course.description?.length ?? 0) > 80 ? '…' : ''}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="progress-track" style={{ flex: 1 }}>
                          <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
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
          )
          : activeLesson
          ? (
            /* Lesson Detail */
            <div>
              <button
                onClick={() => setActiveLesson(null)}
                style={{ fontSize: 13, color: 'var(--growth)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
              >
                ← Back to modules
              </button>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.01em' }}>{activeLesson.title}</h2>
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
                onClick={() => { markLessonComplete(activeLesson.id); setActiveLesson(null) }}
                className="btn btn-primary"
                style={{ width: '100%', height: 48 }}
              >
                <CheckCircle2 size={18} /> Mark Complete
              </button>
            </div>
          )
          : (
            /* Module list */
            <div>
              <button
                onClick={() => setActiveCourse(null)}
                style={{ fontSize: 13, color: 'var(--growth)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
              >
                ← All Courses
              </button>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.01em' }}>{activeCourse.title}</h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>{activeCourse.description}</p>
              
              {/* Progress */}
              <div style={{ marginBottom: 24, padding: '14px 16px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Progress</span>
                  <span style={{ fontSize: 13, color: 'var(--growth)', fontWeight: 700 }}>
                    {activeCourse.completed_lessons}/{activeCourse.total_lessons} lessons
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${activeCourse.total_lessons > 0 ? (activeCourse.completed_lessons / activeCourse.total_lessons) * 100 : 0}%` }} />
                </div>
              </div>

              {activeCourse.modules?.map((mod, mIdx) => (
                <div key={mod.id} style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
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
                          border: `1px solid ${lesson.completed ? 'rgba(52,211,153,0.2)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-sm)', cursor: lesson.completed ? 'default' : 'pointer',
                          textAlign: 'left', width: '100%',
                          background: lesson.completed ? 'rgba(52,211,153,0.04)' : 'var(--surface)',
                        } as React.CSSProperties}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: lesson.completed ? 'rgba(52,211,153,0.15)' : 'var(--surface-2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {lesson.completed
                            ? <CheckCircle2 size={16} color="var(--growth)" />
                            : <Play size={14} color="var(--text-dim)" />
                          }
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 500, color: lesson.completed ? 'var(--text-muted)' : 'var(--text)' }}>
                            {lIdx + 1}. {lesson.title}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{lesson.content_type}</p>
                        </div>
                        {lesson.completed && <span style={{ fontSize: 11, color: 'var(--growth)', fontWeight: 600 }}>Done</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </AppShell>
  )
}
