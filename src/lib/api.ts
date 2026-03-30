const API_URL = "https://functions.poehali.dev/15b345ca-382e-4135-b772-e2c206bb10ae"

export async function createOrder(data: Record<string, unknown>) {
  const res = await fetch(`${API_URL}?action=create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}

// Клиент говорит «я оплатил» — статус → awaiting_confirm
export async function claimPaid(order_id: number) {
  const res = await fetch(`${API_URL}?action=claim_paid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id }),
  })
  return res.json()
}

// Проверить текущий статус заявки
export async function checkPaymentStatus(order_id: number) {
  const res = await fetch(`${API_URL}?action=check_payment&order_id=${order_id}`)
  return res.json()
}

export async function getChatMessages(order_id: number) {
  const res = await fetch(`${API_URL}?action=chat&order_id=${order_id}`)
  return res.json()
}

export async function sendChatMessage(order_id: number, message: string, sender = "user") {
  const res = await fetch(`${API_URL}?action=send_message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id, message, sender }),
  })
  return res.json()
}

export async function confirmPaymentByTrainer(order_id: number) {
  const res = await fetch(`${API_URL}?action=confirm_payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order_id }),
  })
  return res.json()
}

export async function getAdminOrders() {
  const res = await fetch(`${API_URL}?action=admin`)
  return res.json()
}
