import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const features = [
  {
    title: "Персональный план тренировок",
    description: "ИИ составляет программу тренировок под твои параметры: рост, вес, уровень подготовки и цель — сила, рельеф или выносливость.",
    icon: "dumbbell",
    badge: "Тренировки",
  },
  {
    title: "План питания под тебя",
    description: "Рацион с точным КБЖУ, учитывающий твой образ жизни, предпочтения и метаболизм. Никаких жёстких диет — только результат.",
    icon: "salad",
    badge: "Питание",
  },
  {
    title: "Подбор добавок",
    description: "Персональная схема спортивного питания: протеин, витамины, жиросжигатели — только то, что реально нужно твоему телу.",
    icon: "pill",
    badge: "Добавки",
  },
  {
    title: "Анализ параметров тела",
    description: "Вводишь вес, рост, возраст и образ жизни — система рассчитывает твою точку старта и строит маршрут к цели.",
    icon: "chart",
    badge: "ИИ-анализ",
  },
  {
    title: "Прогресс и обновления",
    description: "Планы обновляются по мере твоего прогресса. Тело меняется — программа адаптируется автоматически.",
    icon: "zap",
    badge: "Адаптивно",
  },
  {
    title: "Быстрый старт",
    description: "Заполни анкету за 3 минуты и получи готовый план уже сегодня. Без долгих консультаций и ожидания.",
    icon: "rocket",
    badge: "Быстро",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4 font-sans">Всё для твоего результата</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Персональные планы на основе твоих данных — тренировки, питание и добавки в одном месте
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="glow-border hover:shadow-lg transition-all duration-300 slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">
                    {feature.icon === "dumbbell" && "🏋️"}
                    {feature.icon === "salad" && "🥗"}
                    {feature.icon === "pill" && "💊"}
                    {feature.icon === "chart" && "📊"}
                    {feature.icon === "zap" && "⚡"}
                    {feature.icon === "rocket" && "🚀"}
                  </span>
                  <Badge variant="secondary" className="bg-accent text-accent-foreground">
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold text-card-foreground">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
