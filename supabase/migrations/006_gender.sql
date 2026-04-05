-- 성별 컬럼 추가 (사주 대운 방향 계산에 사용)
ALTER TABLE fortunes ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'male';

-- 한자 테이블: character+reading 유니크 인덱스 (대량 import시 중복 방지)
CREATE UNIQUE INDEX IF NOT EXISTS hanja_char_reading_idx ON hanja(character, reading);
