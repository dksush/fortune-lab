'use client'

import { useState, useCallback } from 'react'
import { Hanja } from '@/types'

interface Props {
  syllables: string[]
  onSelect: (syllableIndex: number, hanja: Hanja | null) => void
  selected: (Hanja | null)[]
}

export function HanjaSelector({ syllables, onSelect, selected }: Props) {
  const [results, setResults] = useState<Record<number, Hanja[]>>({})
  const [loading, setLoading] = useState<Record<number, boolean>>({})
  const [queries, setQueries] = useState<Record<number, string>>({})

  const search = useCallback(async (index: number, reading: string) => {
    if (!reading.trim()) return
    setLoading(l => ({ ...l, [index]: true }))
    try {
      const isDetailed = reading.includes(' ')
      const param = isDetailed ? `query=${encodeURIComponent(reading)}` : `reading=${encodeURIComponent(reading)}`
      const res = await fetch(`/api/hanja?${param}`)
      const data = await res.json()
      setResults(r => ({ ...r, [index]: data }))
    } finally {
      setLoading(l => ({ ...l, [index]: false }))
    }
  }, [])

  return (
    <div className="space-y-4">
      {syllables.map((syllable, i) => (
        <div key={i} className="border border-purple-800 rounded-xl p-4 bg-purple-950/30">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl font-bold text-white">{syllable}</span>
            {selected[i] && (
              <span className="text-gold-400 text-lg">
                {selected[i]!.character} ({selected[i]!.meaning} {selected[i]!.reading})
              </span>
            )}
          </div>

          {/* 검색 */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder={`음독 검색 (예: ${syllable}) 또는 "맑을 ${syllable}"`}
              defaultValue={syllable}
              onChange={e => setQueries(q => ({ ...q, [i]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && search(i, queries[i] ?? syllable)}
              className="flex-1 bg-purple-900/50 border border-purple-700 rounded-lg px-3 py-2 text-white text-sm placeholder-purple-400 focus:outline-none focus:border-gold-400"
            />
            <button
              onClick={() => search(i, queries[i] ?? syllable)}
              disabled={loading[i]}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loading[i] ? '...' : '검색'}
            </button>
          </div>

          {/* 결과 리스트 */}
          {results[i] && (
            <div className="grid grid-cols-2 gap-2">
              {results[i].map(h => (
                <button
                  key={h.id}
                  onClick={() => onSelect(i, selected[i]?.id === h.id ? null : h)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    selected[i]?.id === h.id
                      ? 'border-yellow-400 bg-yellow-400/10 text-yellow-300'
                      : 'border-purple-700 hover:border-purple-500 text-purple-200'
                  }`}
                >
                  <span className="text-lg mr-2">{h.character}</span>
                  <span className="text-xs text-purple-400">{h.meaning} · {h.stroke}획</span>
                </button>
              ))}
              <button
                onClick={() => onSelect(i, null)}
                className="text-left px-3 py-2 rounded-lg border border-purple-800 hover:border-purple-600 text-purple-400 text-sm transition-colors"
              >
                한글만 사용
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
