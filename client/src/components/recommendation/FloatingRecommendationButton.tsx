"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RecommendationDialog from "./RecommendationDialog";

export default function FloatingRecommendationButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="rounded-full h-14 w-14 sm:h-16 sm:w-16 shadow-lg hover:shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300"
              aria-label="Get medicine recommendations"
            >
              <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" />
            </Button>
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
