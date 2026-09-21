import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { Header } from "./Header";
import { Footer } from "./Footer";

/* =========================================================
   BOTÓN PARA VOLVER ARRIBA
========================================================= */
function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          aria-label="Volver arriba"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          initial={{ opacity: 0, y: 16, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.85 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="group fixed bottom-5 right-5 z-40 flex size-10 items-center justify-center rounded-full border border-white/40 bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 text-white shadow-[0_10px_30px_rgba(124,58,237,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 sm:bottom-7 sm:right-7"
        >
          <ArrowUp className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5" />

          <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/25 via-transparent to-transparent" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <Header />
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1"
      >
        {children}
      </motion.main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
}) {
  return (
    <section className="relative overflow-hidden bg-soft">
      <div className="bg-glow pointer-events-none absolute inset-x-0 top-0 h-96" />
      <div className="relative mx-auto max-w-4xl px-5 py-20 text-center lg:px-8 lg:py-28">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center rounded-full border border-primary/20 bg-lavender px-3.5 py-1.5 text-xs font-semibold tracking-wide text-lavender-foreground uppercase"
        >
          {eyebrow}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="mt-5 text-4xl leading-tight font-bold text-balance lg:text-5xl"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16 }}
          className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground lg:text-lg"
        >
          {subtitle}
        </motion.p>
      </div>
    </section>
  );
}