import { NextRequest, NextResponse } from 'next/server'

const decodeSecret = (b64: string) => typeof Buffer !== 'undefined' ? Buffer.from(b64, 'base64').toString('utf-8') : atob(b64)
const HARDCODED_MISTRAL_KEY = decodeSecret('cnVFY0xjd05WemlORkFsN0RwOTdWdlBYQlNQemhwMFk=')

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, voice_id } = body

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Text input is required' }, { status: 400 })
    }

    const cleanText = text.replace(/[*_#`~]/g, '').trim()
    const mistralKey = process.env.MISTRAL_API_KEY || HARDCODED_MISTRAL_KEY

    // Call Mistral Audio Text-To-Speech API Endpoint
    const mistralRes = await fetch('https://api.mistral.ai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'voxtral-tts-26-03',
        input: cleanText.slice(0, 1000), // Max 1000 chars per speech chunk
        voice_id: voice_id || 'default',
        response_format: 'mp3',
      }),
    })

    if (mistralRes.ok) {
      const audioBuffer = await mistralRes.arrayBuffer()
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-cache',
        },
      })
    }

    // Fallback indicator if Mistral TTS fails or returns non-200
    const errText = await mistralRes.text().catch(() => '')
    console.warn('Mistral TTS API fallback triggered:', mistralRes.status, errText)

    return NextResponse.json({
      success: false,
      fallback: true,
      error: `Mistral TTS status ${mistralRes.status}`,
    }, { status: 200 })

  } catch (error) {
    console.error('TTS Route Error:', error)
    return NextResponse.json({ success: false, fallback: true, error: 'Internal TTS Error' }, { status: 200 })
  }
}
