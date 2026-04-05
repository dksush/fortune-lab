export interface Hanja {
  id: string
  character: string
  reading: string
  meaning: string
  stroke: number
}

export interface Fortune {
  id: string
  input_name: string
  hanja_ids: string[]
  reading_raw: string
  result: string
  status: 'pending' | 'completed' | 'failed'
  payment_key: string
  order_id: string
  paid_at: string
  user_id: string | null
  created_at: string
}

export interface HanjaSelection {
  character: string
  reading: string
  meaning: string
}

export interface PaymentConfirmRequest {
  paymentKey: string
  orderId: string
  amount: number
  inputName: string
  hanjaIds: string[]
  readingRaw: string
}

export interface NameReadingCharacter {
  char: string    // 한자 (e.g. "敏")
  sound: string   // 음독 (e.g. "민")
  meaning: string // 훈 (e.g. "민첩할")
  element: string // 오행 (木火土金水)
}

export interface NameReadingResult {
  characters: NameReadingCharacter[]
  name_meaning: string
  saju_elements: import('@/lib/saju').SajuData | null
  combined_reading: string
  fortune_summary: string
}
