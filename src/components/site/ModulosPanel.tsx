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
      { icon: Users, n: "Pacientes", tag: "Una ficha por paciente, con toda su historia.", bullets: ["Datos, obra social y contacto", "Historia clínica y antecedentes", "Seguimiento y controles"] },
      { icon: CalendarDays, n: "Agenda", tag: "Los turnos de todos los profesionales en un calendario.", bullets: ["Vista diaria, semanal y por profesional", "Recordatorios automáticos", "Sin superposiciones"] },
      { icon: CalendarCheck, n: "Autoagenda", tag: "El paciente reserva su turno online.", bullets: ["Horarios disponibles en tiempo real", "Confirmación automática", "Menos llamados a la clínica"] },
      { icon: Stethoscope, n: "Odontograma", tag: "El estado de cada pieza, en 2D y 3D.", bullets: ["Boca 3D realista", "Estados por pieza y cara", "Historial de evolución"] },
      { icon: Activity, n: "Periodontograma", tag: "Sondaje y salud de las encías.", bullets: ["PS, margen y NIC por sitio", "Sangrado y placa", "Comparación entre evaluaciones"] },
      { icon: FileText, n: "Historia clínica", tag: "Antecedentes, evoluciones y estudios.", bullets: ["Antecedentes y alertas", "Evoluciones por consulta", "Todo en un lugar"] },
      { icon: ScrollText, n: "Evoluciones", tag: "El registro de cada consulta.", bullets: ["Notas clínicas", "Procedimientos realizados", "Próximos controles"] },
      { icon: ClipboardList, n: "Consentimientos", tag: "Documentos firmados y guardados.", bullets: ["Plantillas por tratamiento", "Firma del paciente", "Siempre disponibles"] },
      { icon: FileText, n: "Recetas digitales", tag: "Recetas listas en segundos.", bullets: ["Plantillas reutilizables", "Historial por paciente", "Envío al portal"] },
      { icon: Microscope, n: "Imágenes y radiografías", tag: "Estudios y fotos del paciente.", bullets: ["Galería por paciente", "Comparación de estudios", "Anotaciones"] },
    ],
  },
  {
    icon: Wallet,
    titulo: "Administración y finanzas",
    items: [
      { icon: Calculator, n: "Presupuestos", tag: "Presupuestos claros que el paciente aprueba.", bullets: ["Por etapas y tratamientos", "Aprobación del paciente", "Seguimiento de estado"] },
      { icon: ReceiptText, n: "Facturación", tag: "Comprobantes e ingresos en un solo lugar.", bullets: ["Facturas y cobros", "Cuenta corriente por paciente", "Cierre de caja"] },
      { icon: Landmark, n: "Finanzas y caja", tag: "Ingresos, egresos y caja al día.", bullets: ["Movimientos diarios", "Saldos y pagos", "Reportes de caja"] },
      { icon: Package, n: "Inventario", tag: "Stock y materiales bajo control.", bullets: ["Entradas y salidas", "Alertas de stock bajo", "Por sucursal"] },
      { icon: FlaskConical, n: "Laboratorio", tag: "Pedidos al laboratorio con seguimiento.", bullets: ["Estado de cada trabajo", "Fechas de entrega", "Por paciente"] },
      { icon: BarChart3, n: "Reportes y BI", tag: "Los números que impulsan la clínica.", bullets: ["Turnos, ingresos y rendimiento", "Pacientes inactivos", "Indicadores en vivo"] },
    ],
  },
  {
    icon: Megaphone,
    titulo: "Comunicación con el paciente",
    items: [
      { icon: Bell, n: "Recordatorios", tag: "Avisos por WhatsApp antes de cada turno.", bullets: ["Confirmación automática", "Menos ausencias", "También por correo"] },
      { icon: Megaphone, n: "Comunicación y campañas", tag: "Mensajes y campañas a tus pacientes.", bullets: ["Segmentación permitida", "Programación de envíos", "Seguimiento de respuestas"] },
      { icon: Globe, n: "Portal del paciente", tag: "Tus pacientes, sin llamar a la clínica.", bullets: ["Ven turnos y recetas", "Aprueban presupuestos", "Chatean con la clínica"] },
      { icon: Network, n: "Automatizaciones", tag: "Procesos que se hacen solos.", bullets: ["Recordatorios y seguimientos", "Avisos internos", "Flujos por evento"] },
      { icon: FileText, n: "Mensajería del equipo", tag: "El equipo se comunica adentro.", bullets: ["Mensajes internos", "Por paciente o general", "Sin apps externas"] },
    ],
  },
  {
    icon: Building2,
    titulo: "Plataforma",
    items: [
      { icon: Bot, n: "Esther Infinity (IA)", tag: "La asistente de IA de tu clínica.", bullets: ["Resúmenes clínicos", "Sugerencias de agenda", "Lectura del rendimiento"] },
      { icon: Building2, n: "Multiempresa", tag: "Varias sedes desde un panel.", bullets: ["Datos aislados por clínica", "Una o varias sucursales", "Vista consolidada"] },
      { icon: UserCog, n: "Roles y permisos", tag: "Cada uno ve lo que le toca.", bullets: ["Roles propios", "Permisos por persona", "Solo el admin los maneja"] },
      { icon: Users, n: "Equipo profesional", tag: "Tu equipo y sus agendas.", bullets: ["Altas y bajas", "Horarios y bloqueos", "Especialidades"] },
      { icon: Network, n: "Integraciones", tag: "Se conecta con otras herramientas.", bullets: ["WhatsApp y correo", "Pagos online", "Más en camino"] },
      { icon: ShieldCheck, n: "Seguridad y auditoría", tag: "Tus datos, protegidos.", bullets: ["Cifrado de datos clínicos", "Registro de accesos", "Aislamiento entre clínicas"] },
    ],
  },
];
const TOTAL_OCLU = AREAS_OCLU.reduce((a, x) => a + x.items.length, 0);

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

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="flex flex-1 flex-col items-center justify-center py-4 text-center">
              {/* Mini-maqueta temática del módulo (animación infinita) */}
              <div className="w-full">
                <ModuloMockup nombre={mod.n} />
              </div>

              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-lavender px-3 py-1 text-[11px] font-semibold text-lavender-foreground">{actual.titulo}</span>
              <h3 className="mt-3 font-display text-2xl font-bold tracking-tight">{mod.n}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{mod.tag}</p>

              <ul className="mx-auto mt-6 grid w-full max-w-md gap-2.5">
                {mod.bullets.map((b, i) => (
                  <motion.li key={b} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-left">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-white"><Check className="size-3.5" /></span>
                    <span className="text-sm font-medium text-foreground/90">{b}</span>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-7">
                <Button asChild variant="hero" size="lg">
                  <Link to="/registro" onClick={onLinkClick}>Probar {mod.n}<ArrowRight className="size-4" /></Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
