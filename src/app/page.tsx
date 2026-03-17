import { HeroSection } from "@/components/landing/hero-section";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { TechStackBanner } from "@/components/landing/tech-stack-banner";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <HeroSection />
        <FeatureGrid />
      </main>
      <footer>
        <TechStackBanner />
      </footer>
    </div>
  );
}
