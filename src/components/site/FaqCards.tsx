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
          <motion.button
            type="button"
            key={item.q}
            onClick={() => setOpen(isOpen ? null : i)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (i % 4) * 0.07 }}
            className={`card-premium cursor-pointer p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-glow ${
              isOpen ? "border-primary/40" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="bg-lavender flex size-9 shrink-0 items-center justify-center rounded-xl">
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
                      <span className="mt-2 block text-sm text-muted-foreground">{item.a}</span>
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
          </motion.button>
        );
      })}
    </div>
  );
}
