import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Atom } from 'lucide-react';

export default function Preloader({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide preloader after 2.5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 800);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden"
        >
          {/* Ambient Blackhole Glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0.2 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="w-96 h-96 bg-orange-600 rounded-full blur-[120px]"
            />
          </div>

          <div className="relative flex flex-col items-center z-10">
            {/* Animated Logo */}
            <motion.div
              initial={{ scale: 0.5, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ duration: 1, type: "spring", bounce: 0.4 }}
              className="relative w-24 h-24 flex items-center justify-center mb-6"
            >
              {/* Orbital Rings */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent opacity-80"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-full border border-b-amber-400 border-r-transparent border-t-transparent border-l-transparent opacity-80"
              />
              <Atom className="w-10 h-10 text-white drop-shadow-[0_0_15px_rgba(249,115,22,0.9)]" />
            </motion.div>

            {/* Typography */}
            <div className="flex flex-col items-center overflow-hidden">
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1], delay: 0.2 }}
              >
                <h1 className="text-3xl font-bold tracking-[0.2em] text-white">
                  BIOSPACE
                </h1>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
                className="mt-2"
              >
                <span className="text-xs tracking-[0.4em] text-orange-400 uppercase font-medium">
                  Initializing System
                </span>
              </motion.div>
            </div>

            {/* Loading Bar */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "200px", opacity: 1 }}
              transition={{ duration: 0.5, delay: 1 }}
              className="h-[1px] bg-white/20 mt-8 relative overflow-hidden"
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-orange-500 to-transparent"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
