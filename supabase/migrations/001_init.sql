-- 한자 테이블
CREATE TABLE hanja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character text NOT NULL,
  reading text NOT NULL,   -- 음독 (e.g. "호")
  meaning text NOT NULL,   -- 훈 (e.g. "맑을")
  stroke int NOT NULL DEFAULT 0
);

CREATE INDEX idx_hanja_reading ON hanja(reading);
CREATE INDEX idx_hanja_meaning_reading ON hanja(meaning, reading);

-- 풀이 결과 테이블
CREATE TABLE fortunes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_name text NOT NULL,
  hanja_ids uuid[] NOT NULL DEFAULT '{}',
  reading_raw text NOT NULL DEFAULT '',
  result text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  payment_key text,
  order_id text UNIQUE,
  paid_at timestamptz,
  user_id uuid,
  retry_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fortunes_order_id ON fortunes(order_id);
CREATE INDEX idx_fortunes_user_id ON fortunes(user_id);

-- RLS: 누구나 읽기 가능 (공개 URL), 서비스 롤만 쓰기
ALTER TABLE fortunes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hanja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fortunes_public_read" ON fortunes FOR SELECT USING (true);
CREATE POLICY "hanja_public_read" ON hanja FOR SELECT USING (true);
