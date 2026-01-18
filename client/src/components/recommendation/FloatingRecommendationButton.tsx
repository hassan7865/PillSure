"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pill } from "lucide-react";
import RecommendationDialog from "./RecommendationDialog";

export default function FloatingRecommendationButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              rotate: 0,
            }}
            exit={{ scale: 0, opacity: 0, rotate: 180 }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 20,
              duration: 0.6
            }}
            className="fixed bottom-6 right-6 z-40"
          >
            <motion.button
              onClick={() => setIsOpen(true)}
              className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full shadow-lg hover:shadow-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center group"
              aria-label="Get medicine recommendations"
              whileHover={{ scale: 1.1, rotate: 360 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                y: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                rotate: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
            >
              {/* Pulsing ring effect */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/30"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/20"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.3,
                }}
              />
              
              {/* Icon */}
              <motion.div
                animate={{
                  rotate: [0, -10, 10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Pill className="h-8 w-8 sm:h-10 sm:w-10 relative z-10" />
              </motion.div>
              
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{
                  x: ["-100%", "200%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                  repeatDelay: 1,
                }}
              />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <RecommendationDialog
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  );
}
