import "./index.css";
import { Navbar } from "./components/Navbar";
import { Button } from "./components/ui/Button";
import { Card } from "./components/ui/Card";
import { Shield, Zap, Heart, Star, Sparkles } from "lucide-react";

export function App() {
  return (
    <div className="min-h-screen w-full relative">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-10 px-6 min-h-[60vh] flex flex-col items-center justify-center text-center overflow-hidden">

        {/* Main Content */}
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-amber-200 shadow-sm animate-bounce-slow">
            <Sparkles size={24} className="text-[var(--color-accent)]" />
            <span className="font-heading font-bold text-[var(--color-primary)] tracking-wide text-sm uppercase">Early Access Coming Soon</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-heading font-extrabold text-[var(--color-dark)] mb-6 leading-tight text-outline">
            Build Your <span className="text-[var(--color-accent)]">Legend</span>
          </h1>

          <p className="text-xl md:text-2xl text-[var(--color-dark)]/70 max-w-2xl mb-10 font-medium">
            Join the cutest RPG adventure! Evolve from a novice to a hero, collect companions, and save the realm.
          </p>

          <div className="flex flex-col md:flex-row gap-4 mt-8">
            <Button size="lg" className="min-w-[160px] text-lg bg-[#1C1C1E] border-[#3a3a3c] hover:bg-[#2c2c2e]">
              App Store
            </Button>
            <Button size="lg" className="min-w-[160px] text-lg bg-[#1C1C1E] border-[#3a3a3c] hover:bg-[#2c2c2e]">
              Google Play
            </Button>
          </div>
        </div>

      </section>

      {/* Features Section */}
      <section className="px-6 py-20 relative z-10 mb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[var(--color-dark)] mb-4">Epic Features</h2>
            <div className="h-2 w-24 bg-[var(--color-accent)] mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="text-white" size={32} />}
              title="Class Evolution"
              desc="Start as a novice and choose your path. Will you be a Knight, a Mage, or a Rogue?"
              color="bg-blue-500"
            />
            <FeatureCard
              icon={<Zap className="text-white" size={32} />}
              title="Dynamic Combat"
              desc="Fast-paced battles with flashy skills and strategic team compositions."
              color="bg-[var(--color-primary)]"
            />
            <FeatureCard
              icon={<Heart className="text-white" size={32} />}
              title="Companion Bond"
              desc="Befriend mystical creatures that fight by your side and grant special buffs."
              color="bg-[var(--color-accent)]"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/50 backdrop-blur-sm border-t-4 border-dashed border-[var(--color-wood)]/20 py-12 text-center relative overflow-hidden z-10">
        <div className="max-w-4xl mx-auto px-6 relative">
          {/* LOGO h-32 */}
          <img src="/images/logo3.png" alt="Logo" className="h-32 w-auto mx-auto mb-6 opacity-80 grayscale hover:grayscale-0 transition-all duration-500" />
          <p className="font-heading font-bold text-[var(--color-wood)]">
            © 2024 Mini Mythics. Crafted with ❤️ and Magic.
          </p>
        </div>
      </footer>

      {/* Boss Fixed at Bottom Left - Moved left (left-0) and down (translate-y-5) */}
      <div className="fixed bottom-0 left-[-40px] md:left-[-80px] z-50 pointer-events-none animate-float">
        <img
          src="/images/boss.png"
          alt="Boss"
          className="w-[400px] md:w-[600px] h-auto drop-shadow-2xl translate-y-8 object-contain"
        />
      </div>

      {/* Characters Fixed at Bottom Right */}
      <div className="fixed bottom-0 right-5 z-50 pointer-events-none animate-float">
        <img
          src="/images/characters.png"
          alt="Characters"
          className="w-[300px] md:w-[450px] h-auto drop-shadow-2xl translate-y-4 object-contain"
        />
      </div>

    </div>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) {
  return (
    <Card className="hover:-translate-y-2 transition-transform duration-300">
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center shadow-lg shadow-black/10 mb-6 rotate-3`}>
        {icon}
      </div>
      <h3 className="text-2xl font-heading font-bold text-[var(--color-dark)] mb-3">{title}</h3>
      <p className="text-[var(--color-dark)]/70 leading-relaxed font-medium">
        {desc}
      </p>
    </Card>
  )
}
export default App;
