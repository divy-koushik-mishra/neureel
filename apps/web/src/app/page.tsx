import { AuthorityStrip } from "@/components/landing/AuthorityStrip";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { LiveDemo } from "@/components/landing/LiveDemo";
import { Method } from "@/components/landing/Method";
import { NavBar } from "@/components/landing/NavBar";
import { RegionsPlate } from "@/components/landing/RegionsPlate";
import { Science } from "@/components/landing/Science";
import { UseCases } from "@/components/landing/UseCases";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <NavBar />
      <main>
        <Hero />
        <AuthorityStrip />
        <Method />
        <LiveDemo />
        <RegionsPlate />
        <Science />
        <UseCases />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
