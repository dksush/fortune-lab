-- short_id 컬럼 추가 (nanoid 기반 짧은 공유 URL용)
ALTER TABLE fortunes ADD COLUMN IF NOT EXISTS short_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS fortunes_short_id_idx ON fortunes (short_id);

-- 기존 레코드에 short_id 채우기 (첫 8자 uuid 사용)
UPDATE fortunes SET short_id = SUBSTRING(id::text, 1, 8) WHERE short_id IS NULL AND id != 'a0000000-0000-0000-0000-000000000001';

-- 데모 레코드 short_id
UPDATE fortunes SET short_id = 'demo' WHERE id = 'a0000000-0000-0000-0000-000000000001';
