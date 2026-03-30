import { Button } from "@/components/ui/button"

interface CTAProps {
  onOpenOrder?: () => void
}

export function CTASection({ onOpenOrder }: CTAProps) {
  return (
    <section className="py-24 px-6 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
      <div className="max-w-4xl mx-auto text-center">
        <div className="slide-up">
          <h2 className="text-5xl font-bold text-foreground mb-6 font-sans text-balance">Готов изменить своё тело?</h2>
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
            Заполни анкету за 3 минуты — получи персональный план тренировок, питания и добавок уже сегодня.
            Тысячи молодых людей уже начали свой путь.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={onOpenOrder}
              className="bg-primary text-primary-foreground hover:bg-primary/90 pulse-button text-lg px-8 py-4"
            >
              Получить мой план за 300 ₽
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onOpenOrder}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground text-lg px-8 py-4 bg-transparent"
            >
              Заполнить анкету
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
