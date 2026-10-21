import { Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/* La imagen de IA Esther va en: public/esther.png
   Si todavía no existe, se muestra un avatar animado y NO da error. */
const ESTHER_IMAGE = "/esther.png";

export function LaptopCta() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Abierta al entrar, se cierra con el scroll y se reabre al subir
  const lidAngle = useTransform(scrollYProgress, [0, 0.35, 0.85], [0, 0, -84]);
  const screenOpacity = useTransform(scrollYProgress, [0.45, 0.8], [1, 0.15]);
  const glowOpacity = useTransform(scrollYProgress, [0.35, 0.85], [0.7, 0.15]);

  return (
    <section className="px-5 pb-16 lg:px-8 lg:pb-20">
      <div ref={sectionRef} className="relative mx-auto h-[220vh] max-w-6xl">
        <div className="sticky top-4 h-[calc(100vh-2rem)] min-h-[560px]">
          <div className="ce-cta-bg relative flex h-full flex-col items-center justify-center overflow-hidden rounded-[2rem] px-6 py-8 text-center shadow-[0_25px_70px_rgba(88,28,135,0.22)] sm:px-10">
            <motion.div
              aria-hidden="true"
              style={{
                opacity: glowOpacity,
                background:
                  "radial-gradient(circle, rgba(232,121,249,0.45) 0%, transparent 65%)",
              }}
              className="pointer-events-none absolute left-1/2 top-[58%] size-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            />

            <div className="relative z-10">
              <h2 className="mx-auto max-w-3xl text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                Empezá a gestionar tu clínica con{" "}
                <span className="ce-cta-text">Cloud Esther</span>
              </h2>

              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/75 lg:text-base">
                Explorá la plataforma con datos de ejemplo o contratá el plan
                para tu clínica.
              </p>

              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <div className="ce-cta-btn-glow rounded-xl">
                  <Button
                    asChild
                    size="xl"
                    className="w-full rounded-xl bg-white text-primary shadow-lg shadow-black/10 hover:bg-white/90"
                  >
                    <Link to="/registro">
                      Probar demo
                      <motion.span
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                        className="inline-flex"
                      >
                        <ArrowRight className="size-4" />
                      </motion.span>
                    </Link>
                  </Button>
                </div>

                <Button
                  asChild
                  size="xl"
                  variant="outline"
                  className="rounded-xl border-white/35 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/demostracion">Contratar servicio</Link>
                </Button>
              </div>
            </div>

            {/* COMPUTADORA */}
            <div
              className="relative z-10 mt-6 w-full max-w-[560px] sm:max-w-[620px]"
              style={{ perspective: 1600 }}
            >
              <motion.div
                style={{
                  rotateX: lidAngle,
                  transformOrigin: "50% 100%",
                  transformStyle: "preserve-3d",
                }}
                className="relative mx-auto w-[86%]"
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl border-[7px] border-b-0 border-[#1b1230] bg-[#1b1230] shadow-[0_0_40px_rgba(232,121,249,0.35)]">
                  <span className="absolute left-1/2 top-1 z-20 size-1 -translate-x-1/2 rounded-full bg-white/30" />

                  <motion.div
                    style={{ opacity: screenOpacity }}
                    className="relative h-full w-full overflow-hidden bg-gradient-to-br from-[#2e1065] via-[#5b21b6] to-[#a855f7]"
                  >
                    <div className="absolute inset-x-0 top-0 flex items-center gap-1.5 bg-black/20 px-3 py-1.5">
                      <span className="size-1.5 rounded-full bg-white/50" />
                      <span className="size-1.5 rounded-full bg-white/35" />
                      <span className="size-1.5 rounded-full bg-white/20" />
                      <span className="ml-2 text-[9px] font-semibold text-white/70">
                        IA Esther
                      </span>
                    </div>

                    {/* aura infinita */}
                    <motion.div
                      aria-hidden="true"
                      animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.35, 0.75, 0.35] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute bottom-0 right-[14%] h-[85%] w-[45%] rounded-full"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)",
                      }}
                    />

                    {/* globo de saludo */}
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute left-[6%] top-[30%] max-w-[46%] rounded-2xl rounded-bl-sm bg-white/95 px-3 py-2 text-left shadow-lg"
                    >
                      <p className="text-[10px] font-bold text-primary sm:text-xs">
                        Hola, soy Esther
                      </p>
                      <p className="mt-0.5 text-[9px] leading-snug text-muted-foreground sm:text-[11px]">
                        Tu asistente virtual. ¿En qué puedo ayudarte hoy?
                      </p>
                    </motion.div>

                    {/* IA Esther flotando y respirando en loop infinito */}
                    <motion.div
                      animate={{ y: [0, -7, 0], scale: [1, 1.025, 1] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute bottom-0 right-[12%] flex h-[88%] w-[40%] items-end justify-center"
                    >
                      {!imgFailed ? (
                        <img
                          src={ESTHER_IMAGE}
                          alt="IA Esther"
                          draggable={false}
                          onError={() => setImgFailed(true)}
                          className="h-full w-auto max-w-none object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.35)]"
                        />
                      ) : (
                        <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-white/20 text-3xl font-bold text-white shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                          E
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>

              {/* base */}
              <div className="relative mx-auto h-3 w-full rounded-b-[1.2rem] bg-gradient-to-b from-[#d9d4e6] to-[#9d94b8] shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:h-3.5">
                <span className="absolute left-1/2 top-0 h-1 w-[18%] -translate-x-1/2 rounded-b-md bg-[#7d7498]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}