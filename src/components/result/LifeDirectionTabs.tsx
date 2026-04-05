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
      <div className="flex overflow-hidden border border-[#C4A882]">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              active === tab.key
                ? 'bg-[#3D2B1F] text-[#FAF5EA]'
                : 'bg-[#FAF5EA] text-[#8B7355] hover:bg-[#F0E6CC]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="bg-[#FAF5EA] border border-t-0 border-[#C4A882] p-5 min-h-[120px]">
        <p className="text-sm leading-loose text-[#3D2B1F]">{data[active]}</p>
      </div>
    </div>
  )
}
