import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createOrder, confirmPayment, getChatMessages, sendChatMessage } from "@/lib/api"
import Icon from "@/components/ui/icon"

type Step = "form" | "payment" | "chat"

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

export function OrderModal({ open, onClose }: OrderModalProps) {
  const [step, setStep] = useState<Step>("form")
  const [orderId, setOrderId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)

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

  async function handlePaymentDone() {
    if (!orderId) return
    setLoading(true)
    await confirmPayment(orderId)
    setLoading(false)
    setStep("chat")
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
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <Icon name="X" size={20} />
        </button>

        {/* Step: FORM */}
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
                <Input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Артём"
                  className="bg-black/50 border-red-500/20 text-white focus:border-red-500 mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Телефон *</Label>
                <Input
                  required
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+7 900 000 00 00"
                  className="bg-black/50 border-red-500/20 text-white focus:border-red-500 mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Email (необязательно)</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="your@email.com"
                className="bg-black/50 border-red-500/20 text-white focus:border-red-500 mt-1"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-gray-300 text-sm">Возраст *</Label>
                <Input
                  required
                  type="number"
                  min="14"
                  max="60"
                  value={form.age}
                  onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                  placeholder="22"
                  className="bg-black/50 border-red-500/20 text-white focus:border-red-500 mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Рост (см) *</Label>
                <Input
                  required
                  type="number"
                  min="140"
                  max="220"
                  value={form.height}
                  onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                  placeholder="178"
                  className="bg-black/50 border-red-500/20 text-white focus:border-red-500 mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Вес (кг) *</Label>
                <Input
                  required
                  type="number"
                  min="40"
                  max="200"
                  value={form.weight}
                  onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                  placeholder="75"
                  className="bg-black/50 border-red-500/20 text-white focus:border-red-500 mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Уровень активности *</Label>
              <div className="grid grid-cols-1 gap-2">
                {ACTIVITY_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg border cursor-pointer transition-all ${
                      form.activity_level === opt.value
                        ? "border-red-500 bg-red-500/10 text-white"
                        : "border-red-500/15 text-gray-400 hover:border-red-500/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="activity"
                      value={opt.value}
                      checked={form.activity_level === opt.value}
                      onChange={() => setForm(f => ({ ...f, activity_level: opt.value }))}
                      className="hidden"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Цель *</Label>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                      form.goal === opt.value
                        ? "border-red-500 bg-red-500/10 text-white"
                        : "border-red-500/15 text-gray-400 hover:border-red-500/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="goal"
                      value={opt.value}
                      checked={form.goal === opt.value}
                      onChange={() => setForm(f => ({ ...f, goal: opt.value }))}
                      className="hidden"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Где тренируешься? *</Label>
              <div className="grid grid-cols-2 gap-2">
                {EQUIPMENT_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                      form.equipment === opt.value
                        ? "border-red-500 bg-red-500/10 text-white"
                        : "border-red-500/15 text-gray-400 hover:border-red-500/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="equipment"
                      value={opt.value}
                      checked={form.equipment === opt.value}
                      onChange={() => setForm(f => ({ ...f, equipment: opt.value }))}
                      className="hidden"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Дополнительно (травмы, пожелания)</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Например: больное колено, вегетарианец..."
                className="bg-black/50 border-red-500/20 text-white focus:border-red-500 mt-1"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !form.activity_level || !form.goal || !form.equipment}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 text-base"
            >
              {loading ? "Отправляем..." : "Перейти к оплате →"}
            </Button>
          </form>
        )}

        {/* Step: PAYMENT */}
        {step === "payment" && (
          <div className="p-6 space-y-6 text-center">
            <div>
              <h2 className="font-orbitron text-2xl font-bold text-white mb-2">
                Оплата <span className="text-red-500">плана</span>
              </h2>
              <p className="text-gray-400 text-sm">Заявка #{orderId} создана</p>
            </div>

            <div className="bg-black/50 border border-red-500/20 rounded-xl p-6 space-y-4">
              <div className="text-5xl font-orbitron font-bold text-white">300 ₽</div>
              <p className="text-gray-300 text-sm">Персональный план тренировок + питания + добавок</p>
            </div>

            <div className="bg-black/50 border border-yellow-500/30 rounded-xl p-5 text-left space-y-3">
              <div className="flex items-center gap-2 text-yellow-400 font-semibold">
                <Icon name="CreditCard" size={20} />
                <span>Оплата через Т-Банк</span>
              </div>
              <div className="text-white font-mono text-lg font-bold">+7 923 441-73-95</div>
              <p className="text-gray-400 text-sm">
                Переведи <span className="text-white font-bold">300 рублей</span> по номеру телефона через Т-Банк.
                В комментарии укажи: <span className="text-red-400 font-bold">Форма Жизни #{orderId}</span>
              </p>
            </div>

            <div className="text-gray-400 text-xs bg-black/30 rounded-lg p-3">
              После перевода нажми кнопку ниже — тренер получит уведомление и выйдет на связь в чате в течение нескольких часов.
            </div>

            <Button
              onClick={handlePaymentDone}
              disabled={loading}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 text-base"
            >
              {loading ? "Подтверждаем..." : "✅ Я оплатил — открыть чат"}
            </Button>

            <button
              onClick={() => setStep("form")}
              className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
            >
              ← Вернуться к анкете
            </button>
          </div>
        )}

        {/* Step: CHAT */}
        {step === "chat" && (
          <div className="flex flex-col h-[90vh] max-h-[600px]">
            <div className="p-4 border-b border-red-500/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Icon name="User" size={18} className="text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold font-orbitron text-sm">Тренер Форма Жизни</p>
                <p className="text-green-400 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block"></span>
                  Ответит в течение нескольких часов
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 text-sm mt-8">Загружаем сообщения...</div>
              )}
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-red-500 text-white rounded-br-sm"
                        : "bg-white/10 text-white rounded-bl-sm border border-white/10"
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-red-500/20 flex gap-2">
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
