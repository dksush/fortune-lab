-- 정부 인명용 한자 목록에 없으나 실제 사용되는 한자 수동 추가
-- character+reading 충돌 시 meaning/stroke/is_name_hanja 업데이트

INSERT INTO hanja (character, reading, meaning, stroke, usage_count, is_name_hanja)
VALUES
  ('沼', '소', '못', 8, 50, true)
ON CONFLICT (character, reading) DO UPDATE
  SET meaning        = EXCLUDED.meaning,
      is_name_hanja  = true,
      usage_count    = GREATEST(hanja.usage_count, EXCLUDED.usage_count);
