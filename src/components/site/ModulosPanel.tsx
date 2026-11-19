import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  Building2,
  Calculator,
  CalendarCheck,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  FlaskConical,
  Globe,
  Landmark,
  Megaphone,
  Microscope,
  Network,
  Package,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuloMockup } from "./ModuloMockups";

/* Ubicación: src/components/site/ModulosPanel.tsx
   Panel de módulos de Cloud Esther (estilo Oclu, colores propios). Se usa en la página
   Características y en el desplegable del menú "Características" del header.
   - Vista por defecto: el área activa con sus módulos + las otras áreas como pestañas verticales.
   - Al tocar un módulo, se muestra ESE módulo con una ilustración animada y sus características. */

const AREAS_OCLU = [
  {
    icon: Stethoscope,
    titulo: "Gestión clínica",
    items: [
      { icon: Users, n: "Pacientes", tag: "Toda la información de tus pacientes, organizada en un solo lugar.", bullets: [{ t: "Datos personales y contacto", d: "Información completa y organizada" }, { t: "Historia clínica y antecedentes", d: "Todo el historial centralizado" }, { t: "Seguimiento y controles", d: "Evolución y próximos turnos" }] },
      { icon: CalendarDays, n: "Agenda", tag: "Los turnos de todos los profesionales en un solo calendario.", bullets: [{ t: "Vista diaria, semanal y por profesional", d: "El calendario como lo necesitás" }, { t: "Recordatorios automáticos", d: "Menos ausencias" }, { t: "Sin superposiciones", d: "Turnos que nunca chocan" }] },
      { icon: CalendarCheck, n: "Autoagenda", tag: "El paciente reserva su turno online, sin llamar.", bullets: [{ t: "Horarios disponibles en tiempo real", d: "Siempre actualizados" }, { t: "Confirmación automática", d: "Sin intervención manual" }, { t: "Menos llamados a la clínica", d: "El paciente reserva solo" }] },
      { icon: Stethoscope, n: "Odontograma", tag: "El estado de cada pieza, en 2D y 3D.", bullets: [{ t: "Boca 3D realista", d: "También en 2D clásico" }, { t: "Estados por pieza y cara", d: "Al mayor detalle" }, { t: "Historial de evolución", d: "Cómo cambió en el tiempo" }] },
      { icon: Activity, n: "Periodontograma", tag: "Sondaje y salud de las encías, al detalle.", bullets: [{ t: "PS, margen y NIC por sitio", d: "Sondaje completo" }, { t: "Sangrado y placa", d: "Índices de salud gingival" }, { t: "Comparación entre evaluaciones", d: "El avance a la vista" }] },
      { icon: FileText, n: "Historia clínica", tag: "Antecedentes, evoluciones y estudios en un lugar.", bullets: [{ t: "Antecedentes y alertas", d: "Lo importante, resaltado" }, { t: "Evoluciones por consulta", d: "Registro de cada visita" }, { t: "Todo en un lugar", d: "Sin papeles sueltos" }] },
      { icon: ScrollText, n: "Evoluciones", tag: "El registro ordenado de cada consulta.", bullets: [{ t: "Notas clínicas", d: "De cada atención" }, { t: "Procedimientos realizados", d: "Qué se hizo" }, { t: "Próximos controles", d: "Qué sigue" }] },
      { icon: ClipboardList, n: "Consentimientos", tag: "Documentos firmados y guardados en la ficha.", bullets: [{ t: "Plantillas por tratamiento", d: "Listas para usar" }, { t: "Firma del paciente", d: "Digital y válida" }, { t: "Siempre disponibles", d: "Guardados en la ficha" }] },
      { icon: FileText, n: "Recetas digitales", tag: "Recetas listas en segundos, con autocompletado.", bullets: [{ t: "Medicamentos sugeridos", d: "Escribí lo mínimo" }, { t: "Historial por paciente", d: "Todo lo recetado" }, { t: "Envío al portal", d: "El paciente la recibe" }] },
      { icon: Microscope, n: "Imágenes y radiografías", tag: "Estudios y fotos del paciente, ordenados.", bullets: [{ t: "Galería por paciente", d: "Ordenada por fecha" }, { t: "Comparación de estudios", d: "Antes y después" }, { t: "Anotaciones", d: "Marcá lo importante" }] },
    ],
  },
  {
    icon: Wallet,
    titulo: "Administración y finanzas",
    items: [
      { icon: Calculator, n: "Presupuestos", tag: "Presupuestos claros que el paciente aprueba.", bullets: [{ t: "Por etapas y tratamientos", d: "Claro y detallado" }, { t: "Aprobación del paciente", d: "Con un clic" }, { t: "Seguimiento de estado", d: "De borrador a aprobado" }] },
      { icon: ReceiptText, n: "Facturación", tag: "Comprobantes e ingresos en un solo lugar.", bullets: [{ t: "Facturas y cobros", d: "Todo registrado" }, { t: "Cuenta corriente por paciente", d: "Saldos al día" }, { t: "Cierre de caja", d: "Cada jornada cuadrada" }] },
      { icon: Landmark, n: "Finanzas y caja", tag: "Ingresos, egresos y caja al día.", bullets: [{ t: "Movimientos diarios", d: "Ingresos y egresos" }, { t: "Saldos y pagos", d: "Siempre al día" }, { t: "Reportes de caja", d: "La foto del mes" }] },
      { icon: Package, n: "Inventario", tag: "Stock y materiales bajo control.", bullets: [{ t: "Entradas y salidas", d: "Stock real" }, { t: "Alertas de stock bajo", d: "Antes de quedarte sin" }, { t: "Por sucursal", d: "Cada sede, su stock" }] },
      { icon: FlaskConical, n: "Laboratorio", tag: "Pedidos al laboratorio con seguimiento.", bullets: [{ t: "Estado de cada trabajo", d: "Dónde está cada pedido" }, { t: "Fechas de entrega", d: "Nada se atrasa" }, { t: "Por paciente", d: "Asociado a su ficha" }] },
      { icon: BarChart3, n: "Reportes y BI", tag: "Los números que impulsan la clínica.", bullets: [{ t: "Turnos, ingresos y rendimiento", d: "Los números clave" }, { t: "Pacientes inactivos", d: "Para recuperarlos" }, { t: "Indicadores en vivo", d: "Siempre actualizados" }] },
    ],
  },
  {
    icon: Megaphone,
    titulo: "Comunicación con el paciente",
    items: [
      { icon: Bell, n: "Recordatorios", tag: "Avisos por WhatsApp antes de cada turno.", bullets: [{ t: "Confirmación automática", d: "Por WhatsApp" }, { t: "Menos ausencias", d: "Agenda más llena" }, { t: "También por correo", d: "El canal que prefieras" }] },
      { icon: Megaphone, n: "Comunicación y campañas", tag: "Mensajes y campañas a tus pacientes.", bullets: [{ t: "Segmentación permitida", d: "Al paciente indicado" }, { t: "Programación de envíos", d: "En el momento justo" }, { t: "Seguimiento de respuestas", d: "Quién respondió" }] },
      { icon: Globe, n: "Portal del paciente", tag: "Tus pacientes resuelven todo, sin llamar.", bullets: [{ t: "Ven turnos y recetas", d: "Todo a mano" }, { t: "Aprueban presupuestos", d: "Sin venir a la clínica" }, { t: "Chatean con la clínica", d: "Comunicación directa" }] },
      { icon: Network, n: "Automatizaciones", tag: "Procesos que se hacen solos, 24/7.", bullets: [{ t: "Recordatorios y seguimientos", d: "En piloto automático" }, { t: "Avisos internos", d: "El equipo enterado" }, { t: "Flujos por evento", d: "Se disparan solos" }] },
      { icon: FileText, n: "Mensajería del equipo", tag: "El equipo se comunica dentro del sistema.", bullets: [{ t: "Mensajes internos", d: "Sin apps externas" }, { t: "Por paciente o general", d: "Según el tema" }, { t: "Todo en un lugar", d: "Sin salir de Cloud Esther" }] },
    ],
  },
  {
    icon: Building2,
    titulo: "Plataforma",
    items: [
      { icon: Bot, n: "Esther Infinity (IA)", tag: "La asistente de Esther Infinity para tu clínica.", bullets: [{ t: "Resúmenes clínicos", d: "En segundos" }, { t: "Sugerencias de agenda", d: "Mejor organización" }, { t: "Lectura del rendimiento", d: "Qué mejorar" }] },
      { icon: Building2, n: "Multiempresa", tag: "Varias sedes desde un solo panel.", bullets: [{ t: "Datos aislados por clínica", d: "Nunca se mezclan" }, { t: "Una o varias sucursales", d: "Crecé sin límites" }, { t: "Vista consolidada", d: "Todo de un vistazo" }] },
      { icon: UserCog, n: "Roles y permisos", tag: "Cada uno ve lo que le toca.", bullets: [{ t: "Roles propios", d: "A tu medida" }, { t: "Permisos por persona", d: "Cada uno lo suyo" }, { t: "Solo el admin los maneja", d: "Control total" }] },
      { icon: Users, n: "Equipo profesional", tag: "Tu equipo y sus agendas, al día.", bullets: [{ t: "Altas y bajas", d: "Tu equipo actualizado" }, { t: "Horarios y bloqueos", d: "Cada agenda" }, { t: "Especialidades", d: "Quién hace qué" }] },
      { icon: Network, n: "Integraciones", tag: "Se conecta con otras herramientas.", bullets: [{ t: "WhatsApp y correo", d: "Siempre conectado" }, { t: "Pagos online", d: "Cobrá fácil" }, { t: "Más en camino", d: "Sumamos siempre" }] },
      { icon: ShieldCheck, n: "Seguridad y auditoría", tag: "Tus datos, siempre protegidos.", bullets: [{ t: "Cifrado de datos clínicos", d: "Protegidos de punta a punta" }, { t: "Registro de accesos", d: "Quién vio qué" }, { t: "Aislamiento entre clínicas", d: "Cada una, la suya" }] },
    ],
  },
];
const TOTAL_OCLU = AREAS_OCLU.reduce((a, x) => a + x.items.length, 0);

/* Diente mascota (amigable) para la vista de detalle del módulo. */
function DienteMascota({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 72" className={className} aria-hidden>
      <defs>
        <linearGradient id="dm-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ede9fe" />
        </linearGradient>
      </defs>
      <path
        d="M32 4C18 4 8 10 8 24c0 10 3 16 6 28 2 8 10 8 11-2l3-14c1-4 7-4 8 0l3 14c1 10 9 10 11 2 3-12 6-18 6-28C56 10 46 4 32 4Z"
        fill="url(#dm-grad)"
        stroke="#c4b5fd"
        strokeWidth="2"
      />
      <circle cx="24" cy="27" r="2.6" fill="#6d28d9" />
      <circle cx="40" cy="27" r="2.6" fill="#6d28d9" />
      <path d="M24 35c3 4 13 4 16 0" fill="none" stroke="#6d28d9" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="18.5" cy="32" r="2.6" fill="#f9a8d4" opacity="0.6" />
      <circle cx="45.5" cy="32" r="2.6" fill="#f9a8d4" opacity="0.6" />
    </svg>
  );
}

export function ModulosPanel({ onLinkClick }: { onLinkClick?: () => void }) {
  const [area, setArea] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const actual = AREAS_OCLU[area];
  const mod = sel != null ? actual.items[sel] : null;

  return (
    <div className="relative min-h-[430px] overflow-hidden rounded-[28px] border border-primary/15 bg-gradient-to-br from-card via-card to-lavender/40 p-5 shadow-[0_28px_70px_-32px_rgba(88,28,135,0.55)] sm:p-7">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-60 rounded-full bg-primary/15 blur-[80px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-20 size-56 rounded-full bg-fuchsia-300/15 blur-[80px]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-400" />

      {/* VISTA PRINCIPAL (igual a la referencia, en colores Cloud Esther) */}
      <div className="relative grid gap-5 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-500 text-white shadow-[0_12px_28px_-10px_rgba(124,58,237,0.7)]">
              {(() => { const AIcon = actual.icon; return <AIcon className="size-5" />; })()}
            </span>
            <h3 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{actual.titulo}</h3>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {actual.items.map((it, i) => {
              const It = it.icon;
              return (
                <button key={it.n} type="button" onClick={() => setSel(i)} className="group flex items-center gap-3 rounded-2xl px-2 py-1.5 text-left transition-colors duration-300 hover:bg-white/60">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lavender text-primary shadow-[0_6px_16px_-8px_rgba(124,58,237,0.5)] transition-all duration-300 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-fuchsia-500 group-hover:text-white">
                    <It className="size-4" />
                  </span>
                  <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary sm:text-[15px]">{it.n}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pestañas verticales de las otras áreas */}
        <div className="flex gap-2">
          {AREAS_OCLU.map((a, i) => {
            if (i === area) return null;
            return (
              <button
                key={a.titulo}
                type="button"
                onClick={() => { setArea(i); setSel(null); }}
                className="flex w-14 flex-col items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-gradient-to-b from-card to-lavender/40 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_14px_30px_-16px_rgba(124,58,237,0.6)] sm:w-[66px]"
              >
                <span className="text-sm font-extrabold text-primary/70">{String(i + 1).padStart(2, "0")}</span>
                <span className="[writing-mode:vertical-rl] rotate-180 text-[13px] font-semibold text-foreground/80">{a.titulo}</span>
                <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-xs font-bold text-white shadow-[0_6px_14px_-6px_rgba(124,58,237,0.7)]">{a.items.length}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative mt-6 flex items-center justify-between border-t border-border/60 pt-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-bold text-foreground">{TOTAL_OCLU} funcionalidades</span> en 4 áreas
        </p>
        <Link to="/planes" onClick={onLinkClick} className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition hover:gap-2">
          Ver todas <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* AL TOCAR UN MÓDULO: se muestra ese módulo con animación */}
      <AnimatePresence>
        {mod && (
          <motion.div
            key={`${area}-${sel}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-30 flex flex-col overflow-y-auto rounded-[28px] bg-card/95 p-6 backdrop-blur-sm sm:p-8"
          >
            <button type="button" onClick={() => setSel(null)} className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-lavender px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white">
              <ArrowRight className="size-4 rotate-180" /> Volver a {actual.titulo}
            </button>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="mx-auto flex w-full max-w-md flex-1 flex-col py-4">
              {/* Mini-vista del módulo con contenido real */}
              <div className="w-full">
                <ModuloMockup nombre={mod.n} />
              </div>

              {/* Mascota + título */}
              <div className="mt-6 flex items-center gap-4">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                  <DienteMascota className="size-16 shrink-0 drop-shadow-sm sm:size-20" />
                </motion.div>
                <div className="text-left">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-lavender px-2.5 py-0.5 text-[11px] font-semibold text-lavender-foreground">{actual.titulo}</span>
                  <h3 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-[28px]">{mod.n}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{mod.tag}</p>
                </div>
              </div>

              {/* Checklist con subtítulo e ícono */}
              <ul className="mt-5 grid w-full gap-2.5">
                {mod.bullets.map((b, i) => {
                  const Ico = mod.icon;
                  return (
                    <motion.li key={b.t} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-3.5 py-2.5 text-left">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Ico className="size-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-tight">{b.t}</p>
                        <p className="text-[12px] leading-tight text-muted-foreground">{b.d}</p>
                      </div>
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-white"><Check className="size-3.5" /></span>
                    </motion.li>
                  );
                })}
              </ul>

              <div className="mt-6">
                <Button asChild variant="hero" size="lg" className="w-full">
                  <Link to="/registro" onClick={onLinkClick}>Explorar módulo<ArrowRight className="size-4" /></Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
