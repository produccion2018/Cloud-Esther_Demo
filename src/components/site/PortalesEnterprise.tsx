import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  CalendarCheck2,
  ClipboardList,
  Clock,
  CreditCard,
  Crown,
  FileText,
  Fingerprint,
  Pill,
  Smartphone,
  Stethoscope,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/site/Reveal";

/* Ubicación: src/components/site/PortalesEnterprise.tsx
   Promoción en la página principal de los dos portales exclusivos del plan Enterprise:
   Portal del paciente y Portal del profesional. */

const EASE = [0.22, 1, 0.36, 1] as const;

type Portal = {
  id: string;
  titulo: string;
  bajada: string;
  icon: LucideIcon;
  acento: string;
  usuario: string;
  rol: string;
  filas: { icon: LucideIcon; titulo: string; detalle: string }[];
  beneficios: string[];
};

const PORTALES: Portal[] = [
  {
    id: "paciente",
    titulo: "Portal del paciente",
    bajada: "Tus pacientes entran desde el celular con su DNI y un código.",
    icon: UserRound,
    acento: "from-fuchsia-400 to-violet-500",
    usuario: "Lucía Paz",
    rol: "Paciente",
    filas: [
      { icon: CalendarCheck2, titulo: "Próximo turno", detalle: "Jueves 10:30 · Limpieza" },
      { icon: Pill, titulo: "Receta disponible", detalle: "Amoxicilina 500 mg" },
      { icon: CreditCard, titulo: "Saldo al día", detalle: "Último pago registrado" },
      { icon: FileText, titulo: "Documentos", detalle: "Consentimiento para firmar" },
    ],
    beneficios: [
      "Confirma o reprograma sus turnos",
      "Ve recetas, estudios y presupuestos",
      "Consulta pagos y firma documentos",
    ],
  },
  {
    id: "profesional",
    titulo: "Portal del profesional",
    bajada: "Odontólogos, asistentes y secretaría, en el celular o la PC.",
    icon: Stethoscope,
    acento: "from-violet-400 to-indigo-500",
    usuario: "Dra. Laura Martínez",
    rol: "Odontóloga",
    filas: [
      { icon: Clock, titulo: "Agenda de hoy", detalle: "8 turnos · próximo 09:30" },
      { icon: ClipboardList, titulo: "Ficha del paciente", detalle: "Historia y odontograma" },
      { icon: Fingerprint, titulo: "Fichaje", detalle: "Entrada registrada 08:02" },
      { icon: BellRing, titulo: "Avisos del equipo", detalle: "2 tareas pendientes" },
    ],
    beneficios: [
      "Agenda propia y fichas de sus pacientes",
      "Registra su horario de entrada y salida",
      "Recibe avisos y tareas del equipo",
    ],
  },
];

function Telefono({ portal, indice }: { portal: Portal; indice: number }) {
  const Icono = portal.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotate: indice === 0 ? -6 : 6 }}
      whileInView={{ opacity: 1, y: 0, rotate: indice === 0 ? -3 : 3 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay: 0.15 + indice * 0.15, ease: EASE }}
      className="relative mx-auto w-[230px] sm:w-[250px]"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5 + indice, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-[2.2rem] border border-white/20 bg-white/10 p-2 shadow-[0_30px_80px_-20px_rgba(15,5,40,0.75)] backdrop-blur"
      >
        <div className="overflow-hidden rounded-[1.8rem] bg-white text-[#1f1535]">
          <div className={`bg-gradient-to-br ${portal.acento} px-4 pb-5 pt-6 text-white`}>
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/40" />
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-white/20">
                <Icono className="size-4.5" />
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13px] font-bold">{portal.usuario}</p>
                <p className="text-[10.5px] text-white/80">{portal.rol}</p>
              </div>
            </div>
          </div>
          <ul className="space-y-2 p-3">
            {portal.filas.map((f, i) => (
              <motion.li
                key={f.titulo}
                initial={{ opacity: 0, x: indice === 0 ? -16 : 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 + indice * 0.15 + i * 0.1, ease: EASE }}
                className="flex items-center gap-2.5 rounded-xl border border-violet-100 bg-violet-50/60 px-2.5 py-2"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white text-violet-600 shadow-sm">
                  <f.icon className="size-3.5" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[11.5px] font-semibold">{f.titulo}</span>
                  <span className="block truncate text-[10px] text-[#6b6280]">{f.detalle}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function PortalesEnterprise() {
  return (
    <section className="relative overflow-hidden bg-[#1a0b3d] py-20 text-white lg:py-24">
      {/* Fondo animado */}
      <motion.div
        aria-hidden
        animate={{ scale: [1, 1.15, 1], opacity: [0.55, 0.8, 0.55] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -left-40 top-0 size-[560px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(167,139,250,0.35) 0%, transparent 65%)",
        }}
      />
      <motion.div
        aria-hidden
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-40 bottom-0 size-[620px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(232,121,249,0.28) 0%, transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/10 px-3.5 py-1.5 text-xs font-semibold text-amber-200">
            <Crown className="size-3.5" /> Exclusivo del plan Enterprise
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight lg:text-[2.6rem] lg:leading-tight">
            Tu clínica, también en el bolsillo de{" "}
            <span className="bg-gradient-to-r from-fuchsia-300 via-violet-200 to-amber-200 bg-clip-text text-transparent">
              pacientes y profesionales
            </span>
          </h2>
          <p className="mt-4 text-white/70">
            Dos portales conectados con la agenda, la historia clínica y la facturación. Cada uno
            entra con su propio acceso y ve solo lo que le corresponde.
          </p>
        </Reveal>

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-2">
          {PORTALES.map((portal, indice) => (
            <div
              key={portal.id}
              className={`flex flex-col items-center gap-8 sm:flex-row ${indice === 1 ? "sm:flex-row-reverse lg:flex-row" : ""}`}
            >
              <Telefono portal={portal} indice={indice} />
              <Reveal delay={0.2 + indice * 0.15} className="max-w-xs text-center sm:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/85">
                  <Smartphone className="size-3.5" /> Celular o PC
                </span>
                <h3 className="mt-3 text-xl font-bold">{portal.titulo}</h3>
                <p className="mt-1.5 text-sm text-white/70">{portal.bajada}</p>
                <ul className="mt-4 space-y-2">
                  {portal.beneficios.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-white/85">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gradient-to-r from-fuchsia-300 to-violet-300" />
                      {b}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-14 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            asChild
            size="xl"
            className="rounded-xl bg-white text-primary shadow-lg shadow-black/20 hover:bg-white/90"
          >
            <Link to="/planes">
              Ver plan Enterprise
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="xl"
            variant="outline"
            className="rounded-xl border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          >
            <Link to="/registro" search={{ plan: "enterprise" }}>
              Probarlo en el demo
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
