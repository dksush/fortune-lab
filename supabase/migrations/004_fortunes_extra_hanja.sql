-- 선택된 한자 전체 저장 (DB 한자 + 직접 입력 한자 모두, 위치 정보 포함)
-- 구조: [{pos: 0, character: "安", reading: "안", meaning: "편안할"}, ...]
ALTER TABLE fortunes ADD COLUMN IF NOT EXISTS extra_hanja jsonb NOT NULL DEFAULT '[]';
