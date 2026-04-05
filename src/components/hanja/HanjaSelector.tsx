'use client'

import { useState, useCallback, useRef } from 'react'
import { Hanja } from '@/types'

export interface NameRow {
  id: string
  query: string      // 검색창에 입력한 값 ("편안할 안" 또는 "안")
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
  // 상태 키: 숫자 인덱스 대신 row.id 사용 → 삭제/추가 시 오동작 없음
  const [results, setResults] = useState<Record<string, Hanja[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [searched, setSearched] = useState<Record<string, boolean>>({})
  const [manualInput, setManualInput] = useState<Record<string, string>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const search = useCallback(async (id: string, query: string) => {
    const q = query.trim()
    if (!q) return
    setLoading(l => ({ ...l, [id]: true }))
    setSearched(s => ({ ...s, [id]: true }))
    try {
      // "편안할 안" 형태면 query 파라미터, 단일 글자면 reading 파라미터
      const hasSpace = q.includes(' ')
      const isSingleKorean = !hasSpace && q.length === 1 && /[가-힣]/.test(q)
      const param = (hasSpace || !isSingleKorean)
        ? `query=${encodeURIComponent(q)}`
        : `reading=${encodeURIComponent(q)}`
      const res = await fetch(`/api/hanja?${param}`)
      const data: Hanja[] = await res.json()
      setResults(r => ({ ...r, [id]: Array.isArray(data) ? data : [] }))
      setOpen(o => ({ ...o, [id]: true }))
    } catch {
      setResults(r => ({ ...r, [id]: [] }))
    } finally {
      setLoading(l => ({ ...l, [id]: false }))
    }
  }, [])

  const handleQueryChange = useCallback((id: string, value: string) => {
    // 쿼리 업데이트
    // syllable: 한글 단일 글자 추출 (마지막 한글 글자)
    const koreanChars = value.match(/[가-힣]/g) ?? []
    const syllable = koreanChars[koreanChars.length - 1] ?? ''
    onUpdate(id, { query: value, syllable, selected: null })

    // 결과 초기화
    setOpen(o => ({ ...o, [id]: false }))
    setSearched(s => ({ ...s, [id]: false }))

    clearTimeout(timers.current[id])
    if (!value.trim()) {
      setResults(r => ({ ...r, [id]: [] }))
      return
    }
    timers.current[id] = setTimeout(() => search(id, value), DEBOUNCE_MS)
  }, [onUpdate, search])

  const handleSelect = useCallback((id: string, hanja: Hanja) => {
    onUpdate(id, { selected: hanja, syllable: hanja.reading })
    setOpen(o => ({ ...o, [id]: false }))
  }, [onUpdate])

  const handleClearHanja = useCallback((id: string) => {
    // 한자 선택만 해제 — 인풋 행은 유지
    onUpdate(id, { selected: null })
  }, [onUpdate])

  const handleManualInput = useCallback((id: string, char: string, row: NameRow) => {
    if (!char.trim()) return

    const query = row.query.trim()
    const syllable = row.syllable || ''
    let meaning = ''

    if (query.includes(' ')) {
      // "편안할 안" 형태 — 공백 기준 분리
      const parts = query.split(/\s+/)
      meaning = parts.slice(0, -1).join(' ')
    } else if (syllable && query.endsWith(syllable) && query.length > syllable.length) {
      // "솥귀현" 형태 — 마지막 글자가 음독, 나머지가 훈
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
    setOpen(o => ({ ...o, [id]: false }))
    setManualInput(m => ({ ...m, [id]: '' }))
  }, [onUpdate])

  return (
    <div className="space-y-4">
      {rows.map((row, idx) => {
        const id = row.id
        const isFirst = idx === 0
        return (
          <div key={id} className="space-y-2">
            {/* 입력 행 */}
            <div className="flex items-center gap-2">
              {/* 레이블 */}
              <span className="text-[#8B5A2B] text-xs w-8 shrink-0 text-center font-medium">
                {labels?.[idx] ?? String(idx + 1)}
              </span>

              {/* 검색 인풋 */}
              <input
                type="text"
                value={row.query}
                onChange={e => handleQueryChange(id, e.target.value)}
                placeholder={isFirst ? '예) 붉을 홍' : '예) 편안할 안'}
                className="flex-1 bg-[#FAF5EA] border border-[#C4A882] rounded-lg px-3 py-2.5 text-[#2C1A0E] text-sm placeholder-[#C4A882] focus:outline-none focus:border-[#8B5A2B] transition-colors"
              />

              {/* 선택된 한자 칩 */}
              {row.selected && (
                <div className="flex items-center gap-1 px-2.5 py-1.5 border border-[#C4973A] rounded-lg bg-[#FFF9ED] shrink-0">
                  <span className="text-xl text-[#2C1A0E] font-bold leading-none">{row.selected.character}</span>
                  {row.selected.meaning && (
                    <span className="text-[10px] text-[#8B5A2B] leading-tight max-w-[40px] line-clamp-1">
                      {row.selected.meaning}
                    </span>
                  )}
                  {/* X: 한자 선택만 해제, 행 삭제 아님 */}
                  <button
                    onClick={() => handleClearHanja(id)}
                    className="text-[#B0A090] hover:text-[#8B5A2B] ml-1 text-xs leading-none"
                    aria-label="한자 선택 취소"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* 행 삭제: 첫 번째 행(성)은 없음, 나머지는 항상 표시 */}
              {idx === 0 ? (
                <div className="w-5 shrink-0" />
              ) : (
                <button
                  onClick={() => onRemoveRow(id)}
                  className="text-[#C4A882] hover:text-[#8B5A2B] text-xs shrink-0 px-1 w-5 text-center"
                  aria-label="이 글자 삭제"
                >
                  −
                </button>
              )}
            </div>

            {/* 한자 후보 */}
            {open[id] && results[id]?.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 pl-6">
                {results[id].slice(0, 9).map(h => (
                  <button
                    key={h.id}
                    onClick={() => handleSelect(id, h)}
                    className={`flex flex-col items-center py-2 px-1 rounded-lg border text-center transition-colors ${
                      row.selected?.id === h.id
                        ? 'border-[#C4973A] bg-[#FFF9ED]'
                        : 'border-[#DDD0BB] bg-white hover:border-[#C4A882]'
                    }`}
                  >
                    <span className="text-2xl text-[#2C1A0E] leading-none">{h.character}</span>
                    <span className="text-[10px] text-[#8B5A2B] mt-0.5 leading-tight line-clamp-1">
                      {h.meaning} {h.reading}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* 결과 없음 → 직접 입력 */}
            {searched[id] && !loading[id] && results[id]?.length === 0 && (
              <div className="pl-6 space-y-1.5">
                <p className="text-xs text-[#8B7355]">
                  찾는 한자가 없습니다. 직접 붙여넣기 해주세요.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={1}
                    value={manualInput[id] ?? ''}
                    onChange={e => setManualInput(m => ({ ...m, [id]: e.target.value }))}
                    placeholder="漢"
                    className="w-14 bg-[#FAF5EA] border border-[#C4A882] rounded-lg px-2 py-2 text-[#2C1A0E] text-xl text-center focus:outline-none focus:border-[#8B5A2B] transition-colors"
                  />
                  <button
                    onClick={() => handleManualInput(id, manualInput[id] ?? '', row)}
                    className="px-3 py-2 border border-[#C4973A] rounded-lg text-[#3D2B1F] text-sm hover:bg-[#FAF5EA] transition-colors"
                  >
                    선택
                  </button>
                </div>
              </div>
            )}

            {/* 로딩 */}
            {loading[id] && (
              <p className="text-xs text-[#B0A090] pl-6">검색 중…</p>
            )}
          </div>
        )
      })}

      {/* 글자 추가 */}
      {rows.length < 5 && (
        <button
          onClick={onAddRow}
          className="flex items-center gap-1 text-sm text-[#8B5A2B] hover:text-[#3D2B1F] border-b border-dashed border-[#C4A882] pb-0.5 transition-colors ml-5"
        >
          + 글자 추가
        </button>
      )}
    </div>
  )
}
