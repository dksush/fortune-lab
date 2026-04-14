/**
 * Unicode Unihan DB에서 kTotalStrokes를 가져와
 * Supabase hanja 테이블의 stroke 컬럼을 일괄 업데이트합니다.
 *
 * 실행: node scripts/update-hanja-strokes.js
 */

const { createClient } = require('@supabase/supabase-js')
const https = require('https')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// .env.local 직접 파싱 (dotenv 패키지 불필요)
const envRaw = fs.existsSync(path.resolve(__dirname, '../.env.local'))
  ? fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8')
  : ''
envRaw.split('\n').forEach(line => {
  const idx = line.indexOf('=')
  if (idx > 0) process.env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
})

const UNIHAN_ZIP_URL = 'https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip'
const TMP_DIR = '/tmp/unihan-update'
const ZIP_PATH = path.join(TMP_DIR, 'Unihan.zip')
const TXT_PATH = path.join(TMP_DIR, 'Unihan_IRGSources.txt')

// ── 1. Unihan.zip 다운로드 ──────────────────────────────────────────────────
function download(url, dest) {
  return new Promise((resolve, reject) => {
    // 이미 있으면 스킵
    if (fs.existsSync(dest)) {
      console.log('  캐시 있음, 다운로드 스킵:', dest)
      return resolve()
    }
    console.log('  다운로드 중…', url)
    const file = fs.createWriteStream(dest)
    const req = https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        fs.unlinkSync(dest)
        return download(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      const total = parseInt(res.headers['content-length'] || '0')
      let received = 0
      res.on('data', (chunk) => {
        received += chunk.length
        if (total) process.stdout.write(`\r  ${Math.round(received / total * 100)}%   `)
      })
      res.pipe(file)
      file.on('finish', () => { file.close(); console.log(); resolve() })
    })
    req.on('error', (e) => { fs.unlinkSync(dest); reject(e) })
  })
}

// ── 2. kTotalStrokes 파싱 → Map<char, strokeCount> ──────────────────────────
function parseStrokeMap(txtPath) {
  console.log('  파싱 중…')
  const content = fs.readFileSync(txtPath, 'utf-8')
  const map = new Map()
  for (const line of content.split('\n')) {
    if (!line.startsWith('U+')) continue
    const parts = line.split('\t')
    if (parts[1] !== 'kTotalStrokes') continue
    const codepoint = parseInt(parts[0].slice(2), 16)
    const stroke = parseInt(parts[2])
    if (!isNaN(codepoint) && !isNaN(stroke) && stroke > 0) {
      map.set(String.fromCodePoint(codepoint), stroke)
    }
  }
  console.log(`  파싱 완료: ${map.size.toLocaleString()}자 획수 데이터`)
  return map
}

// ── 3. Supabase 업데이트 ────────────────────────────────────────────────────
async function updateDB(strokeMap) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 전체 hanja 조회 (Supabase 기본 limit 1000 → range로 전체 페이징)
  console.log('  DB에서 한자 목록 조회 중…')
  const allHanja = []
  const PAGE = 1000
  for (let start = 0; ; start += PAGE) {
    const { data, error } = await supabase
      .from('hanja')
      .select('id, character, stroke')
      .range(start, start + PAGE - 1)
    if (error) throw error
    allHanja.push(...data)
    if (data.length < PAGE) break
  }
  console.log(`  총 ${allHanja.length.toLocaleString()}자`)

  // stroke 없는 것만 필터 (이미 있는 건 스킵)
  const toUpdate = allHanja
    .map(h => ({ id: h.id, char: h.character, stroke: strokeMap.get(h.character) }))
    .filter(h => h.stroke && h.stroke > 0)

  const alreadyDone = allHanja.filter(h => h.stroke > 0).length
  console.log(`  이미 채워진: ${alreadyDone}자`)
  console.log(`  업데이트 대상: ${toUpdate.length}자`)

  if (toUpdate.length === 0) {
    console.log('  업데이트할 항목 없음.')
    return
  }

  // 50개씩 병렬 update (upsert는 NOT NULL 충돌 발생)
  const CONCURRENT = 50
  let updated = 0
  for (let i = 0; i < toUpdate.length; i += CONCURRENT) {
    const batch = toUpdate.slice(i, i + CONCURRENT)
    const results = await Promise.all(
      batch.map(h => supabase.from('hanja').update({ stroke: h.stroke }).eq('id', h.id))
    )
    const err = results.find(r => r.error)?.error
    if (err) throw err
    updated += batch.length
    process.stdout.write(`\r  진행: ${updated}/${toUpdate.length}`)
  }
  console.log('\n  완료!')

  // 결과 통계
  const matched = toUpdate.length
  const unmatched = allHanja.length - alreadyDone - matched
  console.log(`\n  ✓ 업데이트: ${matched}자`)
  console.log(`  ✗ Unihan에 없음: ${unmatched}자 (희귀 한자 또는 비표준 코드포인트)`)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ .env.local에 SUPABASE_URL / SERVICE_ROLE_KEY 없음')
    process.exit(1)
  }

  fs.mkdirSync(TMP_DIR, { recursive: true })

  console.log('\n[1/3] Unihan.zip 다운로드')
  await download(UNIHAN_ZIP_URL, ZIP_PATH)

  console.log('\n[2/3] Unihan_DictionaryLikeData.txt 추출 & 파싱')
  if (!fs.existsSync(TXT_PATH)) {
    console.log('  압축 해제 중…')
    execSync(`unzip -o -j "${ZIP_PATH}" "Unihan_IRGSources.txt" -d "${TMP_DIR}"`)
  }
  const strokeMap = parseStrokeMap(TXT_PATH)

  console.log('\n[3/3] Supabase hanja 테이블 업데이트')
  await updateDB(strokeMap)

  console.log('\n✅ 완료. 이제 수리 획수 분석 카드가 정상 표시됩니다.')
}

main().catch(e => { console.error('\n❌ 오류:', e.message); process.exit(1) })
