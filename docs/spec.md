# fortune-lab — Product Spec

> 마지막 업데이트: 2026-03-22
> 현재 Phase: 3 — 설계 완료, 구현 대기

---

## 1. 서비스 개요

**서비스명:** 이름풀이 서비스 (가칭)
**한 줄 정의:** 이름이 있는 모든 사람을 위한 AI 기반 이름 탐구 콘텐츠

### 배경
- 사주·운세가 MZ세대 사이에서 일상적 자기탐구 문화로 자리잡음
- 기존 작명 앱은 신생아/개명에 집중 → 이미 이름이 있는 사람을 위한 콘텐츠 공백
- 벤치마크: 사주아이 (https://saju-kid.com/auth/login)

---

## 2. 타깃

| 순위 | 대상 | 니즈 |
|------|------|------|
| 1순위 | 20-35세 직장인·대학생 | 이름 의미 탐구, 영어 이름 필요, 친구 공유 |
| 2순위 | 예비 부모 | 아이 이름 짓기, 사주-이름 궁합 확인 |
| 3순위 | 개명 고민자 | 내 이름이 사주와 맞는지 검증 |

**사용 환경:** 모바일 중심 (웹이지만 모든 화면/기능 모바일 최적화 필수)

---

## 3. 출시 계획 (MVP 우선)

### Phase 1 — MVP (우선 개발)
**이름 뜻 풀이**
- 한글 이름 또는 한자 입력 → AI가 철학관 스타일로 의미·음양·발음 오행 분석
- 한글만 입력해도 인명용 한자 옵션 5-10개 제시
  - 리스트 클릭 또는 직접 검색 ("맑을 호" → 해당 한자 선택)
- 결과 공유: 카카오/인스타 DM 링크 공유, OG 이미지 바이럴 카드 생성
- 건별 결제 (과금 후 결과 확인)
- **로그인 없음** — 결제 완료 시 UUID 발급, `/result/[uuid]` URL로 결과 영구 보관

### Phase 2 — 2차 출시
- 영어 이름 추천 (한국 이름 발음·뜻 기반, 유행 연도·문화적 의미 포함)
- 이름 궁합 (무료: 점수만 / 유료: 상세 풀이)
- 소셜 로그인 추가 (카카오, 구글, 이메일) — Phase 1 수익 검증 후 진행

---

## 4. 기술 제약

| 항목 | 결정 사항 |
|------|---------|
| 배포 환경 | Vercel |
| 프레임워크 | Next.js 15 (App Router) |
| DB / Auth | Supabase (Auth는 Phase 2에서 활성화) |
| 스타일링 | Tailwind CSS |
| 결제 PG | 토스페이먼츠 (카드 전체 + 카카오페이 + 네이버페이 + 토스페이 지원, 수수료 3.4%) |
| 결제 금액 | 건당 990원 (부가세 포함, 소비자 노출가 990원) |
| AI | Claude API |
| 공유 | 카카오 공유 SDK, OG 메타태그 |

### 타협 불가 요구사항
- 모바일 최적화 (375px~ 기준 모든 기능 동작)
- 카카오/인스타 공유 시 바이럴 이미지 카드 노출
- Phase 1은 로그인 없이 동작 (소셜 로그인은 Phase 2)

---

## 5. 핵심 아키텍처 결정

### 페이지 구조
| 경로 | 역할 |
|------|------|
| `/` | 랜딩 + 이름 입력 |
| `/result/[uuid]` | 풀이 결과 (공개, 로그인 불필요) |
| `/api/hanja` | 음독 검색 (`?reading=호`) |
| `/api/fortune/generate` | Claude API 호출 → 풀이 생성 |
| `/api/payment/confirm` | 토스페이먼츠 서버사이드 검증 |
| `/api/og/[uuid]` | 동적 OG 이미지 생성 |

### DB 스키마 (Supabase)
```sql
hanja
  id uuid PK, character text, reading text,
  meaning text, stroke int

fortunes
  id uuid PK DEFAULT gen_random_uuid()
  input_name text, hanja_ids uuid[], reading_raw text
  result text, status text  -- pending | completed | failed
  payment_key text, order_id text UNIQUE
  paid_at timestamptz, user_id uuid NULL
  created_at timestamptz DEFAULT now()
```

### 결제 플로우
```
이름 입력 → 토스 위젯 → 결제 완료
  → /api/payment/confirm (서버 검증 + Idempotency-Key)
  → Claude API 호출 → fortunes 저장 (status: completed)
  → /result/[uuid]

Claude 실패 시: status: failed → 결제 완료 페이지에서
  수동 재시도 버튼 제공 (최대 3회)
```

### 주요 기술 결정
| 결정 | 이유 |
|------|------|
| UUID 기반 공개 URL | 로그인 없이 공유, Phase 2 확장 용이 |
| OG 이미지: next/og | Next.js 내장, 한국어 TTF 폰트 지원 |
| 결제 후 AI 호출 | 미결제 AI 호출 방지 |
| hanja DB: Supabase | 추가 비용 없음, 음독 인덱스 구성 |

---

## 6. 수락 기준

- AC-01: 한글 이름 입력 시 음독 기준 인명용 한자 5-10개 노출
- AC-02: "맑을 호" 형태 검색으로 한자 필터링 및 선택 가능
- AC-03: 한자 미선택(한글만)으로도 풀이 진행 가능
- AC-04: 결제 전 결과 전문 미노출
- AC-05: 토스페이먼츠 결제 완료 시 UUID 발급, /result/[uuid] 접근 가능
- AC-06: 결제 금액 990원 노출 (부가세 포함)
- AC-07: 결제 실패 시 재시도 가능, 중복 과금 없음
- AC-08: /result/[uuid] 에서 풀이 전문 조회 가능
- AC-09: 로그인 없이 URL만으로 결과 영구 접근 가능
- AC-10: 다른 사람이 동일 URL 접근 시 결과 조회 가능 (공개)
- AC-11: 카카오톡 공유 시 OG 이미지 카드 노출
- AC-12: 링크 복사 기능 동작
- AC-13: 공유 링크 클릭 시 "나도 하기" CTA 노출
- AC-14: 375px 기준 모든 기능 정상 동작
- AC-15: 입력 → 결제 → 결과 플로우 모바일 완주 가능
- AC-16: Claude API 실패 시 결제 완료 페이지에서 수동 재시도 버튼 제공

### Definition of Done
- 모든 AC 통과
- 토스페이먼츠 실결제 테스트 통과
- 카카오 공유 OG 이미지 실기기 확인
- Lighthouse 모바일 성능 75점 이상

---

## 7. 미결 사항

| 항목 | 내용 | 중요도 |
|------|------|--------|
| 동일 이름 재구매 | 같은 이름 재결제 허용 여부 | MEDIUM |

---

## 8. 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-03-22 | Phase 1-2 완료 — 초기 스펙 작성 |
| 2026-03-22 | 결제: 토스페이먼츠 확정, 한자: Supabase 직접 구축 확정, 금액: 990원 확정 |
| 2026-03-22 | 설계 완료 — 아키텍처, AC, 컴포넌트 구조 확정. Claude 실패 시 수동 재시도(B안) 채택 |
| 2026-03-22 | Phase 1 MVP 구현 완료 — 빌드 성공, 타입 에러 없음 |
