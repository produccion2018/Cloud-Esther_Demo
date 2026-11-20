import { useNavigate } from "@tanstack/react-router";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* Ubicación: src/components/site/SlideToDemo.tsx

   Botón DESLIZABLE "Probar demo" para tablet y celular. En vez de un botón que se toca,
   el usuario arrastra la píldora morada hacia la derecha por la pista; al pasar el umbral
   se "completa" y abre el demo (/registro). Si no llega, vuelve sola al inicio.

   Pensado para tocar con el dedo (touch-none en la píldora para que el gesto no haga scroll).

   Prop `tono`:
   - "claro": pista lavanda (#ece7f3). Para fondos claros (menú, header).
   - "sobreOscuro": pista blanca translúcida. Para el hero (fondo morado). */
export function SlideToDemo({
  className = "",
  tono = "claro",
  onAbrir,
}: {
  className?: string;
  tono?: "claro" | "sobreOscuro";
  /** Se llama justo antes de navegar (p. ej. para cerrar el menú). */
  onAbrir?: () => void;
}) {
  const navigate = useNavigate();
  const pistaRef = useRef<HTMLDivElement>(null);
  const pildoraRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [maxX, setMaxX] = useState(0);
  const [listo, setListo] = useState(false);

  // El texto y las flechas de la pista se desvanecen a medida que la píldora avanza.
  const opacidadPista = useTransform(x, [0, Math.max(1, maxX * 0.55)], [1, 0]);

  useEffect(() => {
    const medir = () => {
      const pista = pistaRef.current;
      const pil = pildoraRef.current;
      if (!pista || !pil) return;
      // 8px = padding (4px a cada lado) de la pista.
      setMaxX(Math.max(0, pista.clientWidth - pil.offsetWidth - 8));
    };
    medir();
    window.addEventListener("resize", medir);
    // Volver a medir cuando terminan de cargar las fuentes (cambia el ancho del texto).
    const id = window.setTimeout(medir, 350);
    return () => {
      window.removeEventListener("resize", medir);
      window.clearTimeout(id);
    };
  }, []);

  const soltar = () => {
    if (listo) return;
    if (maxX > 0 && x.get() >= maxX * 0.6) {
      // Llegó: se completa y abre el demo.
      setListo(true);
      animate(x, maxX, { type: "spring", stiffness: 440, damping: 38 });
      window.setTimeout(() => {
        onAbrir?.();
        void navigate({ to: "/registro" });
      }, 320);
    } else {
      // No llegó: vuelve al inicio.
      animate(x, 0, { type: "spring", stiffness: 520, damping: 42 });
    }
  };

  const claro = tono === "claro";

  return (
    <div
      ref={pistaRef}
      role="button"
      aria-label="Deslizá para probar el demo"
      className={`relative flex h-14 select-none items-center rounded-full p-1 ${
        claro
          ? "bg-[#ece7f3] shadow-inner"
          : "border border-white/20 bg-white/10 backdrop-blur-sm"
      } ${className}`}
    >
      {/* Texto guía centrado */}
      <motion.span
        style={{ opacity: opacidadPista }}
        className={`pointer-events-none absolute inset-0 flex items-center justify-center pr-8 text-[14px] font-semibold ${
          claro ? "text-primary/70" : "text-white/80"
        }`}
      >
        Deslizá para probar
      </motion.span>

      {/* Flechas animadas que invitan a deslizar */}
      <motion.span
        style={{ opacity: opacidadPista }}
        aria-hidden
        className={`pointer-events-none absolute right-5 flex items-center ${
          claro ? "text-primary/35" : "text-white/45"
        }`}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.18 }}
            className={i === 0 ? "" : "-ml-2"}
          >
            <ChevronRight className="size-4" />
          </motion.span>
        ))}
      </motion.span>

      {/* Píldora deslizable = el botón "Probar demo" */}
      <motion.div
        ref={pildoraRef}
        drag="x"
        dragConstraints={{ left: 0, right: maxX }}
        dragElastic={0.05}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={soltar}
        whileTap={{ scale: 0.98 }}
        className="relative z-10 flex h-12 min-w-[150px] cursor-grab touch-none items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#b43ae6,#f138df)] px-5 text-[15px] font-semibold text-white shadow-[0_10px_26px_rgba(180,58,230,0.4)] active:cursor-grabbing"
      >
        {listo && <Check className="size-4" />}
        Probar demo
        <motion.span
          animate={listo ? { x: 0 } : { x: [0, 4, 0] }}
          transition={{ duration: 1.3, repeat: listo ? 0 : Infinity, ease: "easeInOut" }}
          className="inline-flex"
        >
          <ArrowRight className="size-4" />
        </motion.span>
      </motion.div>
    </div>
  );
}

export default SlideToDemo;
