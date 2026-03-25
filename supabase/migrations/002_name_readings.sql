-- 이름풀이 + 사주 연계 해석 캐시 테이블
CREATE TABLE name_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_key text UNIQUE NOT NULL,  -- sha256(sorted_hanja + birthdate) 앞 32자
  hanja_input jsonb NOT NULL,      -- 입력된 한자 배열
  birthdate text,                  -- 생년월일 (YYYY-MM-DD, nullable)
  result jsonb NOT NULL,           -- NameReadingResult JSON
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_name_readings_input_key ON name_readings(input_key);

-- RLS: 누구나 읽기 가능, 서비스 롤만 쓰기
ALTER TABLE name_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "name_readings_public_read" ON name_readings FOR SELECT USING (true);
