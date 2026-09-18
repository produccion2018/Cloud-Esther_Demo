import { AnimatePresence, motion } from "framer-motion";
import { HelpCircle, Plus } from "lucide-react";
import { useState } from "react";

export function FaqCards({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <motion.div
            key={item.q}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (i % 4) * 0.07 }}
            className="group relative rounded-2xl p-[1.5px]"
          >
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_0deg,theme(colors.primary.DEFAULT),theme(colors.brand.DEFAULT),theme(colors.primary.DEFAULT))] opacity-0 blur-[2px] transition-opacity duration-300"
              style={{ opacity: isOpen ? 0.6 : 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 6.5, repeat: Infinity, ease: "linear" }}
            />
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="card-premium relative w-full cursor-pointer rounded-2xl p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
            >
              <div className="flex items-start gap-3">
                <span className="bg-lavender relative flex size-9 shrink-0 items-center justify-center rounded-xl">
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-xl bg-primary/30 blur-md"
                    animate={{ opacity: [0.25, 0.6, 0.25], scale: [1, 1.2, 1] }}
                    transition={{
                      duration: 2.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.15,
                    }}
                  />
                  <HelpCircle className="size-4.5 text-primary" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{item.q}</span>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.span
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="block overflow-hidden"
                      >
                        <span className="mt-2 block text-sm text-muted-foreground">
                          {item.a}
                        </span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-primary"
                >
                  <Plus className="size-5" />
                </motion.span>
              </div>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}