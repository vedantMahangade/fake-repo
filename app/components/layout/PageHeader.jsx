"use client";

import { motion } from "framer-motion";
import { fadeUp, fadeUpTransition } from "../../lib/motion.js";
import { useMotionSafe } from "../../lib/motion.js";

export default function PageHeader({ title, description, children }) {
  const { fadeUp: safeFadeUp, transition } = useMotionSafe();

  return (
    <motion.header
      {...safeFadeUp}
      transition={transition}
      className="mb-[var(--section-y)]"
    >
      <h1 className="text-3xl md:text-4xl font-sans font-medium tracking-tight text-text mb-3">
        {title}
      </h1>
      {description && (
        <div className="text-muted text-sm md:text-base leading-relaxed max-w-2xl">
          {description}
        </div>
      )}
      {children}
    </motion.header>
  );
}
