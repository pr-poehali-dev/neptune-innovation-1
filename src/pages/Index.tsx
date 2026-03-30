import { useState } from "react"
import { Hero3DWebGL as Hero3D } from "@/components/hero-webgl"
import { FeaturesSection } from "@/components/features-section"
import { TechnologySection } from "@/components/technology-section"
import { ApplicationsTimeline } from "@/components/applications-timeline"
import { AboutSection } from "@/components/about-section"
import { SafetySection } from "@/components/safety-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { FAQSection } from "@/components/faq-section"
import { CTASection } from "@/components/cta-section"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { OrderModal } from "@/components/order-modal"

export default function Index() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="dark">
      <Navbar onOpenOrder={() => setModalOpen(true)} />
      <main>
        <Hero3D onOpenOrder={() => setModalOpen(true)} />
        <FeaturesSection />
        <section id="technology">
          <TechnologySection />
        </section>
        <ApplicationsTimeline />
        <AboutSection />
        <section id="safety">
          <SafetySection />
        </section>
        <TestimonialsSection />
        <section id="faq">
          <FAQSection />
        </section>
        <CTASection onOpenOrder={() => setModalOpen(true)} />
      </main>
      <Footer />
      <OrderModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
