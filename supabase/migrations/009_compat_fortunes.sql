CREATE TABLE IF NOT EXISTS compat_fortunes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id    TEXT UNIQUE,

  -- 나
  my_name     TEXT NOT NULL,
  my_hanja    JSONB DEFAULT '[]',
  my_birth    TEXT,
  my_gender   TEXT DEFAULT 'male',

  -- 상대방
  partner_name   TEXT NOT NULL,
  partner_hanja  JSONB DEFAULT '[]',
  partner_birth  TEXT,
  partner_gender TEXT DEFAULT 'male',

  -- 관계 유형
  relation_type  TEXT DEFAULT 'lover',  -- lover | friend | family

  -- 결제
  payment_key TEXT,
  order_id    TEXT UNIQUE,
  paid_at     TIMESTAMPTZ,

  -- 결과
  result      TEXT,
  status      TEXT DEFAULT 'pending',  -- pending | completed | failed

  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS compat_fortunes_short_id_idx ON compat_fortunes(short_id);
CREATE INDEX IF NOT EXISTS compat_fortunes_order_id_idx ON compat_fortunes(order_id);
