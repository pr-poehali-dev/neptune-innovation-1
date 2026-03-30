import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function FAQSection() {
  const faqs = [
    {
      question: "Подойдёт ли план, если я никогда не тренировался?",
      answer:
        "Да! При заполнении анкеты ты указываешь уровень подготовки — новичок, средний или продвинутый. Система составит план с нуля и будет постепенно увеличивать нагрузку.",
    },
    {
      question: "Что нужно указать для составления плана?",
      answer:
        "Рост, вес, возраст, пол, уровень физической активности, цель (похудение, набор массы, рельеф или выносливость) и наличие инвентаря или доступа к залу.",
    },
    {
      question: "Как быстро я получу план?",
      answer:
        "Мгновенно. После заполнения анкеты план тренировок, питания и добавок формируется автоматически — занимает несколько секунд.",
    },
    {
      question: "Можно ли тренироваться дома?",
      answer:
        "Да. При составлении плана ты указываешь, где тренируешься — дома, в зале или на улице. Программа адаптируется под доступный инвентарь.",
    },
    {
      question: "Как часто обновляется план?",
      answer:
        "Каждые 2-4 недели или при изменении твоих параметров. Тело прогрессирует — план растёт вместе с тобой.",
    },
    {
      question: "Нужно ли разбираться в питании и добавках?",
      answer:
        "Нет. Система всё объясняет: что есть, в каком количестве и когда. Добавки подбираются с конкретными дозировками и объяснением зачем они нужны.",
    },
  ]

  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-orbitron">Частые вопросы</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto font-space-mono">
            Всё, что ты хотел знать о персональных планах FitCore AI
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-red-500/20 mb-4">
                <AccordionTrigger className="text-left text-lg font-semibold text-white hover:text-red-400 font-orbitron px-6 py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-300 leading-relaxed px-6 pb-4 font-space-mono">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
