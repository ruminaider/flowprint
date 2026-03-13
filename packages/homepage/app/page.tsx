import { Header } from "@/components/sections/header"
import { HeroSection } from "@/components/sections/hero"
import { HomepageTabs } from "@/components/sections/homepage-tabs"
import { FooterSection } from "@/components/sections/footer"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <HomepageTabs />
      <FooterSection />
    </main>
  )
}
