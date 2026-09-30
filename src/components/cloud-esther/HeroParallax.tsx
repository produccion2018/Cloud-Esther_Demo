import { useEffect, useRef } from "react";
import heroFondo from "@/assets/hero-fondo.webp";
import heroPersonaje1 from "@/assets/hero-personaje-1.webp";
import heroPersonaje2 from "@/assets/hero-personaje-2.webp";
import heroPersonaje3 from "@/assets/hero-personaje-3.webp";

/* Ubicación: src/components/cloud-esther/HeroParallax.tsx

   Ilustración animada del consultorio (capas con parallax y "respiración"). La usan el
   Dashboard y el Portal del paciente. */

const CAPAS_HERO: {
  src: string;
  profundidad: number;
  respira?: { origen: string; duracion: number; demora: number };
}[] = [
  { src: heroFondo, profundidad: 3 },
  { src: heroPersonaje1, profundidad: 6, respira: { origen: "38% 72%", duracion: 5.2, demora: 0 } },
  {
    src: heroPersonaje2,
    profundidad: 8,
    respira: { origen: "56% 74%", duracion: 6.1, demora: -1.8 },
  },
  {
    src: heroPersonaje3,
    profundidad: 10,
    respira: { origen: "80% 76%", duracion: 5.7, demora: -3.1 },
  },
];

/** completo: muestra la ilustración entera (sin recortar); si no, cubre todo el contenedor.
    foco: posición vertical del recorte al cubrir (0 = arriba, 50 = centro, 100 = abajo). */
export function HeroParallax({ completo = false, foco = 50 }: { completo?: boolean; foco?: number } = {}) {
  const contRef = useRef<HTMLDivElement>(null);
  const capasRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const cont = contRef.current;
    if (!cont) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let objetivo: { x: number; y: number } | null = null;
    const actual = { x: 0, y: 0 };
    let visible = true;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const r = cont.getBoundingClientRect();
      const dentro =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top - 40 &&
        e.clientY <= r.bottom + 40;
      objetivo = dentro
        ? {
            x: ((e.clientX - r.left) / r.width - 0.5) * 2,
            y: ((e.clientY - r.top) / r.height - 0.5) * 2,
          }
        : null;
    };

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((en) => en.isIntersecting);
    });
    io.observe(cont);
    window.addEventListener("pointermove", onMove, { passive: true });

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      const s = t / 1000;
      const tx = objetivo ? objetivo.x : Math.sin(s * 0.35) * 0.6;
      const ty = objetivo ? objetivo.y : Math.cos(s * 0.27) * 0.35;
      actual.x += (tx - actual.x) * 0.06;
      actual.y += (ty - actual.y) * 0.06;
      CAPAS_HERO.forEach((capa, i) => {
        const el = capasRef.current[i];
        if (!el) return;
        const dx = (-actual.x * capa.profundidad).toFixed(2);
        const dy = (-actual.y * capa.profundidad * 0.5).toFixed(2);
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      });
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div
      ref={contRef}
      role="img"
      aria-label="Consultorio odontológico"
      className={`absolute inset-0 overflow-hidden ${completo ? "" : "opacity-80"}`}
      style={{ containerType: "size" } as React.CSSProperties}
    >
      <style>{`
        @keyframes heroRespiraCE {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
          50% { transform: translateY(-1.5px) rotate(0.12deg) scale(1.004); }
        }
        .hero-respira-ce { animation: heroRespiraCE 5.5s ease-in-out infinite; }
        @keyframes heroZoomCE {
          0% { transform: scale(1); }
          50% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        .hero-zoom-ce { animation: heroZoomCE 16s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .hero-respira-ce, .hero-zoom-ce { animation: none; }
        }
      `}</style>

      <div
        className="absolute left-1/2 top-1/2"
        style={
          {
            width: completo ? "min(100cqw, calc(100cqh * 1536 / 868))" : "max(106cqw, calc(106cqh * 1536 / 868))",
            aspectRatio: "1536 / 868",
            top: completo ? "50%" : `${foco}%`,
            transform: `translate(-50%, -${completo ? 50 : foco}%)`,
          } as React.CSSProperties
        }
      >
        <div className={`absolute inset-0 ${completo ? "" : "hero-zoom-ce"}`}>
          {CAPAS_HERO.map((capa, i) => (
            <div
              key={capa.src}
              ref={(el) => {
                capasRef.current[i] = el;
              }}
              className="absolute inset-0 will-change-transform"
            >
              <div
                className={`absolute inset-0 ${capa.respira ? "hero-respira-ce" : ""}`}
                style={
                  capa.respira
                    ? {
                        transformOrigin: capa.respira.origen,
                        animationDuration: `${capa.respira.duracion}s`,
                        animationDelay: `${capa.respira.demora}s`,
                      }
                    : undefined
                }
              >
                <img src={capa.src} alt="" draggable={false} className="size-full select-none" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
