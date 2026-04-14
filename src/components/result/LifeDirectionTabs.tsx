'use client'

import { useState } from 'react'

interface Props {
  talent: string
  wealth: string
  relationships: string
  thisYear?: string
}

type TabKey = 'thisYear' | 'talent' | 'wealth' | 'relationships'

const ALL_TABS: { key: TabKey; label: string }[] = [
  { key: 'thisYear', label: '운세' },
  { key: 'talent', label: '성격' },
  { key: 'wealth', label: '직업·재물' },
  { key: 'relationships', label: '관계' },
]

export function LifeDirectionTabs({ talent, wealth, relationships, thisYear }: Props) {
  const tabs = thisYear ? ALL_TABS : ALL_TABS.filter(t => t.key !== 'thisYear')
  const [active, setActive] = useState<TabKey>(tabs[0].key)

  const content: Record<TabKey, string> = {
    thisYear: thisYear ?? '',
    talent,
    wealth,
    relationships,
  }

  return (
    <div>
      {/* 탭 바 */}
      <div
        className="flex rounded-xl p-1 mb-4 gap-1"
        style={{ background: 'rgba(0,0,0,0.05)' }}
      >
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className="flex-1 py-2 text-xs font-medium rounded-lg transition-all"
            style={
              active === tab.key
                ? {
                    background: '#FFF',
                    color: '#D95D39',
                    fontWeight: 700,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                  }
                : { color: '#6D6661' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <p className="text-sm leading-loose text-[#2D2926] min-h-[80px]">
        {content[active]}
      </p>
    </div>
  )
}
