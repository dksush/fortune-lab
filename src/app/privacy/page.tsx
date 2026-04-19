export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 80px', fontFamily: 'inherit', color: '#2D2926', lineHeight: 1.8 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>개인정보 처리방침</h1>
      <p style={{ fontSize: 12, color: '#9a8878', marginBottom: 40 }}>최종 수정일: 2026년 4월 19일</p>

      <Section title="1. 수집하는 개인정보 항목">
        <p><strong>서비스 이용 시 수집:</strong> 이름, 생년월일, 성별, 입력한 한자 정보</p>
        <p><strong>결제 시 수집:</strong> 결제 수단 정보 (결제 대행사에서 처리, 당사에 저장되지 않음)</p>
        <p><strong>자동 수집:</strong> 서비스 이용 기록, 접속 로그, 브라우저 정보</p>
      </Section>

      <Section title="2. 개인정보 수집 및 이용 목적">
        <p>① 이름 운세 AI 분석 결과 생성 및 제공</p>
        <p>② 결제 처리 및 서비스 이용 기록 관리</p>
        <p>③ 서비스 품질 개선 및 오류 대응</p>
      </Section>

      <Section title="3. 개인정보 보유 및 이용 기간">
        <p>분석 결과는 서비스 제공을 위해 서버에 보관됩니다.</p>
        <p>관련 법령에 따른 보존 의무가 있는 경우 해당 기간 동안 보관합니다.</p>
        <p>이용자가 삭제를 요청하는 경우 즉시 처리합니다.</p>
      </Section>

      <Section title="4. 개인정보의 제3자 제공">
        <p>서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.</p>
        <p>단, 다음의 경우 예외적으로 제공될 수 있습니다:</p>
        <p>· AI 분석을 위해 Anthropic(Claude AI)에 이름 및 생년월일 정보가 전달됩니다. Anthropic의 개인정보 처리방침이 별도로 적용됩니다.</p>
        <p>· 결제 처리를 위해 포트원(PortOne) 및 결제 대행사에 최소한의 정보가 전달됩니다.</p>
        <p>· 법령에 의하거나 수사기관의 요청이 있는 경우</p>
      </Section>

      <Section title="5. 개인정보 처리 위탁">
        <p><strong>Anthropic (Claude AI):</strong> AI 분석 결과 생성</p>
        <p><strong>Supabase:</strong> 데이터베이스 저장 및 관리</p>
        <p><strong>Vercel:</strong> 서비스 호스팅</p>
        <p><strong>포트원(PortOne) / KG이니시스:</strong> 결제 처리</p>
      </Section>

      <Section title="6. 이용자의 권리">
        <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다:</p>
        <p>① 개인정보 열람 요청</p>
        <p>② 개인정보 정정·삭제 요청</p>
        <p>③ 개인정보 처리 정지 요청</p>
        <p>요청은 아래 연락처로 문의하시기 바랍니다.</p>
      </Section>

      <Section title="7. 쿠키 및 분석 도구">
        서비스는 서비스 개선을 위해 익명 사용 통계를 수집할 수 있습니다. 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 일부 서비스 기능이 제한될 수 있습니다.
      </Section>

      <Section title="8. 개인정보 보호책임자">
        <p><strong>책임자:</strong> 안현호</p>
        <p><strong>사업자등록번호:</strong> 287-07-03490</p>
        <p>개인정보 관련 문의는 서비스 내 문의 채널을 통해 접수해 주세요.</p>
      </Section>

      <Section title="9. 방침 변경 안내">
        본 개인정보 처리방침은 법령·정책 변경에 따라 개정될 수 있으며, 변경 시 서비스 내 공지합니다.
      </Section>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <a href="/" style={{ fontSize: 13, color: '#D95D39', textDecoration: 'none' }}>← 홈으로 돌아가기</a>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#2D2926', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #F0EDE8' }}>{title}</h2>
      <div style={{ fontSize: 13, color: '#4a3828', lineHeight: 1.9, display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
    </div>
  )
}
