'use client'

import { useState } from 'react'

interface LifeDirection {
  talent: string
  wealth: string
  relationships: string
}

const TABS: { key: keyof LifeDirection; label: string }[] = [
  { key: 'talent', label: '재능·적성' },
  { key: 'wealth', label: '재물·직업' },
  { key: 'relationships', label: '인간관계' },
]

export function LifeDirectionTabs({ data }: { data: LifeDirection }) {
  const [active, setActive] = useState<keyof LifeDirection>('talent')

  return (
    <div>
      <div className="flex overflow-hidden rounded-t-2xl border border-white/40"
        style={{ background: 'rgba(255,255,255,0.3)' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              active === tab.key
                ? 'text-white'
                : 'text-[#6D6661] hover:text-[#D95D39]'
            }`}
            style={active === tab.key ? {
              background: 'linear-gradient(to right, #D95D39, #F28C6A)',
            } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="rounded-b-2xl border border-t-0 border-white/40 p-5 min-h-[120px]"
        style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(16px)' }}>
        <p className="text-sm leading-loose text-[#2D2926]">{data[active]}</p>
      </div>
    </div>
  )
}
