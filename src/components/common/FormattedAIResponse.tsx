'use client'

import React from 'react'
import { Sparkles, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface FormattedAIResponseProps {
  content: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Universal Markdown Formatter for NIRMAAN AI Responses
 * Parses headers (#, ##, ###), bold (**text**), italics (*text*),
 * lists (- or * or 1.), code blocks, and artifacts into rich, beautiful HTML elements.
 */
export default function FormattedAIResponse({ content, className = '', style }: FormattedAIResponseProps) {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null)

  if (!content) return null

  // 1. Helper to parse inline markdown (bold, italic, inline code)
  const parseInlineMarkdown = (text: string): React.ReactNode[] => {
    if (!text) return []

    // Tokenize for bold (**text**), italic (*text*), and inline code (`text`)
    const regex = /(\*\*(.*?)\*\*|\*(.*?)\*|`(.*?)`)/g
    const elements: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    let keyIdx = 0

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        elements.push(text.substring(lastIndex, match.index))
      }

      const fullMatch = match[0]
      const boldText = match[2]
      const italicText = match[3]
      const codeText = match[4]

      if (boldText !== undefined) {
        elements.push(
          <strong key={keyIdx++} style={{ fontWeight: 800, color: '#FFFFFF' }}>
            {boldText}
          </strong>
        )
      } else if (italicText !== undefined) {
        elements.push(
          <em key={keyIdx++} style={{ fontStyle: 'italic', color: '#F3F4F6' }}>
            {italicText}
          </em>
        )
      } else if (codeText !== undefined) {
        elements.push(
          <code
            key={keyIdx++}
            style={{
              padding: '2px 6px',
              borderRadius: 6,
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#FFD700',
              fontSize: '0.9em',
              fontFamily: 'Consolas, Monaco, monospace',
            }}
          >
            {codeText}
          </code>
        )
      }

      lastIndex = regex.lastIndex
    }

    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex))
    }

    return elements.length > 0 ? elements : [text]
  }

  // 2. Extract Artifacts (<<<ARTIFACT:title:type>>>...<<<END_ARTIFACT>>>)
  const artifactRegex = /<<<ARTIFACT:(.*?):(.*?)\>>>([\s\S]*?)<<<END_ARTIFACT\>>>/g
  const blocks: Array<{ type: 'text' | 'artifact' | 'codeblock'; content: string; title?: string; artifactType?: string; lang?: string }> = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = artifactRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'text', content: content.substring(lastIndex, match.index) })
    }
    blocks.push({
      type: 'artifact',
      title: match[1].trim(),
      artifactType: match[2].trim(),
      content: match[3].trim(),
    })
    lastIndex = artifactRegex.lastIndex
  }
  if (lastIndex < content.length) {
    blocks.push({ type: 'text', content: content.substring(lastIndex) })
  }

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className={`formatted-ai-response ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      {blocks.map((block, blockIdx) => {
        if (block.type === 'artifact') {
          return (
            <div
              key={blockIdx}
              style={{
                margin: '12px 0',
                padding: '14px 16px',
                borderRadius: 14,
                background: 'rgba(245, 158, 11, 0.08)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} color="#FFD700" />
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>
                    {block.title || 'AI Artifact'}
                  </span>
                  {block.artifactType && (
                    <span className="badge badge-warning" style={{ fontSize: 10 }}>
                      {block.artifactType}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => copyText(block.content, blockIdx)}
                  style={{
                    background: '#121318',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: 11,
                    cursor: 'pointer',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 700,
                  }}
                >
                  {copiedIndex === blockIdx ? <Check size={12} color="#10B981" /> : <Copy size={12} color="#F59E0B" />}
                  {copiedIndex === blockIdx ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre
                style={{
                  background: '#0A0B0D',
                  padding: '12px 14px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontFamily: 'Consolas, Monaco, monospace',
                  color: '#E5E7EB',
                  margin: 0,
                  maxHeight: 280,
                  overflowY: 'auto',
                  lineHeight: 1.5,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {block.content}
              </pre>
            </div>
          )
        }

        // Text Processing & Line Parsing
        const lines = block.content.split('\n')
        return (
          <div key={blockIdx} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lines.map((rawLine, lIdx) => {
              const line = rawLine.trim()
              if (!line) return <div key={lIdx} style={{ height: 4 }} />

              // H1 Header (# Heading)
              if (line.startsWith('# ')) {
                const headerText = line.replace(/^#\s*/, '')
                return (
                  <h1
                    key={lIdx}
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: '#FFD700',
                      margin: '10px 0 4px',
                      letterSpacing: '-0.01em',
                      borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
                      paddingBottom: 4,
                    }}
                  >
                    {parseInlineMarkdown(headerText)}
                  </h1>
                )
              }

              // H2 Header (## Heading)
              if (line.startsWith('## ')) {
                const headerText = line.replace(/^##\s*/, '')
                return (
                  <h2
                    key={lIdx}
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: '#FFFFFF',
                      margin: '8px 0 2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span style={{ color: '#F59E0B' }}>▌</span>
                    {parseInlineMarkdown(headerText)}
                  </h2>
                )
              }

              // H3 Header (### Heading)
              if (line.startsWith('### ')) {
                const headerText = line.replace(/^###\s*/, '')
                return (
                  <h3
                    key={lIdx}
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#F59E0B',
                      margin: '6px 0 2px',
                    }}
                  >
                    {parseInlineMarkdown(headerText)}
                  </h3>
                )
              }

              // Bullet Points (- item or * item)
              if (line.startsWith('- ') || line.startsWith('* ')) {
                const bulletText = line.replace(/^[-*]\s*/, '')
                return (
                  <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingLeft: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', marginTop: 7, flexShrink: 0, boxShadow: '0 0 6px #F59E0B' }} />
                    <div style={{ flex: 1, fontSize: 13.5, color: '#F3F4F6', lineHeight: 1.6 }}>
                      {parseInlineMarkdown(bulletText)}
                    </div>
                  </div>
                )
              }

              // Numbered List (1. item, 2. item)
              const numberedMatch = line.match(/^(\d+)\.\s+(.*)/)
              if (numberedMatch) {
                const num = numberedMatch[1]
                const listText = numberedMatch[2]
                return (
                  <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingLeft: 4 }}>
                    <span
                      style={{
                        minWidth: 20,
                        height: 20,
                        borderRadius: 6,
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#FFD700',
                        fontSize: 11,
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 1,
                        flexShrink: 0,
                      }}
                    >
                      {num}
                    </span>
                    <div style={{ flex: 1, fontSize: 13.5, color: '#F3F4F6', lineHeight: 1.6 }}>
                      {parseInlineMarkdown(listText)}
                    </div>
                  </div>
                )
              }

              // Blockquotes (> quote)
              if (line.startsWith('> ')) {
                const quoteText = line.replace(/^>\s*/, '')
                return (
                  <blockquote
                    key={lIdx}
                    style={{
                      margin: '6px 0',
                      padding: '8px 14px',
                      borderLeft: '4px solid #F59E0B',
                      background: 'rgba(245, 158, 11, 0.08)',
                      borderRadius: '0 10px 10px 0',
                      fontSize: 13,
                      fontStyle: 'italic',
                      color: '#FFFFFF',
                    }}
                  >
                    {parseInlineMarkdown(quoteText)}
                  </blockquote>
                )
              }

              // Normal Paragraph Line
              return (
                <p key={lIdx} style={{ fontSize: 13.5, color: '#F3F4F6', lineHeight: 1.6, margin: 0 }}>
                  {parseInlineMarkdown(line)}
                </p>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
