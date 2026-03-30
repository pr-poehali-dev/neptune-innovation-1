import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createOrder, claimPaid, checkPaymentStatus, getChatMessages, sendChatMessage } from "@/lib/api"
import Icon from "@/components/ui/icon"

type Step = "form" | "payment" | "waiting" | "chat"

interface Message {
  id: number
  sender: string
  message: string
  created_at: string
}

interface OrderModalProps {
  open: boolean
  onClose: () => void
}

const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Сидячий образ жизни" },
  { value: "low", label: "Лёгкая активность (1-2 раза/нед)" },
  { value: "moderate", label: "Умеренная активность (3-4 раза/нед)" },
  { value: "high", label: "Высокая активность (5+ раз/нед)" },
]

const GOAL_OPTIONS = [
  { value: "weight_loss", label: "🔥 Похудение" },
  { value: "muscle_gain", label: "💪 Набор мышечной массы" },
  { value: "relief", label: "✨ Рельеф и сушка" },
  { value: "endurance", label: "🏃 Выносливость и здоровье" },
]

const EQUIPMENT_OPTIONS = [
  { value: "gym", label: "🏋️ Тренажёрный зал" },
  { value: "home", label: "🏠 Дома (без инвентаря)" },
  { value: "home_equipment", label: "🔧 Дома (с инвентарём)" },
  { value: "outdoor", label: "🌳 На улице" },
]

// СБП QR по номеру телефона Т-Банка
const SBP_PHONE = "79234417395"
const SBP_AMOUNT = 300
const SBP_NAME = "Форма Жизни"

function getSbpQrUrl(orderId: number) {
  const comment = encodeURIComponent(`Форма Жизни #${orderId}`)
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    `https://qr.nspk.ru/AS100003V4KFNF8UOS86HHPHIF0VB0I7?type=01&bank=100000000111&sum=${SBP_AMOUNT * 100}&cur=RUB&crc=5B50`
  )}`
}

// Ссылка для оплаты через СБП (открывается банковское приложение)
function getSbpDeeplink(orderId: number) {
  return `https://qr.nspk.ru/AS100003V4KFNF8UOS86HHPHIF0VB0I7?type=01&bank=100000000111&sum=${SBP_AMOUNT * 100}&cur=RUB&crc=5B50`
}

export function OrderModal({ open, onClose }: OrderModalProps) {
  const [step, setStep] = useState<Step>("form")
  const [orderId, setOrderId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [claimLoading, setClaimLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    age: "",
    height: "",
    weight: "",
    activity_level: "",
    goal: "",
    equipment: "",
    notes: "",
  })

  // Поллинг статуса оплаты — пока на экране ожидания
  useEffect(() => {
    if (step === "waiting" && orderId) {
      const poll = async () => {
        const data = await checkPaymentStatus(orderId)
        if (data.status === "paid") {
          clearInterval(pollRef.current!)
          setStep("chat")
          loadMessages()
        }
      }
      poll()
      pollRef.current = setInterval(poll, 5000)
      return () => clearInterval(pollRef.current!)
    }
  }, [step, orderId])

  // Поллинг сообщений в чате
  useEffect(() => {
    if (step === "chat" && orderId) {
      loadMessages()
      const interval = setInterval(loadMessages, 5000)
      return () => clearInterval(interval)
    }
  }, [step, orderId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Сбрасываем состояние при закрытии
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        if (!open) {
          setStep("form")
          setOrderId(null)
          setMessages([])
        }
      }, 300)
    }
  }, [open])

  async function loadMessages() {
    if (!orderId) return
    const data = await getChatMessages(orderId)
    if (data.messages) setMessages(data.messages)
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const data = await createOrder({
      ...form,
      age: form.age ? Number(form.age) : null,
      height: form.height ? Number(form.height) : null,
      weight: form.weight ? Number(form.weight) : null,
    })
    setOrderId(data.order_id)
    setLoading(false)
    setStep("payment")
  }

  async function handleClaimPaid() {
    if (!orderId) return
    setClaimLoading(true)
    const data = await claimPaid(orderId)
    setClaimLoading(false)
    if (data.ok) {
      setStep("waiting")
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || !orderId) return
    await sendChatMessage(orderId, chatInput)
    setChatInput("")
    loadMessages()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-[#0d0d0d] border border-red-500/30 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white transition-colors"
        >
          <Icon name="X" size={20} />
        </button>

        {/* ─── STEP: FORM ─── */}
        {step === "form" && (
          <form onSubmit={handleSubmitForm} className="p-6 space-y-5">
            <div className="text-center mb-2">
              <h2 className="font-orbitron text-2xl font-bold text-white">
                Форма <span className="text-red-500">Жизни</span>
              </h2>
              <p className="text-gray-400 text-sm mt-1">Заполни анкету — получи персональный план</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 text-sm">Имя *</Label>
                <Input required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Артём"
                  className="bg-black/50 border-red-500/20 text-white focus:border-red-500 mt-1" />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Телефон *</Label>
                <Input required value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+7 900 000 00 00"
                  className="bg-black/50 border-red-500/20 text-white focus:border-red-500 mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Email (необязательно)</Label>
              <Input type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="your@email.com"
                className="bg-black/50 border-red-500/20 text-white focus:border-red-500 mt-1" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-gray-300 text-sm">Возраст *</Label>
                <Input required type="number" min="14" max="60" value={form.age}
                  onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                  placeholder="22"
                  className="bg-black/50 border-red-500/20 text-white focus:border-red-500 mt-1" />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Рост (см) *</Label>
                <Input required type="number" min="140" max="220" value={form.height}
                  onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                  placeholder="178"
                  className="bg-black/50 border-red-500/20 text-white focus:border-red-500 mt-1" />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Вес (кг) *</Label>
                <Input required type="number" min="40" max="200" value={form.weight}
                  onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                  placeholder="75"
                  className="bg-black/50 border-red-500/20 text-white focus:border-red-500 mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Уровень активности *</Label>
              <div className="grid grid-cols-1 gap-2">
                {ACTIVITY_OPTIONS.map(opt => (
                  <label key={opt.value}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                      form.activity_level === opt.value
                        ? "border-red-500 bg-red-500/10 text-white"
                        : "border-red-500/15 text-gray-400 hover:border-red-500/40"
                    }`}>
                    <input type="radio" name="activity" value={opt.value}
                      checked={form.activity_level === opt.value}
                      onChange={() => setForm(f => ({ ...f, activity_level: opt.value }))}
                      className="hidden" />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Цель *</Label>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_OPTIONS.map(opt => (
                  <label key={opt.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                      form.goal === opt.value
                        ? "border-red-500 bg-red-500/10 text-white"
                        : "border-red-500/15 text-gray-400 hover:border-red-500/40"
                    }`}>
                    <input type="radio" name="goal" value={opt.value}
                      checked={form.goal === opt.value}
                      onChange={() => setForm(f => ({ ...f, goal: opt.value }))}
                      className="hidden" />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Где тренируешься? *</Label>
              <div className="grid grid-cols-2 gap-2">
                {EQUIPMENT_OPTIONS.map(opt => (
                  <label key={opt.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                      form.equipment === opt.value
                        ? "border-red-500 bg-red-500/10 text-white"
                        : "border-red-500/15 text-gray-400 hover:border-red-500/40"
                    }`}>
                    <input type="radio" name="equipment" value={opt.value}
                      checked={form.equipment === opt.value}
                      onChange={() => setForm(f => ({ ...f, equipment: opt.value }))}
                      className="hidden" />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Дополнительно (травмы, пожелания)</Label>
              <Input value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Например: больное колено, вегетарианец..."
                className="bg-black/50 border-red-500/20 text-white focus:border-red-500 mt-1" />
            </div>

            <Button type="submit"
              disabled={loading || !form.activity_level || !form.goal || !form.equipment}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 text-base">
              {loading ? "Отправляем..." : "Перейти к оплате →"}
            </Button>
          </form>
        )}

        {/* ─── STEP: PAYMENT ─── */}
        {step === "payment" && (
          <div className="p-6 space-y-5 text-center">
            <div>
              <h2 className="font-orbitron text-2xl font-bold text-white mb-1">
                Оплата <span className="text-red-500">300 ₽</span>
              </h2>
              <p className="text-gray-400 text-sm">Заявка #{orderId} создана — тренер уже получил уведомление</p>
            </div>

            {/* Вариант 1 — QR СБП */}
            <div className="bg-black/40 border border-red-500/20 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 justify-center text-white font-semibold">
                <span className="text-xl">📱</span>
                <span>Оплата через СБП (Т-Банк)</span>
              </div>

              {/* QR-код */}
              <div className="flex justify-center">
                <div className="bg-white rounded-xl p-3 inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://www.tbank.ru/transfer/?phone=%2B${SBP_PHONE}&comment=${encodeURIComponent(`Форма Жизни #${orderId}`)}&amount=${SBP_AMOUNT}`)}`}
                    alt="QR для оплаты"
                    width={200}
                    height={200}
                    className="block"
                  />
                </div>
              </div>

              <p className="text-gray-400 text-xs">Отсканируй QR камерой телефона — откроется Т-Банк</p>

              {/* Кнопка для мобильных */}
              <a
                href={`https://www.tbank.ru/transfer/?phone=%2B${SBP_PHONE}&comment=${encodeURIComponent(`Форма Жизни #${orderId}`)}&amount=${SBP_AMOUNT}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 px-4 rounded-xl transition-colors text-sm"
              >
                <Icon name="ExternalLink" size={16} />
                Открыть Т-Банк на телефоне
              </a>
            </div>

            {/* Вариант 2 — по номеру вручную */}
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-left space-y-2">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Или переведи вручную</p>
              <div className="flex items-center justify-between">
                <span className="text-white font-mono text-lg font-bold">+7 923 441-73-95</span>
                <span className="text-gray-400 text-sm">Т-Банк</span>
              </div>
              <p className="text-gray-500 text-xs">
                Комментарий: <span className="text-red-400 font-bold">Форма Жизни #{orderId}</span>
              </p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-300 text-xs text-left flex gap-2">
              <Icon name="AlertCircle" size={16} className="shrink-0 mt-0.5" />
              <span>После перевода нажми кнопку ниже. Тренер проверит поступление денег и откроет чат вручную — обычно в течение нескольких часов.</span>
            </div>

            <Button
              onClick={handleClaimPaid}
              disabled={claimLoading}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 text-base"
            >
              {claimLoading ? "Отправляем..." : "✅ Я оплатил — жду подтверждения"}
            </Button>

            <button onClick={() => setStep("form")} className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
              ← Вернуться к анкете
            </button>
          </div>
        )}

        {/* ─── STEP: WAITING ─── */}
        {step === "waiting" && (
          <div className="p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <Icon name="Clock" size={36} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="font-orbitron text-xl font-bold text-white mb-2">Ждём подтверждения</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Тренер получил уведомление и проверяет оплату.<br />
                Как только деньги придут — откроется чат автоматически.
              </p>
            </div>

            {/* Анимированный индикатор */}
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-red-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-left space-y-1">
              <p className="text-gray-400 text-xs">Заявка #{orderId}</p>
              <p className="text-white text-sm">Обычное время ожидания: <span className="text-green-400 font-semibold">до 2 часов</span></p>
            </div>

            <p className="text-gray-600 text-xs">
              Эта страница обновляется автоматически. Не закрывай её.
            </p>
          </div>
        )}

        {/* ─── STEP: CHAT ─── */}
        {step === "chat" && (
          <div className="flex flex-col" style={{ height: "min(90vh, 600px)" }}>
            <div className="p-4 border-b border-red-500/20 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Icon name="User" size={18} className="text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold font-orbitron text-sm">Тренер Форма Жизни</p>
                <p className="text-green-400 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block"></span>
                  Оплата подтверждена
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 text-sm mt-8">Загружаем сообщения...</div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-red-500 text-white rounded-br-sm"
                      : "bg-white/10 text-white rounded-bl-sm border border-white/10"
                  }`}>
                    {msg.message}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-red-500/20 flex gap-2 shrink-0">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Напиши сообщение..."
                className="bg-black/50 border-red-500/20 text-white focus:border-red-500 flex-1"
              />
              <Button type="submit" className="bg-red-500 hover:bg-red-600 text-white px-4">
                <Icon name="Send" size={16} />
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
