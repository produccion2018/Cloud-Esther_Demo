import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CalendarCheck, Clock, MessageCircle, ShieldAlert } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

/* Ubicación: src/components/site/AgenteSection.tsx
   Sección destacada de la página pública para el Agente 24/7 (atención por WhatsApp).
   Es el diferencial que Camilo quiere mostrar a quien se va a suscribir. Con efecto: un chat
   de WhatsApp que se va escribiendo solo y una tarjeta que flota. */

const BURBUJAS: { de: "paciente" | "agente"; texto: string }[] = [
  { de: "paciente", texto: "Hola, me duele una muela 😣 ¿tienen turno?" },
  { de: "agente", texto: "¡Hola! Lo resolvemos. Tengo turno mañana 9:30 o 11:00 🦷" },
  { de: "paciente", texto: "Mañana 9:30 👍" },
  { de: "agente", texto: "¡Listo! Te agendé mañana 9:30. Te paso la dirección 📍" },
];

const VENTAJAS = [
  { i: Clock, t: "Atiende 24/7", d: "De noche, fines de semana y feriados, incluso con la clínica cerrada." },
  { i: CalendarCheck, t: "Agenda turnos solo", d: "Mira la agenda real y reserva sin que nadie mueva un dedo." },
  { i: ShieldAlert, t: "Detecta urgencias", d: "Reconoce un dolor o un golpe y lo prioriza." },
];

export function AgenteSection() {
  return (
    <section className="relative overflow-hidden bg-soft py-20 lg:py-24">
      {/* glows */}
      <div aria-hidden className="pointer-events-none absolute -left-24 top-10 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 bottom-0 size-72 rounded-full bg-fuchsia-400/10 blur-3xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2 lg:gap-16 lg:px-8">
        {/* ── Texto ── */}
        <Reveal>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-lavender px-3.5 py-1.5 text-xs font-semibold text-lavender-foreground">
            Nuevo · Plan Enterprise
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight lg:text-[42px] lg:leading-[1.05]">
            Un Agente 24/7 que atiende tu WhatsApp
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Responde a tus pacientes al instante, a cualquier hora. Entiende mensajes y audios, agenda
            turnos reales en tu agenda y te deriva las urgencias. Tu clínica nunca deja de atender.
          </p>

          <div className="mt-7 space-y-3">
            {VENTAJAS.map((v) => (
              <div key={v.t} className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <v.i className="size-4" />
                </span>
                <div>
                  <p className="text-[14px] font-semibold">{v.t}</p>
                  <p className="text-[12.5px] text-muted-foreground">{v.d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link
              to="/demostracion"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_-12px_rgba(124,58,237,0.8)] transition hover:-translate-y-0.5"
            >
              <MessageCircle className="size-4" /> Quiero el Agente 24/7
            </Link>
          </div>
        </Reveal>

        {/* ── Teléfono con chat animado ── */}
        <Reveal delay={0.1}>
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="relative mx-auto w-full max-w-[320px]"
          >
            <div className="rounded-[36px] border border-primary/15 bg-card p-3 shadow-[0_30px_70px_-30px_rgba(76,29,149,0.6)]">
              {/* encabezado del chat */}
              <div className="flex items-center gap-3 rounded-t-[26px] bg-gradient-to-r from-[#4c1d95] to-[#7c3aed] px-4 py-3 text-white">
                <div className="grid size-9 place-items-center rounded-full bg-white/20 text-sm font-bold">E</div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-none">Clínica Dental</p>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-white/80">
                    <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-300" /> en línea · responde al instante
                  </p>
                </div>
              </div>

              {/* burbujas */}
              <div className="space-y-2 bg-[#ece5dd] px-3 py-4 dark:bg-[#1f1a2e]">
                {BURBUJAS.map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.7, duration: 0.4 }}
                    className={`flex ${b.de === "paciente" ? "justify-end" : "justify-start"}`}
                  >
                    <span
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-[12px] leading-snug shadow-sm ${
                        b.de === "paciente"
                          ? "rounded-br-sm bg-[#d9fdd3] text-[#111b21]"
                          : "rounded-bl-sm bg-white text-[#111b21]"
                      }`}
                    >
                      {b.texto}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* barra de turno agendado */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + BURBUJAS.length * 0.7, duration: 0.4 }}
                className="flex items-center gap-2 rounded-b-[26px] bg-emerald-50 px-4 py-3 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                <CalendarCheck className="size-4" />
                <span className="text-[12px] font-semibold">Turno agendado · mañana 9:30</span>
              </motion.div>
            </div>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}
