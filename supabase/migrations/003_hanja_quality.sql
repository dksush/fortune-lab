-- 한자 DB 품질 개선
-- 1) 인명용 필터 컬럼
-- 2) 사용 빈도 컬럼 (정렬용)
-- 3) 검색 성능 인덱스 정비

ALTER TABLE hanja ADD COLUMN IF NOT EXISTS usage_count int NOT NULL DEFAULT 0;
ALTER TABLE hanja ADD COLUMN IF NOT EXISTS is_name_hanja boolean NOT NULL DEFAULT true;

-- 기존 인덱스 교체: meaning 빈값 제외 + usage_count 내림차순 정렬
DROP INDEX IF EXISTS idx_hanja_reading;
DROP INDEX IF EXISTS idx_hanja_meaning_reading;

-- 음독 검색용 (자주쓰는 인명 한자 우선)
CREATE INDEX idx_hanja_reading_usage
  ON hanja(reading, usage_count DESC)
  WHERE meaning != '' AND is_name_hanja = true;

-- 훈+음 복합 검색용 (예: "맑을 호")
CREATE INDEX idx_hanja_meaning_reading_usage
  ON hanja(meaning, reading, usage_count DESC)
  WHERE meaning != '' AND is_name_hanja = true;

-- 인명에 부적합한 한자 비활성화 (의미가 명백히 이름에 쓰지 않는 것들)
-- 빈 meaning은 검색 노출 제외
UPDATE hanja SET is_name_hanja = false WHERE meaning = '';

-- 자주 쓰이는 인명 한자 usage_count 시딩
-- (이름에 자주 등장하는 한자 우선순위 부여)
UPDATE hanja SET usage_count = 100 WHERE character IN (
  '民','俊','浚','準','峻','隽',
  '敏','珉','旼','旻','玟',
  '洪','弘','鴻',
  '智','志','知',
  '秀','修','水',
  '賢','玄','現',
  '英','映','暎',
  '熙','希','喜',
  '仁','人','寅',
  '正','貞','靜','亭','晶',
  '善','宣','先','仙',
  '惠','慧','蕙',
  '雅','兒','我',
  '美','味','媚',
  '珍','眞','振',
  '恩','銀','隱',
  '庭','廷','情',
  '芸','雲','韻',
  '承','勝','昇',
  '泰','太','台',
  '成','城','盛',
  '有','由','幽',
  '在','才','材',
  '光','廣','匡',
  '宇','羽','禹',
  '哲','喆',
  '龍','隆','融',
  '燦','讚','贊',
  '亨','享','炯',
  '元','源','院',
  '東','冬','棟',
  '林','臨','琳',
  '花','華','化',
  '寶','甫','普',
  '나','娜','羅',
  '莉','李','里',
  '妍','延','燕',
  '瑞','徐','緖',
  '連','蓮','漣'
);

-- 두 번째 티어 (보통 빈도)
UPDATE hanja SET usage_count = 50 WHERE usage_count = 0 AND meaning != '' AND is_name_hanja = true;
