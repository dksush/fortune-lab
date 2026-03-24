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
