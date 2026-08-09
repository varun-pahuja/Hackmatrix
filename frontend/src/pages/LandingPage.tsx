import { useEffect, useState } from 'react';
import { BlackHoleHeroSection } from '@/components/ui/blackhole-hero-section';
import { HorizonHeroSection } from '@/components/ui/horizon-hero-section';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface LandingPageProps {
  onStartResearch: () => void;
}

/** True while the viewport is narrow. Drives the layout swap below. */
function useNarrow(query = "(max-width: 767px)") {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const sync = () => setNarrow(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, [query]);
  return narrow;
}

export default function LandingPage({ onStartResearch }: LandingPageProps) {
  const narrow = useNarrow();

  return (
    <div className="bg-black">
      {/* Top Navigation */}
      <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-6 lg:px-12 pointer-events-none transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center bg-black/50 backdrop-blur-md">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-semibold tracking-wide text-sm">
              BIOSPACE
            </h1>
            <p className="text-white/50 text-[10px] uppercase tracking-[0.2em]">
              Intelligence
            </p>
          </div>
        </div>
        
        <div className="pointer-events-auto">
          <button
            onClick={onStartResearch}
            className="group relative flex items-center gap-2 px-5 py-2.5 rounded-full overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors"
          >
            <span className="relative text-sm font-semibold text-white tracking-wide flex items-center gap-2">
              Launch Assistant
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        </div>
      </nav>

      <section className="relative h-screen w-full">
        <BlackHoleHeroSection
          focus={narrow ? [0.5, 0.76] : [0.72, 0.46]}
          scrim={narrow ? "top" : "left"}
          scrimStrength={0.9}
          distance={24}
          elevation={narrow ? -7 : -5.5}
          fov={narrow ? 58 : 42}
          glow={narrow ? 0.85 : 1}
          steps={narrow ? 200 : 300}
          resolution={narrow ? 0.6 : 0.7}
        >
          <div className="flex h-full min-h-[92svh] items-start px-6 pt-[120px] sm:px-10 md:min-h-[720px] md:items-center md:pt-0 lg:px-20 relative z-10 pointer-events-none">
            <div className="max-w-[40rem] pointer-events-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/70 text-xs tracking-wider mb-6 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                  OSDR INTELLIGENCE SYSTEM
                </div>
              </motion.div>

              <motion.h1 
                className="text-[3rem] font-light leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4.5rem]"
                initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
              >
                Decode the <br />
                <span className="font-medium text-white/90">Biology of Space</span>
              </motion.h1>

              <motion.p 
                className="mt-6 max-w-lg text-[1rem] leading-relaxed text-white/60 md:mt-8 md:text-lg font-light"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.4 }}
              >
                An AI-powered interface that synthesizes NASA's Open Science Data Repository. Ask complex questions, get cited answers instantly.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.6 }}
                className="mt-10 md:mt-12 flex flex-col gap-2"
              >
                <span className="text-white/30 text-xs tracking-[0.2em] uppercase ml-1 animate-pulse">
                  Scroll to descend
                </span>
                <div className="w-[1px] h-[60px] bg-gradient-to-b from-white/30 to-transparent ml-4" />
              </motion.div>
            </div>
          </div>
        </BlackHoleHeroSection>
      </section>

      {/* Horizon component handles its own scroll logic inside its height */}
      <HorizonHeroSection onCompleteAction={onStartResearch} />
      
    </div>
  );
}
