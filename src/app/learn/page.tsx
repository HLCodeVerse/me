'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/layout/AppShell'
import FormattedAIResponse from '@/components/common/FormattedAIResponse'
import { ChevronRight, Play, CheckCircle2, GraduationCap, BookOpen, Brain, Sparkles, Loader2, ArrowLeft, Plus, Trash2, X } from 'lucide-react'
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

  // Create Course Modal State
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [newCourseTitle, setNewCourseTitle] = useState('')
  const [newCourseDesc, setNewCourseDesc] = useState('')
  const [newCourseCategory, setNewCourseCategory] = useState<'mindset' | 'skills' | 'career' | 'health' | 'finance'>('mindset')
  const [savingCourse, setSavingCourse] = useState(false)

  // Create Lesson Modal State
  const [showLessonForm, setShowLessonForm] = useState(false)
  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [newLessonContent, setNewLessonContent] = useState('')
  const [newLessonResourceUrl, setNewLessonResourceUrl] = useState('')
  const [savingLesson, setSavingLesson] = useState(false)

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

  async function createCourse(e: React.FormEvent) {
    e.preventDefault()
    if (!newCourseTitle.trim() || !user) return
    setSavingCourse(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: createdCourse, error } = await (supabase.from('courses') as any).insert({
        title: newCourseTitle.trim(),
        description: newCourseDesc.trim() || null,
        category: newCourseCategory,
        order_index: courses.length + 1,
      }).select().single()

      if (error) throw error

      // Create default core module
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('modules') as any).insert({
        course_id: createdCourse.id,
        title: 'Core Fundamentals',
        order_index: 1,
      })

      toast.success('Course created! 🎉')
      setNewCourseTitle('')
      setNewCourseDesc('')
      setShowCourseForm(false)
      loadCourses()
    } catch {
      toast.error('Failed to create course')
    } finally {
      setSavingCourse(false)
    }
  }

  async function createLesson(e: React.FormEvent) {
    e.preventDefault()
    if (!newLessonTitle.trim() || !activeCourse || !user) return
    setSavingLesson(true)
    try {
      let targetModuleId = activeCourse.modules?.[0]?.id

      if (!targetModuleId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newMod } = await (supabase.from('modules') as any).insert({
          course_id: activeCourse.id,
          title: 'Core Fundamentals',
          order_index: 1,
        }).select().single()
        targetModuleId = newMod.id
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('lessons') as any).insert({
        module_id: targetModuleId,
        title: newLessonTitle.trim(),
        content: newLessonContent.trim() || null,
        resource_url: newLessonResourceUrl.trim() || null,
        content_type: 'article',
        order_index: 1,
      })

      toast.success('Lesson added!')
      setNewLessonTitle('')
      setNewLessonContent('')
      setNewLessonResourceUrl('')
      setShowLessonForm(false)
      loadCourses()
    } catch {
      toast.error('Failed to add lesson')
    } finally {
      setSavingLesson(false)
    }
  }

  async function deleteCourse(courseId: string) {
    if (!confirm('Are you sure you want to delete this course?')) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('courses') as any).delete().eq('id', courseId)
    setActiveCourse(null)
    toast.success('Course deleted')
    loadCourses()
  }

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
    career: '#3B82F6',
    mindset: '#7C3AED',
    health: '#10B981',
    finance: '#F59E0B',
    skills: '#EC4899',
  }

  return (
    <AppShell
      header={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GraduationCap size={20} color="#7C3AED" />
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Learning Hub</h1>
          </div>
          <button onClick={() => setShowCourseForm(true)} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}>
            <Plus size={15} /> Create Course
          </button>
        </div>
      }
    >
      <div style={{ paddingTop: 8 }}>
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-card)', marginBottom: 12 }} />)
        ) : courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <GraduationCap size={28} color="#7C3AED" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No courses available</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 300, margin: '0 auto 20px' }}>Create custom learning paths to structure your skill acquisition.</p>
            <button onClick={() => setShowCourseForm(true)} className="btn btn-primary">
              <Plus size={15} /> Create First Course
            </button>
          </div>
        ) : !activeCourse ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {courses.map(course => {
              const pct = course.total_lessons > 0 ? Math.round((course.completed_lessons / course.total_lessons) * 100) : 0
              const color = CATEGORY_COLORS[course.category] ?? '#7C3AED'
              return (
                <div
                  key={course.id}
                  onClick={() => setActiveCourse(course)}
                  className="card"
                  style={{
                    display: 'flex', gap: 16, padding: '18px', textAlign: 'left',
                    cursor: 'pointer', border: '1px solid var(--border)', width: '100%',
                    transition: 'all 150ms ease',
                  }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                    background: `${color}15`,
                    border: `1px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <BookOpen size={24} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>{course.title}</p>
                      <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 12px', lineHeight: 1.5 }}>
                      {course.description?.slice(0, 85)}{(course.description?.length ?? 0) > 85 ? '…' : ''}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 12, color, fontWeight: 700, flexShrink: 0 }}>
                        {course.completed_lessons}/{course.total_lessons} lessons
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : activeLesson ? (
          <div>
            <button
              onClick={() => { setActiveLesson(null); setAiSummary(null) }}
              style={{ fontSize: 13, color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
            >
              <ArrowLeft size={14} /> Back to modules
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>{activeLesson.title}</h2>

            <button
              onClick={() => askAITutor(activeLesson)}
              disabled={explaining}
              className="btn btn-secondary"
              style={{
                marginBottom: 16, width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-btn)',
                border: '1px solid #7C3AED', color: '#7C3AED', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              {explaining ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
              {explaining ? 'AI Tutor Analyzing...' : 'Ask AI Tutor to Summarize'}
            </button>

            {aiSummary && (
              <div style={{
                marginBottom: 16, padding: '14px 16px', borderRadius: 'var(--radius-card)',
                background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Sparkles size={14} color="#7C3AED" />
                  <span style={{ fontSize: 11, color: '#7C3AED', fontWeight: 700, textTransform: 'uppercase' }}>AI Tutor Insights</span>
                </div>
                <FormattedAIResponse content={aiSummary} />
              </div>
            )}

            {activeLesson.resource_url && (
              <div style={{ marginBottom: 16, borderRadius: 'var(--radius-card)', overflow: 'hidden', aspectRatio: '16/9', background: 'var(--surface-2)' }}>
                <iframe
                  src={activeLesson.resource_url}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            {activeLesson.content && (
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                {activeLesson.content}
              </div>
            )}
            <button
              onClick={() => { markLessonComplete(activeLesson.id); setActiveLesson(null); setAiSummary(null) }}
              className="btn btn-primary"
              style={{ width: '100%', height: 44 }}
            >
              <CheckCircle2 size={18} /> Mark Complete
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <button
                onClick={() => setActiveCourse(null)}
                style={{ fontSize: 13, color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
              >
                <ArrowLeft size={14} /> All Courses
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowLessonForm(true)}
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  <Plus size={14} /> Add Lesson
                </button>
                <button
                  onClick={() => deleteCourse(activeCourse.id)}
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', borderRadius: 'var(--radius-btn)', padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>{activeCourse.title}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>{activeCourse.description}</p>
            
            <div className="card" style={{ marginBottom: 24, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Course Completion</span>
                <span style={{ fontSize: 13, color: '#7C3AED', fontWeight: 700 }}>
                  {activeCourse.completed_lessons}/{activeCourse.total_lessons} lessons
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${activeCourse.total_lessons > 0 ? (activeCourse.completed_lessons / activeCourse.total_lessons) * 100 : 0}%`, background: '#7C3AED', height: '100%', borderRadius: 99 }} />
              </div>
            </div>

            {activeCourse.modules?.map((mod, mIdx) => (
              <div key={mod.id} style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                  Module {mIdx + 1}: {mod.title}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {mod.lessons.map((lesson, lIdx) => (
                    <button
                      key={lesson.id}
                      onClick={() => !lesson.completed && setActiveLesson(lesson)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px',
                        border: `1px solid ${lesson.completed ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-btn)', cursor: lesson.completed ? 'default' : 'pointer',
                        textAlign: 'left', width: '100%',
                        background: lesson.completed ? 'rgba(16,185,129,0.06)' : 'var(--surface-2)',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: lesson.completed ? 'rgba(16,185,129,0.15)' : 'var(--surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {lesson.completed
                          ? <CheckCircle2 size={16} color="#10B981" />
                          : <Play size={14} color="var(--text-muted)" />
                        }
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: lesson.completed ? 'var(--text-muted)' : 'var(--text-primary)', margin: 0 }}>
                          {lIdx + 1}. {lesson.title}
                        </p>
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

      {/* Create Course Modal */}
      {showCourseForm && (
        <>
          <div className="overlay" onClick={() => setShowCourseForm(false)} />
          <div className="animate-fade-in" style={{
            position: 'fixed', inset: 0, zIndex: 110,
            background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Create New Course</h3>
              <button onClick={() => setShowCourseForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>
            <form onSubmit={createCourse} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>COURSE TITLE</label>
                <input placeholder="e.g. Master Deep Work & Focus" value={newCourseTitle} onChange={e => setNewCourseTitle(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>CATEGORY</label>
                <select value={newCourseCategory} onChange={e => setNewCourseCategory(e.target.value as 'mindset' | 'skills' | 'career' | 'health' | 'finance')}>
                  <option value="mindset">Mindset</option>
                  <option value="skills">Skills</option>
                  <option value="career">Career</option>
                  <option value="health">Health</option>
                  <option value="finance">Finance</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>DESCRIPTION</label>
                <textarea placeholder="Course overview and objectives..." value={newCourseDesc} onChange={e => setNewCourseDesc(e.target.value)} rows={3} style={{ resize: 'none' }} />
              </div>
              <button type="submit" disabled={savingCourse} className="btn btn-primary" style={{ marginTop: 'auto', height: 44 }}>
                {savingCourse ? <Loader2 size={16} className="animate-spin" /> : 'Save Course'}
              </button>
            </form>
          </div>
        </>
      )}

      {/* Add Lesson Modal */}
      {showLessonForm && (
        <>
          <div className="overlay" onClick={() => setShowLessonForm(false)} />
          <div className="animate-fade-in" style={{
            position: 'fixed', inset: 0, zIndex: 110,
            background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Add Lesson</h3>
              <button onClick={() => setShowLessonForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>
            <form onSubmit={createLesson} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>LESSON TITLE</label>
                <input placeholder="e.g. Eliminating Friction in Habits" value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>LESSON CONTENT / NOTES</label>
                <textarea placeholder="Lesson summary, takeaways, or study material..." value={newLessonContent} onChange={e => setNewLessonContent(e.target.value)} rows={4} style={{ resize: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>RESOURCE OR EMBED URL (OPTIONAL)</label>
                <input placeholder="e.g. https://www.youtube.com/embed/..." value={newLessonResourceUrl} onChange={e => setNewLessonResourceUrl(e.target.value)} />
              </div>
              <button type="submit" disabled={savingLesson} className="btn btn-primary" style={{ marginTop: 'auto', height: 44 }}>
                {savingLesson ? <Loader2 size={16} className="animate-spin" /> : 'Save Lesson'}
              </button>
            </form>
          </div>
        </>
      )}
    </AppShell>
  )
}
