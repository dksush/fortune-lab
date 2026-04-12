'use client'

import { useState, useCallback, useRef } from 'react'
import { Hanja } from '@/types'

export interface NameRow {
  id: string
  query: string      // 검색창에 입력한 값
  syllable: string   // 실제 이름 글자 (한 글자 한글)
  selected: Hanja | null
}

interface Props {
  rows: NameRow[]
  onUpdate: (id: string, patch: Partial<NameRow>) => void
  onAddRow: () => void
  onRemoveRow: (id: string) => void
  labels?: string[]
}

const DEBOUNCE_MS = 500

export function HanjaSelector({ rows, onUpdate, onAddRow, onRemoveRow, labels }: Props) {
  const [results, setResults] = useState<Record<string, Hanja[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [searched, setSearched] = useState<Record<string, boolean>>({})
  const [manualInput, setManualInput] = useState<Record<string, string>>({})
  const [activeRowId, setActiveRowId] = useState<string | null>(null)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const search = useCallback(async (id: string, query: string) => {
    const q = query.trim()
    if (!q) return
    setLoading(l => ({ ...l, [id]: true }))
    setSearched(s => ({ ...s, [id]: true }))
    try {
      const hasSpace = q.includes(' ')
      const isSingleKorean = !hasSpace && q.length === 1 && /[가-힣]/.test(q)
      const param = (hasSpace || !isSingleKorean)
        ? `query=${encodeURIComponent(q)}`
        : `reading=${encodeURIComponent(q)}`
      const res = await fetch(`/api/hanja?${param}`)
      const data: Hanja[] = await res.json()
      setResults(r => ({ ...r, [id]: Array.isArray(data) ? data : [] }))
      setActiveRowId(id)
    } catch {
      setResults(r => ({ ...r, [id]: [] }))
    } finally {
      setLoading(l => ({ ...l, [id]: false }))
    }
  }, [])

  const handleQueryChange = useCallback((id: string, value: string) => {
    const koreanChars = value.match(/[가-힣]/g) ?? []
    const syllable = koreanChars[koreanChars.length - 1] ?? ''
    onUpdate(id, { query: value, syllable, selected: null })
    setSearched(s => ({ ...s, [id]: false }))
    setActiveRowId(id)

    clearTimeout(timers.current[id])
    if (!value.trim()) {
      setResults(r => ({ ...r, [id]: [] }))
      return
    }
    timers.current[id] = setTimeout(() => search(id, value), DEBOUNCE_MS)
  }, [onUpdate, search])

  const handleSelect = useCallback((id: string, hanja: Hanja) => {
    onUpdate(id, { selected: hanja, syllable: hanja.reading })
    setActiveRowId(null)
  }, [onUpdate])

  const handleClearHanja = useCallback((id: string) => {
    onUpdate(id, { selected: null })
    setActiveRowId(id)
  }, [onUpdate])

  const handleManualInput = useCallback((id: string, char: string, row: NameRow) => {
    if (!char.trim()) return
    const query = row.query.trim()
    const syllable = row.syllable || ''
    let meaning = ''
    if (query.includes(' ')) {
      const parts = query.split(/\s+/)
      meaning = parts.slice(0, -1).join(' ')
    } else if (syllable && query.endsWith(syllable) && query.length > syllable.length) {
      meaning = query.slice(0, -syllable.length)
    }
    const manual: Hanja = {
      id: `manual-${char}`,
      character: char,
      reading: syllable,
      meaning,
      stroke: 0,
    }
    onUpdate(id, { selected: manual, syllable })
    setActiveRowId(null)
    setManualInput(m => ({ ...m, [id]: '' }))
  }, [onUpdate])

  return (
    <div className="space-y-1">

      {rows.map((row, idx) => {
        const rowResults = results[row.id] ?? []
        const rowLoading = loading[row.id] ?? false
        const rowSearched = searched[row.id] ?? false
        const isActive = activeRowId === row.id

        return (
          <div key={row.id} className="space-y-3 pb-2">
            {/* ── 입력 행: 레이블 + 인풋/칩 + 삭제 ── */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#6D6661] font-medium w-8 shrink-0 text-center">
                {labels?.[idx] ?? String(idx + 1)}
              </span>

              <div className="flex-1">
                {row.selected ? (
                  /* 선택 완료: 한자 칩 */
                  <div
                    className="flex items-center gap-3 rounded-2xl px-4 py-2.5"
                    style={{ background: 'linear-gradient(135deg, #D95D39, #F28C6A)' }}
                  >
                    <span className="text-2xl text-white font-bold leading-none shrink-0">
                      {row.selected.character}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/90 font-semibold">{row.selected.reading}</p>
                      {row.selected.meaning && (
                        <p className="text-[10px] text-white/70 leading-tight truncate">{row.selected.meaning}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleClearHanja(row.id)}
                      className="text-white/60 hover:text-white text-xs shrink-0 transition-colors"
                      aria-label="한자 변경"
                    >
                      변경
                    </button>
                  </div>
                ) : (
                  /* 미선택: 검색 인풋 */
                  <input
                    type="text"
                    value={row.query}
                    onChange={e => handleQueryChange(row.id, e.target.value)}
                    onFocus={() => {
                      if (rowResults.length > 0) setActiveRowId(row.id)
                    }}
                    placeholder={idx === 0 ? '예) 붉을 홍' : '예) 편안할 안'}
                    className="w-full bg-white/60 border border-white/50 rounded-2xl px-4 py-2.5 text-[#2D2926] text-sm placeholder-[#B0A090] focus:outline-none focus:ring-1 focus:ring-[#D95D39]/30 transition-all"
                  />
                )}
              </div>

              {/* 행 삭제 (성 제외) */}
              {idx !== 0 ? (
                <button
                  onClick={() => onRemoveRow(row.id)}
                  className="w-7 h-7 bg-white/60 rounded-full text-[#B0A090] text-sm flex items-center justify-center hover:bg-[#FEE8E1] hover:text-[#D95D39] transition-colors shrink-0"
                  aria-label="이 글자 삭제"
                >
                  ×
                </button>
              ) : (
                <div className="w-7 shrink-0" />
              )}
            </div>

            {/* ── 로딩 ── */}
            {isActive && rowLoading && (
              <p className="text-xs text-[#6D6661] pl-11">검색 중…</p>
            )}

            {/* ── 한자 후보 카드 스트립 ── */}
            {isActive && !rowLoading && rowResults.length > 0 && (
              <div
                className="flex gap-3 overflow-x-auto pb-1 pl-11"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {rowResults.slice(0, 9).map(h => {
                  const isSelected = row.selected?.id === h.id
                  return (
                    <button
                      key={h.id}
                      onClick={() => handleSelect(row.id, h)}
                      className="flex flex-col items-center justify-center min-w-[68px] h-[82px] rounded-2xl shrink-0 transition-all active:scale-95"
                      style={isSelected
                        ? { background: 'linear-gradient(135deg, #D95D39, #F28C6A)' }
                        : { background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.5)' }
                      }
                    >
                      <span className={`text-2xl font-bold leading-none ${isSelected ? 'text-white' : 'text-[#2D2926]'}`}>
                        {h.character}
                      </span>
                      <span className={`text-[10px] mt-1 px-1 text-center leading-tight line-clamp-2 ${isSelected ? 'text-white/80' : 'text-[#6D6661]'}`}>
                        {h.meaning || h.reading}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── 결과 없음 → 직접 입력 ── */}
            {isActive && rowSearched && !rowLoading && rowResults.length === 0 && (
              <div className="pl-11 space-y-2">
                <p className="text-xs text-[#6D6661]">찾는 한자가 없습니다. 직접 붙여넣기 해주세요.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={1}
                    value={manualInput[row.id] ?? ''}
                    onChange={e => setManualInput(m => ({ ...m, [row.id]: e.target.value }))}
                    placeholder="漢"
                    className="w-14 bg-white/60 border border-white/50 rounded-xl px-2 py-2 text-[#2D2926] text-xl text-center focus:outline-none focus:ring-1 focus:ring-[#D95D39]/30 transition-all"
                  />
                  <button
                    onClick={() => handleManualInput(row.id, manualInput[row.id] ?? '', row)}
                    className="px-4 py-2 bg-white/60 border border-white/50 rounded-xl text-[#2D2926] text-sm hover:bg-white/80 transition-colors"
                  >
                    선택
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* ── 글자 추가 ── */}
      {rows.length < 5 && (
        <div className="flex items-center gap-3 pt-1">
          <div className="w-8 shrink-0" />
          <button
            onClick={onAddRow}
            className="text-sm text-[#D95D39] font-semibold hover:opacity-70 transition-opacity"
          >
            + 글자 추가
          </button>
        </div>
      )}
    </div>
  )
}
