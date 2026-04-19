export default function TermsPage() {
  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 80px', fontFamily: 'inherit', color: '#2D2926', lineHeight: 1.8 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>이용약관</h1>
      <p style={{ fontSize: 12, color: '#9a8878', marginBottom: 40 }}>최종 수정일: 2026년 4월 19일</p>

      <Section title="제1조 (목적)">
        본 약관은 이름운세(이하 "서비스")가 제공하는 이름 운세 분석 서비스의 이용에 관한 조건 및 절차, 이용자와 서비스 제공자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
      </Section>

      <Section title="제2조 (서비스의 내용)">
        서비스는 이용자가 입력한 이름, 한자, 생년월일 정보를 바탕으로 AI를 활용한 이름 운세 분석 결과를 제공합니다. 분석 결과는 참고용 정보이며, 의학적·법적·재정적 조언을 대체하지 않습니다.
      </Section>

      <Section title="제3조 (유료 서비스 및 결제)">
        <p>① 전체 운세 분석 결과 열람은 1회 990원의 유료 서비스입니다.</p>
        <p>② 결제는 포트원(PortOne)을 통한 신용카드, 체크카드, 간편결제 등으로 가능합니다.</p>
        <p>③ 결제 완료 후 AI 분석이 즉시 생성되어 제공됩니다.</p>
        <p>④ 디지털 콘텐츠 특성상 결과 생성 후에는 환불이 제한될 수 있습니다. 단, AI 분석 오류 또는 서비스 장애로 인한 경우 고객센터를 통해 처리합니다.</p>
      </Section>

      <Section title="제4조 (이용자의 의무)">
        <p>① 이용자는 정확한 정보를 입력해야 하며, 허위 정보 입력으로 인한 결과에 대해 서비스는 책임을 지지 않습니다.</p>
        <p>② 이용자는 서비스를 통해 제공된 콘텐츠를 무단으로 복제, 배포, 상업적으로 이용할 수 없습니다.</p>
      </Section>

      <Section title="제5조 (서비스 제공자의 면책)">
        <p>① 서비스의 분석 결과는 AI가 생성한 참고용 정보이며, 실제 운명이나 미래를 예측하는 것이 아닙니다.</p>
        <p>② 서비스는 천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.</p>
      </Section>

      <Section title="제6조 (약관의 변경)">
        서비스는 필요한 경우 약관을 변경할 수 있으며, 변경 시 서비스 내 공지합니다. 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단할 수 있습니다.
      </Section>

      <Section title="제7조 (준거법 및 분쟁 해결)">
        본 약관은 대한민국 법률에 따라 해석되며, 분쟁 발생 시 관할 법원은 서비스 제공자의 주소지 관할 법원으로 합니다.
      </Section>

      <div style={{ marginTop: 48, padding: '16px 20px', background: '#F5F0EB', borderRadius: 12, fontSize: 12, color: '#8a7060' }}>
        <p><strong>상호:</strong> 이름운세</p>
        <p><strong>대표자:</strong> 안현호</p>
        <p><strong>사업자등록번호:</strong> 287-07-03490</p>
        <p><strong>통신판매업신고번호:</strong> 신청중</p>
      </div>

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
