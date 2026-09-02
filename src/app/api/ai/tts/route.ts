export const dynamic = 'force-static'
import { NextRequest, NextResponse } from 'next/server'

// Helper to sanitize text for 100% human-like natural speech (removes emojis, markdown, symbols, dashes)
function sanitizeTextForHumanSpeech(raw: string): string {
  if (!raw) return ''
  return raw
    .replace(/```[\s\S]*?```/g, '') // remove code blocks
    .replace(/`([^`]+)`/g, '$1')     // remove inline code
    // Remove all Emojis (Unicode ranges)
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}]/gu, '')
    // Remove bullet points, dashes, hashes, asterisks, underscores, tildes, brackets
    .replace(/[*_#~>•\-[\]()]/g, ' ')
    // Collapse multiple spaces/newlines
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text } = body

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Text input is required' }, { status: 400 })
    }

    const cleanText = sanitizeTextForHumanSpeech(text)
    if (!cleanText) {
      return NextResponse.json({ error: 'No speakable text found' }, { status: 400 })
    }

    // 1. Primary: High-fidelity Human Voice Audio Stream (Google TTS Engine)
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText.slice(0, 300))}&tl=en&client=tw-ob`
    
    const audioRes = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    })

    if (audioRes.ok) {
      const audioBuffer = await audioRes.arrayBuffer()
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400',
        },
      })
    }

    // 2. Fallback to Gemini Audio / Gemini TTS
    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey) {
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Read this naturally: "${cleanText.slice(0, 300)}"` }] }],
        }),
      })

      if (geminiRes.ok) {
        const data = await geminiRes.json()
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (candidateText) {
          const secondTryUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(candidateText.slice(0, 300))}&tl=en&client=tw-ob`
          const secondAudio = await fetch(secondTryUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
          if (secondAudio.ok) {
            const buf = await secondAudio.arrayBuffer()
            return new NextResponse(buf, { headers: { 'Content-Type': 'audio/mpeg' } })
          }
        }
      }
    }

    return NextResponse.json({ success: false, fallback: true }, { status: 200 })

  } catch (error) {
    console.error('TTS API Route Error:', error)
    return NextResponse.json({ success: false, fallback: true }, { status: 200 })
  }
}
