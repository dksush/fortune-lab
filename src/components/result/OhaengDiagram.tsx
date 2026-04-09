import type { ElementCount } from '@/lib/saju'

interface Props {
  elements: ElementCount
  yongsin?: string  // 강조할 용신 오행 (예: '水')
}

// 오각형 꼭짓점 (center 150,145 / radius 90)
// 순서: 木(상단) → 火(우상) → 土(우하) → 金(좌하) → 水(좌상) [시계방향 = 상생 방향]
const NODES: { el: keyof ElementCount; x: number; y: number; labelX: number; labelY: number; textAnchor: string }[] = [
  { el: '木', x: 150, y:  55, labelX: 150, labelY:  18, textAnchor: 'middle' },
  { el: '火', x: 236, y: 112, labelX: 273, labelY: 116, textAnchor: 'start'  },
  { el: '土', x: 203, y: 213, labelX: 222, labelY: 244, textAnchor: 'middle' },
  { el: '金', x:  97, y: 213, labelX:  78, labelY: 244, textAnchor: 'middle' },
  { el: '水', x:  64, y: 112, labelX:  27, labelY: 116, textAnchor: 'end'    },
]

// 상생(生): 木→火→土→金→水→木 (오각형 외곽 화살표)
const SAENGSHENG = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 0],
] as [number, number][]

// 상극(克): 木→土, 土→水, 水→火, 火→金, 金→木 (별 모양 화살표)
const SANGKEUK = [
  [0, 2], [2, 4], [4, 1], [1, 3], [3, 0],
] as [number, number][]

const ELEMENT_COLOR: Record<string, string> = {
  木: '#4CAF50', 火: '#EF5350', 土: '#FF9800', 金: '#9E9E9E', 水: '#2196F3',
}

const NODE_R = 26

/** (x1,y1) → (x2,y2) 선을 원 테두리에서 시작/끝나도록 단축 */
function trimLine(x1: number, y1: number, x2: number, y2: number, r: number) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  const ux = dx / len, uy = dy / len
  return {
    x1: x1 + ux * r, y1: y1 + uy * r,
    x2: x2 - ux * r, y2: y2 - uy * r,
  }
}

export function OhaengDiagram({ elements, yongsin }: Props) {
  return (
    <div className="flex flex-col items-center">
      {/* 범례 */}
      <div className="flex gap-4 text-[10px] text-[#8B7355] mb-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-5 h-0.5 bg-blue-400" />
          생(生)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-5 border-t border-dashed border-red-400" />
          극(克)
        </span>
      </div>

      <svg viewBox="0 0 300 262" className="w-full max-w-[300px]">
        <defs>
          {/* 상생 화살표 */}
          <marker id="arrow-saeng" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" fill="#60A5FA" />
          </marker>
          {/* 상극 화살표 */}
          <marker id="arrow-keuk" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" fill="#F87171" />
          </marker>
        </defs>

        {/* 상극 선 (별 모양, 먼저 그려서 원 아래에 위치) */}
        {SANGKEUK.map(([from, to], i) => {
          const a = NODES[from], b = NODES[to]
          const l = trimLine(a.x, a.y, b.x, b.y, NODE_R + 2)
          return (
            <line
              key={`keuk-${i}`}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="#F87171" strokeWidth="1.2" strokeDasharray="4 3"
              markerEnd="url(#arrow-keuk)"
              opacity="0.7"
            />
          )
        })}

        {/* 상생 선 (오각형 외곽) */}
        {SAENGSHENG.map(([from, to], i) => {
          const a = NODES[from], b = NODES[to]
          const l = trimLine(a.x, a.y, b.x, b.y, NODE_R + 2)
          return (
            <line
              key={`saeng-${i}`}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="#60A5FA" strokeWidth="1.5"
              markerEnd="url(#arrow-saeng)"
            />
          )
        })}

        {/* 오행 원 노드 */}
        {NODES.map(({ el, x, y, labelX, labelY, textAnchor }) => {
          const cnt = elements[el] ?? 0
          const color = ELEMENT_COLOR[el] ?? '#999'
          const isYongsin = el === yongsin
          const isEmpty = cnt === 0

          return (
            <g key={el}>
              {/* 용신 글로우 */}
              {isYongsin && (
                <circle cx={x} cy={y} r={NODE_R + 6} fill={color} opacity="0.2" />
              )}
              {/* 메인 원 */}
              <circle
                cx={x} cy={y} r={NODE_R}
                fill={isEmpty ? 'white' : color}
                stroke={isYongsin ? '#C4973A' : color}
                strokeWidth={isYongsin ? 2.5 : 1.5}
                opacity={isEmpty ? 0.35 : 1}
              />
              {/* 한자 */}
              <text
                x={x} y={y + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="20" fontWeight="700"
                fill={isEmpty ? color : 'white'}
                style={{ fontFamily: 'serif' }}
              >
                {el}
              </text>
              {/* 개수 라벨 */}
              <text
                x={labelX} y={labelY}
                textAnchor={textAnchor as 'middle' | 'start' | 'end'}
                fontSize="11" fill={isEmpty ? '#C4A882' : '#3D2B1F'}
                fontWeight={cnt > 0 ? '600' : '400'}
              >
                {cnt}개
              </text>
              {/* 용신 표시 */}
              {isYongsin && (
                <text
                  x={x} y={y + NODE_R + 12}
                  textAnchor="middle"
                  fontSize="9" fill="#C4973A" fontWeight="700"
                >
                  용신
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
