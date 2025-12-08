import "./index.css";

export function App() {
  return (
    <div className="min-h-screen w-full flex flex-col relative">

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* Animated background particles/orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-40 right-20 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl animate-float-delayed"></div>
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-yellow-400/15 rounded-full blur-3xl animate-float-slow"></div>
        </div>

        {/* Logo/Title Section */}
        <div className="relative z-10 text-center mb-8">
          {/* Glowing logo with pulsating effect */}
          <div className="relative inline-block mb-6">
            <div className="p-0.5 bg-gradient-to-br from-amber-400 via-orange-400 to-yellow-400 rounded-2xl shadow-2xl shadow-amber-500/50 animate-glow">
              <img
                src="/images/logo3.png"
                alt="Mini Mythics"
                className="w-[20rem] md:w-[28rem] h-auto rounded-xl"
              />
            </div>
          </div>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-amber-100 font-medium mb-2">
            Fantasy RPG • Class Evolution • Companion System
          </p>
        </div>

        {/* Development Status Card */}
        <div className="relative z-10 w-full max-w-lg">
          <div className="bg-gradient-to-br from-amber-900/80 to-stone-900/90 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-8 shadow-xl">
            {/* Status Badge */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-400/30 rounded-full">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <span className="text-amber-300 font-semibold text-sm uppercase tracking-wider">
                  In Development
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-amber-100/80 text-center leading-relaxed mb-6 text-wrap break-words">
              We're crafting an epic adventure where you'll evolve from a humble adventurer
              into a legendary hero. Choose your class, unlock powerful abilities, and bond
              with mystical companions on your journey.
            </p>

            {/* Feature Highlights */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-amber-800/40 rounded-lg border border-amber-600/30">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">4</div>
                <span className="text-amber-100 text-sm font-medium">Base Classes</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-800/40 rounded-lg border border-amber-600/30">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold">8</div>
                <span className="text-amber-100 text-sm font-medium">Subclasses</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-800/40 rounded-lg border border-amber-600/30">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <span className="text-amber-100 text-sm font-medium">Companions</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-800/40 rounded-lg border border-amber-600/30">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-amber-100 text-sm font-medium">Skill Evolution</span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-amber-600/50 to-transparent mb-6"></div>

            {/* Stay Tuned */}
            <p className="text-center text-amber-200/60 text-sm">
              Stay tuned for updates on our epic journey
            </p>
          </div>
        </div>

        {/* Footer area with subtle branding */}
        <div className="relative z-10 mt-12 text-center">
          <p className="text-amber-200/70 text-sm">
            © 2024 Mini Mythics • All rights reserved
          </p>
        </div>
      </main>

      {/* Character art - bottom right corner */}
      <img
        src="/images/characters.png"
        alt="Mini Mythics Characters"
        className="fixed bottom-0 right-0 w-80 h-auto pointer-events-none z-20 opacity-90"
      />
    </div>
  );
}

export default App;
