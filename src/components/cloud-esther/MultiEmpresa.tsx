// src/components/cloud-esther/MultiEmpresa.tsx

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  Check,
  ChevronRight,
  CircleDot,
  Eye,
  KeyRound,
  MapPin,
  Pencil,
  Plus,
  Power,
  Repeat,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useCloudEsther, type PlanId as PlanDemoId } from "@/lib/cloud-esther/data";
import { useSesion } from "@/lib/cloud-esther/auth-store";

/** Traza de auditoría (demo: consola). TODO backend: POST /auditoria. */
function registrarEvento(evento: {
  modulo: string;
  accion: string;
  entidad: string;
  antes?: string;
  despues?: string;
}) {
  // TODO backend: enviar el evento a la auditoría de la clínica.
  void evento;
}

/* ───────────────────────── Tipos y datos demo ───────────────────────── */

type PlanId = "Start" | "Pro" | "Plus" | "Enterprise";
type EstadoClinica = "Activa" | "En prueba" | "Suspendida";
type Rol = "Administrador" | "Profesional" | "Recepción" | "Contabilidad";

type Clinica = {
  id: string; // clinic_id
  nombre: string;
  razonSocial: string;
  cuit: string;
  ciudad: string;
  adminEmail: string;
  plan: PlanId;
  estado: EstadoClinica;
  color: string;
  almacenamiento: number; // GB usados
  alta: string;
};

type Sucursal = {
  id: string;
  clinic_id: string;
  nombre: string;
  direccion: string;
  responsable: string;
  boxes: number;
  activa: boolean;
};

type PuntoMapa = {
  ciudad: string;
  lat: number;
  lng: number;
  etiqueta: string;
  clinic_id: string;
  sucursales: number;
};

type Usuario = {
  id: string;
  clinic_id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  ultimoAcceso: string;
};

type DatosClinica = Pick<
  Clinica,
  "nombre" | "razonSocial" | "cuit" | "ciudad" | "adminEmail" | "plan" | "estado" | "color"
>;

const PLAN_INFO: Record<
  PlanId,
  {
    usuarios: number;
    sucursales: number;
    profesionales: number;
    almacenamiento: number;
    audiencia: string;
  }
> = {
  Start: {
    usuarios: 5,
    sucursales: 1,
    profesionales: 3,
    almacenamiento: 5,
    audiencia: "Consultorios individuales",
  },
  Pro: {
    usuarios: 15,
    sucursales: 3,
    profesionales: 10,
    almacenamiento: 25,
    audiencia: "Clínicas en crecimiento",
  },
  Plus: {
    usuarios: 40,
    sucursales: 6,
    profesionales: 25,
    almacenamiento: 100,
    audiencia: "Clínicas con varios equipos",
  },
  Enterprise: {
    usuarios: 150,
    sucursales: 20,
    profesionales: 100,
    almacenamiento: 500,
    audiencia: "Redes y grupos odontológicos",
  },
};

const PLANES = Object.keys(PLAN_INFO) as PlanId[];
const ESTADOS: EstadoClinica[] = ["Activa", "En prueba", "Suspendida"];
const COLORES = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

/** Equivalencia entre los planes del demo y los de este módulo. */
const PLAN_DESDE_DEMO: Record<PlanDemoId, PlanId> = {
  inicial: "Start",
  profesional: "Pro",
  avanzada: "Plus",
  grupo: "Enterprise",
};

const CLINICAS_INICIALES: Clinica[] = [
  {
    id: "clinic_demo_001",
    nombre: "Clínica Dental Esther",
    razonSocial: "Esther Salud S.A.",
    cuit: "30-71234567-8",
    ciudad: "Buenos Aires",
    adminEmail: "admin@esther.demo",
    plan: "Plus",
    estado: "Activa",
    color: "#7c3aed",
    almacenamiento: 41,
    alta: "2026-03-04",
  },
  {
    id: "clinic_demo_002",
    nombre: "Sonrisa Norte Odontología",
    razonSocial: "Sonrisa Norte S.R.L.",
    cuit: "30-70111222-3",
    ciudad: "Rosario",
    adminEmail: "admin@sonrisanorte.demo",
    plan: "Pro",
    estado: "Activa",
    color: "#0ea5e9",
    almacenamiento: 12,
    alta: "2026-05-18",
  },
  {
    id: "clinic_demo_003",
    nombre: "Odonto Plaza",
    razonSocial: "Plaza Dental S.A.S.",
    cuit: "30-71888999-0",
    ciudad: "Córdoba",
    adminEmail: "admin@odontoplaza.demo",
    plan: "Start",
    estado: "En prueba",
    color: "#10b981",
    almacenamiento: 1,
    alta: "2026-09-22",
  },
  {
    id: "clinic_demo_004",
    nombre: "Centro Dental Andes",
    razonSocial: "Andes Dental S.A.",
    cuit: "30-70555444-1",
    ciudad: "Mendoza",
    adminEmail: "admin@andesdental.demo",
    plan: "Enterprise",
    estado: "Activa",
    color: "#f59e0b",
    almacenamiento: 210,
    alta: "2026-01-12",
  },
  {
    id: "clinic_demo_005",
    nombre: "Dental Sur",
    razonSocial: "Dental Sur S.R.L.",
    cuit: "30-70333222-7",
    ciudad: "La Plata",
    adminEmail: "admin@dentalsur.demo",
    plan: "Pro",
    estado: "Suspendida",
    color: "#ef4444",
    almacenamiento: 8,
    alta: "2026-02-27",
  },
];

const SUCURSALES_INICIALES: Sucursal[] = [
  {
    id: "s1",
    clinic_id: "clinic_demo_001",
    nombre: "Sucursal Centro",
    direccion: "Av. Corrientes 1450",
    responsable: "Esther Molina",
    boxes: 6,
    activa: true,
  },
  {
    id: "s2",
    clinic_id: "clinic_demo_001",
    nombre: "Sucursal Norte",
    direccion: "Av. Cabildo 2210",
    responsable: "Valeria Ríos",
    boxes: 4,
    activa: true,
  },
  {
    id: "s3",
    clinic_id: "clinic_demo_002",
    nombre: "Casa central",
    direccion: "Bv. Oroño 890",
    responsable: "Andrea Castro",
    boxes: 5,
    activa: true,
  },
  {
    id: "s4",
    clinic_id: "clinic_demo_003",
    nombre: "Sede única",
    direccion: "Obispo Trejo 320",
    responsable: "Diego Luna",
    boxes: 2,
    activa: true,
  },
  {
    id: "s5",
    clinic_id: "clinic_demo_004",
    nombre: "Mendoza Centro",
    direccion: "San Martín 1120",
    responsable: "Paula Herrera",
    boxes: 8,
    activa: true,
  },
  {
    id: "s6",
    clinic_id: "clinic_demo_004",
    nombre: "Godoy Cruz",
    direccion: "Perón 540",
    responsable: "Ramiro Acosta",
    boxes: 5,
    activa: true,
  },
  {
    id: "s7",
    clinic_id: "clinic_demo_005",
    nombre: "La Plata Centro",
    direccion: "Calle 7 nº 780",
    responsable: "Mariano Torres",
    boxes: 3,
    activa: false,
  },
];

const PUNTOS_MAPA: PuntoMapa[] = [
  {
    ciudad: "Buenos Aires",
    lat: -34.6037,
    lng: -58.3816,
    etiqueta: "Buenos Aires",
    clinic_id: "clinic_demo_001",
    sucursales: 2,
  },
  {
    ciudad: "Rosario",
    lat: -32.9442,
    lng: -60.6505,
    etiqueta: "Rosario",
    clinic_id: "clinic_demo_002",
    sucursales: 1,
  },
  {
    ciudad: "Córdoba",
    lat: -31.4201,
    lng: -64.1888,
    etiqueta: "Córdoba",
    clinic_id: "clinic_demo_003",
    sucursales: 1,
  },
  {
    ciudad: "Mendoza",
    lat: -32.8895,
    lng: -68.8458,
    etiqueta: "Mendoza",
    clinic_id: "clinic_demo_004",
    sucursales: 2,
  },
  {
    ciudad: "La Plata",
    lat: -34.9205,
    lng: -57.9536,
    etiqueta: "La Plata",
    clinic_id: "clinic_demo_005",
    sucursales: 1,
  },
];

const USUARIOS_INICIALES: Usuario[] = [
  {
    id: "u1",
    clinic_id: "clinic_demo_001",
    nombre: "Esther Molina",
    email: "esther@esther.demo",
    rol: "Administrador",
    activo: true,
    ultimoAcceso: "Hoy 09:12",
  },
  {
    id: "u2",
    clinic_id: "clinic_demo_001",
    nombre: "Lucía Paz",
    email: "lucia@esther.demo",
    rol: "Profesional",
    activo: true,
    ultimoAcceso: "Hoy 08:47",
  },
  {
    id: "u3",
    clinic_id: "clinic_demo_001",
    nombre: "Martín Sosa",
    email: "martin@esther.demo",
    rol: "Profesional",
    activo: true,
    ultimoAcceso: "Ayer 18:30",
  },
  {
    id: "u4",
    clinic_id: "clinic_demo_001",
    nombre: "Valeria Ríos",
    email: "valeria@esther.demo",
    rol: "Recepción",
    activo: true,
    ultimoAcceso: "Hoy 09:01",
  },
  {
    id: "u5",
    clinic_id: "clinic_demo_001",
    nombre: "Nicolás Ferreyra",
    email: "nicolas@esther.demo",
    rol: "Contabilidad",
    activo: false,
    ultimoAcceso: "Hace 12 días",
  },
  {
    id: "u6",
    clinic_id: "clinic_demo_002",
    nombre: "Andrea Castro",
    email: "andrea@sonrisanorte.demo",
    rol: "Administrador",
    activo: true,
    ultimoAcceso: "Hoy 10:05",
  },
  {
    id: "u7",
    clinic_id: "clinic_demo_002",
    nombre: "Julián Ibarra",
    email: "julian@sonrisanorte.demo",
    rol: "Profesional",
    activo: true,
    ultimoAcceso: "Ayer 17:20",
  },
  {
    id: "u8",
    clinic_id: "clinic_demo_002",
    nombre: "Sofía Benítez",
    email: "sofia@sonrisanorte.demo",
    rol: "Recepción",
    activo: true,
    ultimoAcceso: "Hoy 09:40",
  },
  {
    id: "u9",
    clinic_id: "clinic_demo_003",
    nombre: "Diego Luna",
    email: "diego@odontoplaza.demo",
    rol: "Administrador",
    activo: true,
    ultimoAcceso: "Hoy 11:15",
  },
  {
    id: "u10",
    clinic_id: "clinic_demo_003",
    nombre: "Camila Vega",
    email: "camila@odontoplaza.demo",
    rol: "Profesional",
    activo: true,
    ultimoAcceso: "Hoy 10:50",
  },
  {
    id: "u11",
    clinic_id: "clinic_demo_004",
    nombre: "Paula Herrera",
    email: "paula@andesdental.demo",
    rol: "Administrador",
    activo: true,
    ultimoAcceso: "Hoy 08:30",
  },
  {
    id: "u12",
    clinic_id: "clinic_demo_004",
    nombre: "Ramiro Acosta",
    email: "ramiro@andesdental.demo",
    rol: "Profesional",
    activo: true,
    ultimoAcceso: "Hoy 09:55",
  },
  {
    id: "u13",
    clinic_id: "clinic_demo_004",
    nombre: "Gonzalo Pérez",
    email: "gonzalo@andesdental.demo",
    rol: "Profesional",
    activo: true,
    ultimoAcceso: "Ayer 19:02",
  },
  {
    id: "u14",
    clinic_id: "clinic_demo_004",
    nombre: "Carolina Díaz",
    email: "carolina@andesdental.demo",
    rol: "Recepción",
    activo: true,
    ultimoAcceso: "Hoy 09:10",
  },
  {
    id: "u15",
    clinic_id: "clinic_demo_005",
    nombre: "Mariano Torres",
    email: "mariano@dentalsur.demo",
    rol: "Administrador",
    activo: false,
    ultimoAcceso: "Hace 30 días",
  },
  {
    id: "u16",
    clinic_id: "clinic_demo_005",
    nombre: "Elena Ruiz",
    email: "elena@dentalsur.demo",
    rol: "Profesional",
    activo: false,
    ultimoAcceso: "Hace 30 días",
  },
];

const ACTIVIDAD = [
  {
    id: "a1",
    titulo: "Clínica creada en período de prueba",
    detalle: "Odonto Plaza · Plan Start · hace 6 días",
  },
  {
    id: "a2",
    titulo: "Cambio de plan",
    detalle: "Sonrisa Norte Odontología · Start → Pro · hace 3 semanas",
  },
  { id: "a3", titulo: "Clínica suspendida por falta de pago", detalle: "Dental Sur · hace 1 mes" },
  {
    id: "a4",
    titulo: "Nueva sucursal habilitada",
    detalle: "Centro Dental Andes · Godoy Cruz · hace 2 meses",
  },
];

/* Garantías de separación entre clínicas, contadas en lenguaje del usuario.
   TODO backend: cada una se valida en el servidor (token con la clínica, consultas filtradas,
   archivos por clínica, auditoría por clínica). */
const REGLAS_AISLAMIENTO = [
  {
    titulo: "Cada dato pertenece a una sola clínica",
    detalle: "Pacientes, turnos, cobros, archivos y usuarios nunca se mezclan entre clínicas.",
    listo: true,
  },
  {
    titulo: "Acceso según la clínica del usuario",
    detalle: "Cada persona solo entra a la clínica que tiene asignada.",
    listo: true,
  },
  {
    titulo: "Búsquedas y reportes por clínica",
    detalle: "Los listados, reportes y Esther IA muestran solo la clínica activa.",
    listo: true,
  },
  {
    titulo: "Archivos separados",
    detalle: "Radiografías, fotos y documentos se guardan en el espacio de cada clínica.",
    listo: true,
  },
  {
    titulo: "Auditoría por clínica",
    detalle: "Cada acción queda registrada en el historial de su propia clínica.",
    listo: true,
  },
];

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "clinicas", label: "Clínicas" },
  { id: "sucursales", label: "Sucursales" },
  { id: "usuarios", label: "Usuarios" },
  { id: "planes", label: "Planes y aislamiento" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const estadoStyles: Record<EstadoClinica, string> = {
  Activa: "bg-primary/10 text-primary",
  "En prueba": "border border-primary/20 bg-card text-foreground/80",
  Suspendida: "bg-rose-100 text-rose-700",
};

const planStyles: Record<PlanId, string> = {
  Start: "border border-primary/20 bg-card text-foreground/80",
  Pro: "bg-primary/10 text-primary",
  Plus: "bg-primary/15 text-primary",
  Enterprise: "bg-primary text-primary-foreground",
};

const campo =
  "w-full rounded-xl border border-primary/20 bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

const iniciales = (nombre: string) =>
  nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

/* ───────────────────────── Fondo ───────────────────────── */

function FondoMultiEmpresa() {
  return (
    <>
      <style>{`
        @keyframes multiFloat {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(16px,-12px,0) scale(1.04); }
        }
        @keyframes multiFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .multi-float { animation: multiFloat 13s ease-in-out infinite; }
        .multi-fade-up { animation: multiFadeUp .5s ease-out both; }
      `}</style>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.025] via-transparent to-primary/[0.02]" />
        <div className="multi-float absolute -left-32 top-24 h-96 w-96 rounded-full bg-primary/[0.035] blur-3xl" />
        <div className="multi-float absolute -right-32 top-1/3 h-[28rem] w-[28rem] rounded-full bg-violet-400/[0.035] blur-3xl" />
      </div>
    </>
  );
}

/* ───────────────────────── UI base ───────────────────────── */

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Wallet;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-primary/10 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-primary/10 transition-transform duration-200 group-hover:scale-110"
      />
      <div className="relative flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 shrink-0 text-primary/70" />
      </div>
      <div className="relative mt-3 text-[26px] font-bold leading-none text-primary">{value}</div>
      <div className="relative mt-2.5 truncate text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-primary/15 bg-card/85 p-6 shadow-sm backdrop-blur-md">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Fila({
  avatar,
  titulo,
  detalle,
  derecha,
}: {
  avatar: ReactNode;
  titulo: ReactNode;
  detalle: string;
  derecha?: ReactNode;
}) {
  return (
    <div className="group flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        {avatar}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{titulo}</div>
          <div className="truncate text-xs text-muted-foreground">{detalle}</div>
        </div>
      </div>
      {derecha && <div className="flex items-center gap-2">{derecha}</div>}
    </div>
  );
}

function Avatar({ nombre, color }: { nombre: string; color: string }) {
  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white transition-transform duration-200 group-hover:scale-105"
      style={{ backgroundColor: color }}
    >
      {iniciales(nombre)}
    </span>
  );
}

function IconoFila({ icon: Icon }: { icon: typeof Wallet }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
      <Icon className="h-5 w-5" />
    </span>
  );
}

function BotonIcono({
  icon: Icon,
  titulo,
  onClick,
}: {
  icon: typeof Wallet;
  titulo: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-full border border-primary/20 bg-card text-foreground/80 transition hover:bg-primary/5 hover:text-primary"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function Pill({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function Vacio({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-primary/20 py-10 text-center text-sm text-muted-foreground">
      {texto}
    </div>
  );
}

function Barra({ label, actual, limite }: { label: string; actual: number; limite: number }) {
  const pct = Math.min(100, Math.round((actual / limite) * 100));
  const alto = pct >= 90;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${alto ? "text-rose-600" : "text-foreground"}`}>
          {actual} / {limite}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-primary/10">
        <div
          className={`h-full rounded-full transition-all duration-700 ${alto ? "bg-rose-400" : "bg-primary"}`}
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
    </div>
  );
}

function MapaSedes({
  clinicas,
  sucursales,
  activaId,
  onSeleccionar,
}: {
  clinicas: Clinica[];
  sucursales: Sucursal[];
  activaId: string;
  onSeleccionar: (id: string) => void;
}) {
  const puntos = PUNTOS_MAPA.filter((p) => clinicas.some((c) => c.id === p.clinic_id));
  const x = (lng: number) => 10 + ((lng + 70) / 14) * 80;
  const y = (lat: number) => 18 + ((-29 - lat) / 8) * 64;

  return (
    <div className="overflow-hidden rounded-3xl border border-primary/10 bg-card">
      <div className="relative h-[360px] overflow-hidden bg-primary/[0.025]">
        <iframe
          title="Mapa de sedes de CloudEsther"
          src="https://www.openstreetmap.org/export/embed.html?bbox=-70.8%2C-35.8%2C-56.5%2C-29.0&layer=mapnik"
          className="absolute inset-0 h-full w-full border-0 opacity-75"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-card/10" />
        <div className="absolute inset-5 rounded-[2rem] border border-primary/15 shadow-inner" />

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-5 h-[calc(100%-40px)] w-[calc(100%-40px)]"
          aria-hidden="true"
        >
          <path
            d="M35 7 C27 17 30 25 25 34 C20 43 27 48 20 57 C15 64 20 73 14 82 M62 4 C55 15 60 24 54 32 C50 39 56 45 49 54 C43 62 49 72 43 88"
            fill="none"
            stroke="hsl(var(--primary) / .10)"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />
          <path
            d="M5 54 C20 48 30 56 43 49 C55 43 67 48 80 40 C88 36 94 39 98 35 M18 79 C32 73 43 78 57 70 C68 64 78 70 94 60"
            fill="none"
            stroke="hsl(var(--primary) / .08)"
            strokeWidth="1"
          />
        </svg>

        {puntos.map((punto) => {
          const clinica = clinicas.find((c) => c.id === punto.clinic_id);
          if (!clinica) return null;
          const activo = clinica.id === activaId;
          const cantidad = sucursales.filter((s) => s.clinic_id === clinica.id).length;

          return (
            <button
              key={punto.clinic_id}
              type="button"
              onClick={() => onSeleccionar(clinica.id)}
              title={`${clinica.nombre} · ${punto.ciudad}`}
              className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x(punto.lng)}%`, top: `${y(punto.lat)}%` }}
            >
              <span
                className={`absolute -inset-2 rounded-full bg-primary/10 transition-transform ${activo ? "scale-150" : "scale-100 group-hover:scale-125"}`}
              />
              <span
                className={`relative grid h-10 w-10 place-items-center rounded-full border-2 bg-card shadow-md transition-all ${activo ? "border-primary ring-4 ring-primary/10" : "border-primary/30 group-hover:border-primary"}`}
              >
                <MapPin className="h-4 w-4 text-primary" />
              </span>
              <span
                className={`absolute left-1/2 top-12 hidden -translate-x-1/2 whitespace-nowrap rounded-full border border-primary/10 bg-card px-3 py-1.5 text-[10px] font-semibold shadow-sm md:block ${activo ? "text-primary" : "text-foreground/80"}`}
              >
                {punto.ciudad} · {cantidad} {cantidad === 1 ? "sede" : "sedes"}
              </span>
            </button>
          );
        })}

        <div className="absolute left-7 top-7 max-w-xs rounded-2xl border border-primary/10 bg-card/90 px-4 py-3 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <CircleDot className="h-3.5 w-3.5 text-primary" />
            Cobertura de la red
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Cada punto representa un tenant con una o más sedes registradas.
          </p>
        </div>

        <div className="absolute bottom-6 left-6 rounded-xl border border-primary/10 bg-card/90 px-2.5 py-1.5 text-[9px] text-muted-foreground shadow-sm backdrop-blur-md">
          © OpenStreetMap contributors
        </div>

        <div className="absolute bottom-6 right-6 rounded-2xl border border-primary/10 bg-card/90 px-3 py-2 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-md">
          {puntos.length} ciudades · {sucursales.filter((s) => s.activa).length} sedes activas
        </div>
      </div>
    </div>
  );
}

function Ranking({ items }: { items: { label: string; valor: number; texto: string }[] }) {
  const max = Math.max(...items.map((i) => i.valor), 1);

  return (
    <div className="space-y-5">
      {items.map((item, index) => (
        <div
          key={item.label}
          className="multi-fade-up"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="truncate text-sm font-medium text-foreground">{item.label}</span>
            <span className="shrink-0 text-sm font-bold text-foreground">{item.texto}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-primary/10">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${Math.max(6, (item.valor / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Modal({
  titulo,
  onClose,
  children,
  pie,
}: {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
  pie?: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-primary/20 bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{titulo}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-primary/5"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
        {pie && <div className="mt-6 flex justify-end gap-2">{pie}</div>}
      </div>
    </div>
  );
}

const BtnSecundario =
  "rounded-full border border-primary/20 bg-card px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-primary/5";
const BtnPrimario =
  "rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90";

/* ───────────────────────── Modales ───────────────────────── */

function ModalClinica({
  clinica,
  onClose,
  onGuardar,
}: {
  clinica?: Clinica;
  onClose: () => void;
  onGuardar: (d: DatosClinica) => void;
}) {
  const [nombre, setNombre] = useState(clinica?.nombre ?? "");
  const [razonSocial, setRazonSocial] = useState(clinica?.razonSocial ?? "");
  const [cuit, setCuit] = useState(clinica?.cuit ?? "");
  const [ciudad, setCiudad] = useState(clinica?.ciudad ?? "");
  const [adminEmail, setAdminEmail] = useState(clinica?.adminEmail ?? "");
  const [plan, setPlan] = useState<PlanId>(clinica?.plan ?? "Start");
  const [estado, setEstado] = useState<EstadoClinica>(clinica?.estado ?? "En prueba");
  const [color, setColor] = useState(clinica?.color ?? COLORES[0]);

  function guardar() {
    if (!nombre.trim() || !/^\S+@\S+\.\S+$/.test(adminEmail.trim())) {
      toast.error("Completá el nombre y un email de administrador válido.");
      return;
    }
    onGuardar({
      nombre: nombre.trim(),
      razonSocial: razonSocial.trim(),
      cuit: cuit.trim(),
      ciudad: ciudad.trim(),
      adminEmail: adminEmail.trim(),
      plan,
      estado,
      color,
    });
  }

  return (
    <Modal
      titulo={clinica ? "Editar clínica" : "Nueva clínica"}
      onClose={onClose}
      pie={
        <>
          <button onClick={onClose} className={BtnSecundario}>
            Cancelar
          </button>
          <button onClick={guardar} className={BtnPrimario}>
            {clinica ? "Guardar cambios" : "Crear clínica"}
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-foreground/80 sm:col-span-2">
          Nombre comercial
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Clínica Dental Esther"
            className={`${campo} mt-1`}
          />
        </label>
        <label className="text-xs font-medium text-foreground/80">
          Razón social
          <input
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
            className={`${campo} mt-1`}
          />
        </label>
        <label className="text-xs font-medium text-foreground/80">
          CUIT
          <input
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            placeholder="30-00000000-0"
            className={`${campo} mt-1`}
          />
        </label>
        <label className="text-xs font-medium text-foreground/80">
          Ciudad
          <input
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            className={`${campo} mt-1`}
          />
        </label>
        <label className="text-xs font-medium text-foreground/80">
          Email del administrador
          <input
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            className={`${campo} mt-1`}
          />
        </label>
        <label className="text-xs font-medium text-foreground/80">
          Plan
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as PlanId)}
            className={`${campo} mt-1`}
          >
            {PLANES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-foreground/80">
          Estado
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoClinica)}
            className={`${campo} mt-1`}
          >
            {ESTADOS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <div className="text-xs font-medium text-foreground/80 sm:col-span-2">
          Color de marca
          <div className="mt-2 flex gap-2">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ModalSucursal({
  onClose,
  onGuardar,
}: {
  onClose: () => void;
  onGuardar: (d: { nombre: string; direccion: string; responsable: string; boxes: number }) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [responsable, setResponsable] = useState("");
  const [boxes, setBoxes] = useState("2");

  function guardar() {
    const b = Number(boxes);
    if (!nombre.trim() || !direccion.trim() || !b || b < 1) {
      toast.error("Completá nombre, dirección y una cantidad de boxes válida.");
      return;
    }
    onGuardar({
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      responsable: responsable.trim() || "Sin asignar",
      boxes: b,
    });
  }

  return (
    <Modal
      titulo="Nueva sucursal"
      onClose={onClose}
      pie={
        <>
          <button onClick={onClose} className={BtnSecundario}>
            Cancelar
          </button>
          <button onClick={guardar} className={BtnPrimario}>
            Crear sucursal
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-foreground/80 sm:col-span-2">
          Nombre
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Sucursal Palermo"
            className={`${campo} mt-1`}
          />
        </label>
        <label className="text-xs font-medium text-foreground/80 sm:col-span-2">
          Dirección
          <input
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className={`${campo} mt-1`}
          />
        </label>
        <label className="text-xs font-medium text-foreground/80">
          Responsable
          <input
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
            className={`${campo} mt-1`}
          />
        </label>
        <label className="text-xs font-medium text-foreground/80">
          Boxes
          <input
            inputMode="numeric"
            value={boxes}
            onChange={(e) => setBoxes(e.target.value)}
            className={`${campo} mt-1`}
          />
        </label>
      </div>
    </Modal>
  );
}

function ModalDetalle({
  clinica,
  uso,
  onClose,
  onUsar,
  onEditar,
}: {
  clinica: Clinica;
  uso: { usuarios: number; profesionales: number; sucursales: number };
  onClose: () => void;
  onUsar: () => void;
  onEditar: () => void;
}) {
  const lim = PLAN_INFO[clinica.plan];

  return (
    <Modal
      titulo={clinica.nombre}
      onClose={onClose}
      pie={
        <>
          <button onClick={onEditar} className={BtnSecundario}>
            Editar
          </button>
          <button onClick={onUsar} className={BtnPrimario}>
            Usar esta clínica
          </button>
        </>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Pill className={planStyles[clinica.plan]}>Plan {clinica.plan}</Pill>
        <Pill className={estadoStyles[clinica.estado]}>{clinica.estado}</Pill>
        <span className="text-xs text-muted-foreground">{clinica.id}</span>
      </div>

      <div className="mb-5 grid gap-3 rounded-2xl bg-primary/[0.04] p-4 text-xs sm:grid-cols-2">
        <div>
          <span className="text-muted-foreground">Razón social</span>
          <div className="mt-0.5 text-sm font-medium text-foreground">
            {clinica.razonSocial || "—"}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">CUIT</span>
          <div className="mt-0.5 text-sm font-medium text-foreground">{clinica.cuit || "—"}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Ciudad</span>
          <div className="mt-0.5 text-sm font-medium text-foreground">{clinica.ciudad || "—"}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Administrador</span>
          <div className="mt-0.5 truncate text-sm font-medium text-foreground">
            {clinica.adminEmail}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Alta</span>
          <div className="mt-0.5 text-sm font-medium text-foreground">{clinica.alta}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Límite de sucursales</span>
          <div className="mt-0.5 text-sm font-medium text-foreground">{lim.sucursales}</div>
        </div>
      </div>

      <div className="space-y-4">
        <Barra label="Usuarios" actual={uso.usuarios} limite={lim.usuarios} />
        <Barra label="Profesionales" actual={uso.profesionales} limite={lim.profesionales} />
        <Barra label="Sucursales" actual={uso.sucursales} limite={lim.sucursales} />
        <Barra
          label="Almacenamiento (GB)"
          actual={clinica.almacenamiento}
          limite={lim.almacenamiento}
        />
      </div>
    </Modal>
  );
}

function SaludTenant({
  activa,
  uso,
}: {
  activa: Clinica;
  uso: { usuarios: number; profesionales: number; sucursales: number };
}) {
  const lim = PLAN_INFO[activa.plan];
  const porcentajes = [
    Math.round((uso.usuarios / lim.usuarios) * 100),
    Math.round((uso.profesionales / lim.profesionales) * 100),
    Math.round((uso.sucursales / lim.sucursales) * 100),
    Math.round((activa.almacenamiento / lim.almacenamiento) * 100),
  ];
  const maxUso = Math.min(100, Math.max(...porcentajes));
  const seguro = REGLAS_AISLAMIENTO.filter((r) => r.listo).length;
  const nivel =
    maxUso >= 90 ? "Revisar capacidad" : maxUso >= 75 ? "Atención preventiva" : "Operación estable";

  return (
    <div className="rounded-3xl border border-primary/10 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Salud del tenant</h3>
              <p className="text-[11px] text-muted-foreground">
                {activa.nombre} · {activa.plan}
              </p>
            </div>
          </div>
        </div>
        <Pill
          className={
            maxUso >= 90
              ? "border border-primary/20 bg-card text-foreground/80"
              : "bg-primary/10 text-primary"
          }
        >
          {nivel}
        </Pill>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-primary/[0.035] p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Mayor consumo
          </div>
          <div className="mt-1 text-lg font-bold text-foreground">{maxUso}%</div>
          <div className="text-[10px] text-muted-foreground">del límite configurado</div>
        </div>
        <div className="rounded-2xl bg-primary/[0.035] p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Separación de datos
          </div>
          <div className="mt-1 text-lg font-bold text-foreground">
            {seguro}/{REGLAS_AISLAMIENTO.length}
          </div>
          <div className="text-[10px] text-muted-foreground">garantías activas</div>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {[
          ["Usuarios", porcentajes[0]],
          ["Profesionales", porcentajes[1]],
          ["Sucursales", porcentajes[2]],
          ["Almacenamiento", porcentajes[3]],
        ].map(([label, pct]) => (
          <div key={label as string} className="flex items-center gap-3">
            <span className="w-24 text-[11px] text-muted-foreground">{label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${Math.min(100, pct as number)}%` }}
              />
            </div>
            <span className="w-9 text-right text-[10px] font-semibold text-foreground">
              {Math.min(100, pct as number)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Página ───────────────────────── */

export function MultiEmpresa() {
  const [tab, setTab] = useState<TabId>("resumen");
  const [clinicas, setClinicas] = useState<Clinica[]>(CLINICAS_INICIALES);
  const [sucursales, setSucursales] = useState<Sucursal[]>(SUCURSALES_INICIALES);
  const [usuarios, setUsuarios] = useState<Usuario[]>(USUARIOS_INICIALES);
  const [activaId, setActivaId] = useState(CLINICAS_INICIALES[0].id);
  const { usuario: usuarioSesion, clinica: clinicaSesion } = useSesion();
  const { plan: planDemo } = useCloudEsther();

  // La clínica de la sesión (la empresa que se registró) se suma como tenant,
  // con su usuario como administrador, y queda como clínica activa.
  useEffect(() => {
    if (!clinicaSesion || !usuarioSesion) return;
    setClinicas((prev) => {
      const previa = prev.find((c) => c.id === clinicaSesion.id);
      const propia: Clinica = {
        razonSocial: clinicaSesion.nombre,
        cuit: "—",
        ciudad: "—",
        estado: "En prueba",
        color: "#7c3aed",
        almacenamiento: 0,
        alta: new Date().toISOString().slice(0, 10),
        ...previa,
        id: clinicaSesion.id,
        nombre: clinicaSesion.nombre,
        adminEmail: usuarioSesion.email,
        plan: PLAN_DESDE_DEMO[planDemo],
      };
      return [propia, ...prev.filter((c) => c.id !== clinicaSesion.id)];
    });
    setUsuarios((prev) =>
      prev.some((u) => u.id === usuarioSesion.id)
        ? prev
        : [
            {
              id: usuarioSesion.id,
              clinic_id: clinicaSesion.id,
              nombre: usuarioSesion.nombre,
              email: usuarioSesion.email,
              rol: "Administrador",
              activo: true,
              ultimoAcceso: "Hoy",
            },
            ...prev,
          ],
    );
    setActivaId(clinicaSesion.id);
  }, [clinicaSesion, usuarioSesion, planDemo]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroPlan, setFiltroPlan] = useState<"Todos" | PlanId>("Todos");
  const [filtroEstado, setFiltroEstado] = useState<"Todos" | EstadoClinica>("Todos");

  const [modalClinica, setModalClinica] = useState<{ clinica?: Clinica } | null>(null);
  const [modalSucursal, setModalSucursal] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const activa = clinicas.find((c) => c.id === activaId) ?? clinicas[0];
  const detalle = clinicas.find((c) => c.id === detalleId) ?? null;

  const uso = useMemo(() => {
    const mapa: Record<string, { usuarios: number; profesionales: number; sucursales: number }> =
      {};
    clinicas.forEach((c) => {
      const us = usuarios.filter((u) => u.clinic_id === c.id);
      mapa[c.id] = {
        usuarios: us.length,
        profesionales: us.filter((u) => u.rol === "Profesional").length,
        sucursales: sucursales.filter((s) => s.clinic_id === c.id).length,
      };
    });
    return mapa;
  }, [clinicas, usuarios, sucursales]);

  const totales = useMemo(
    () => ({
      activas: clinicas.filter((c) => c.estado === "Activa").length,
      sucursales: sucursales.filter((s) => s.activa).length,
      usuarios: usuarios.filter((u) => u.activo).length,
      profesionales: usuarios.filter((u) => u.activo && u.rol === "Profesional").length,
    }),
    [clinicas, sucursales, usuarios],
  );

  const clinicasFiltradas = clinicas.filter(
    (c) =>
      `${c.nombre} ${c.ciudad} ${c.adminEmail}`.toLowerCase().includes(busqueda.toLowerCase()) &&
      (filtroPlan === "Todos" || c.plan === filtroPlan) &&
      (filtroEstado === "Todos" || c.estado === filtroEstado),
  );

  const porPlan = PLANES.map((p) => ({
    label: `Plan ${p}`,
    valor: clinicas.filter((c) => c.plan === p).length,
    texto: `${clinicas.filter((c) => c.plan === p).length} clínicas`,
  })).filter((x) => x.valor > 0);

  // Uso de usuarios sobre el límite del plan de cada clínica (sin montos: los precios van en el backend).
  const porUso = clinicas
    .map((c) => {
      const pct = Math.round((uso[c.id].usuarios / PLAN_INFO[c.plan].usuarios) * 100);
      return { label: c.nombre, valor: pct, texto: `${pct} % de usuarios` };
    })
    .sort((a, b) => b.valor - a.valor);

  const sucursalesActiva = sucursales.filter((s) => s.clinic_id === activa.id);
  const usuariosActiva = usuarios.filter((u) => u.clinic_id === activa.id);
  const limActiva = PLAN_INFO[activa.plan];

  function usarClinica(c: Clinica) {
    setActivaId(c.id);
    setDetalleId(null);
    registrarEvento({
      modulo: "Multiempresa",
      accion: "Cambio de clínica activa",
      entidad: "Clínica",
      antes: activa.nombre,
      despues: c.nombre,
    });
    toast.success(`Clínica activa: ${c.nombre}`);
  }

  function guardarClinica(datos: DatosClinica, existente?: Clinica) {
    if (existente) {
      const lim = PLAN_INFO[datos.plan];
      const u = uso[existente.id];
      if (
        u.usuarios > lim.usuarios ||
        u.profesionales > lim.profesionales ||
        u.sucursales > lim.sucursales
      ) {
        toast.error(`El plan ${datos.plan} no alcanza para el uso actual de ${existente.nombre}.`);
        return;
      }
      setClinicas((prev) => prev.map((c) => (c.id === existente.id ? { ...c, ...datos } : c)));
      registrarEvento({
        modulo: "Multiempresa",
        accion: "Edición de clínica",
        entidad: "Clínica",
        antes: `${existente.plan} · ${existente.estado}`,
        despues: `${datos.plan} · ${datos.estado}`,
      });
      toast.success("Clínica actualizada");
    } else {
      const nueva: Clinica = {
        id: `clinic_${Date.now()}`,
        ...datos,
        almacenamiento: 0,
        alta: new Date().toISOString().slice(0, 10),
      };
      setClinicas((prev) => [nueva, ...prev]);
      registrarEvento({
        modulo: "Multiempresa",
        accion: "Creación de clínica",
        entidad: "Clínica",
        despues: `${nueva.nombre} · ${nueva.plan}`,
      });
      toast.success("Clínica creada");
    }
    setModalClinica(null);
  }

  function alternarEstado(c: Clinica) {
    const nuevo: EstadoClinica = c.estado === "Suspendida" ? "Activa" : "Suspendida";
    setClinicas((prev) => prev.map((x) => (x.id === c.id ? { ...x, estado: nuevo } : x)));
    registrarEvento({
      modulo: "Multiempresa",
      accion: nuevo === "Suspendida" ? "Suspensión de clínica" : "Reactivación de clínica",
      entidad: "Clínica",
      antes: c.estado,
      despues: nuevo,
    });
    toast.success(nuevo === "Suspendida" ? `${c.nombre} suspendida` : `${c.nombre} reactivada`);
  }

  function guardarSucursal(d: {
    nombre: string;
    direccion: string;
    responsable: string;
    boxes: number;
  }) {
    if (sucursalesActiva.length >= limActiva.sucursales) {
      toast.error(`El plan ${activa.plan} permite hasta ${limActiva.sucursales} sucursal(es).`);
      return;
    }
    setSucursales((prev) => [
      ...prev,
      { id: `s${Date.now()}`, clinic_id: activa.id, activa: true, ...d },
    ]);
    registrarEvento({
      modulo: "Multiempresa",
      accion: "Creación de sucursal",
      entidad: "Sucursal",
      despues: `${d.nombre} · ${activa.nombre}`,
    });
    setModalSucursal(false);
    toast.success("Sucursal creada");
  }

  function alternarSucursal(s: Sucursal) {
    setSucursales((prev) => prev.map((x) => (x.id === s.id ? { ...x, activa: !x.activa } : x)));
    registrarEvento({
      modulo: "Multiempresa",
      accion: s.activa ? "Desactivación de sucursal" : "Activación de sucursal",
      entidad: "Sucursal",
      despues: s.nombre,
    });
    toast.success(s.activa ? "Sucursal desactivada" : "Sucursal activada");
  }

  function alternarUsuario(u: Usuario) {
    setUsuarios((prev) => prev.map((x) => (x.id === u.id ? { ...x, activo: !x.activo } : x)));
    registrarEvento({
      modulo: "Multiempresa",
      accion: u.activo ? "Desactivación de usuario" : "Reactivación de usuario",
      entidad: "Usuario",
      despues: u.email,
    });
    toast.success(u.activo ? "Usuario desactivado" : "Usuario reactivado");
  }

  function restablecerAcceso(u: Usuario) {
    registrarEvento({
      modulo: "Multiempresa",
      accion: "Restablecimiento de acceso",
      entidad: "Usuario",
      despues: u.email,
    });
    toast.success(`Se enviará un enlace de restablecimiento a ${u.email}`);
  }

  return (
    <div className="relative mx-auto w-full max-w-[1420px] space-y-5 px-4 py-6 md:px-6 lg:px-8">
      <FondoMultiEmpresa />

      {/* Encabezado */}
      <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-gradient-to-br from-white via-white/96 to-primary/[0.045] shadow-[0_20px_55px_-38px_rgba(76,29,149,0.55)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/55 via-primary to-pink-400/60" />
        <div className="relative flex flex-wrap items-start justify-between gap-5 p-5 md:p-7">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              <Building2 className="size-3.5" /> Enterprise
            </span>
            <h1 className="mt-4 text-[32px] font-bold tracking-[-0.035em] md:text-[40px]">
              Multiempresa
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground md:text-sm">
              Administrá las clínicas del grupo, sus sucursales, usuarios y planes desde un solo
              lugar. Cada clínica mantiene sus datos separados.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 py-1 pl-4 pr-1 text-xs font-medium text-muted-foreground backdrop-blur">
              Clínica activa
              <select
                value={activa.id}
                onChange={(e) => {
                  const c = clinicas.find((x) => x.id === e.target.value);
                  if (c) usarClinica(c);
                }}
                className="rounded-full border border-primary/20 bg-card px-3 py-1.5 text-xs font-semibold text-foreground"
              >
                {clinicas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={() => setModalClinica({})} className="btn-ce">
              <Plus className="h-4 w-4" />
              Nueva clínica
            </button>
          </div>
        </div>
      </section>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Clínicas activas"
          value={String(totales.activas)}
          hint={`${clinicas.length} en total`}
          icon={Building2}
        />
        <StatCard
          label="Sucursales"
          value={String(totales.sucursales)}
          hint="Sucursales habilitadas"
          icon={MapPin}
        />
        <StatCard
          label="Usuarios"
          value={String(totales.usuarios)}
          hint="Con acceso activo"
          icon={Users}
        />
        <StatCard
          label="Profesionales"
          value={String(totales.profesionales)}
          hint="En todas las clínicas"
          icon={Stethoscope}
        />
        <StatCard
          label="Requieren atención"
          value={String(clinicas.filter((c) => c.estado !== "Activa").length)}
          hint="En prueba o suspendidas"
          icon={Wallet}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-card/70 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar nombre={activa.nombre} color={activa.color} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">
                {activa.nombre}
              </span>
              <Pill className={planStyles[activa.plan]}>Plan {activa.plan}</Pill>
              <Pill className={estadoStyles[activa.estado]}>{activa.estado}</Pill>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {activa.ciudad} · {uso[activa.id].usuarios} usuarios · {uso[activa.id].sucursales}{" "}
              sucursales
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDetalleId(activa.id)}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card px-3 py-1.5 text-xs font-semibold text-foreground/80 transition hover:border-primary/30 hover:text-primary"
        >
          Ver ficha
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Navegación */}
      <nav
        className="flex flex-wrap gap-1.5 rounded-2xl border border-primary/10 bg-primary/[0.025] p-1.5"
        aria-label="Secciones de Multiempresa"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(124,58,237,0.8)]"
                : "text-muted-foreground hover:bg-white hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ───────────── RESUMEN ───────────── */}
      {tab === "resumen" && (
        <div className="space-y-5">
          <Panel
            title="Clínicas del sistema"
            action={
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {clinicas.length} clínicas
              </span>
            }
          >
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {clinicas.map((c, index) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setDetalleId(c.id)}
                  className="multi-fade-up group rounded-2xl border border-primary/10 bg-card p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary/20 hover:shadow-sm"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar nombre={c.nombre} color={c.color} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {c.nombre}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{c.ciudad}</div>
                      </div>
                    </div>
                    <Pill className={estadoStyles[c.estado]}>{c.estado}</Pill>
                  </div>

                  <Barra
                    label="Usuarios"
                    actual={uso[c.id].usuarios}
                    limite={PLAN_INFO[c.plan].usuarios}
                  />

                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                    <Pill className={planStyles[c.plan]}>Plan {c.plan}</Pill>
                    <span>
                      {uso[c.id].sucursales} suc. · {uso[c.id].profesionales} prof.
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
            <Panel
              title="Mapa de sedes"
              action={
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Red multi-tenant
                </span>
              }
            >
              <MapaSedes
                clinicas={clinicas}
                sucursales={sucursales}
                activaId={activa.id}
                onSeleccionar={(id) => {
                  setActivaId(id);
                  setTab("sucursales");
                }}
              />
            </Panel>

            <SaludTenant activa={activa} uso={uso[activa.id]} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Distribución por plan">
              <Ranking items={porPlan} />
            </Panel>

            <Panel title="Uso por clínica">
              {porUso.length === 0 ? (
                <Vacio texto="Todavía no hay clínicas." />
              ) : (
                <Ranking items={porUso} />
              )}
            </Panel>
          </div>

          <Panel title="Actividad reciente">
            <div className="space-y-3">
              {ACTIVIDAD.map((a) => (
                <Fila
                  key={a.id}
                  avatar={<IconoFila icon={ShieldCheck} />}
                  titulo={a.titulo}
                  detalle={a.detalle}
                />
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* ───────────── CLÍNICAS ───────────── */}
      {tab === "clinicas" && (
        <Panel
          title="Clínicas"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar clínica, ciudad..."
                  className="w-52 rounded-full border border-primary/20 bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <select
                value={filtroPlan}
                onChange={(e) => setFiltroPlan(e.target.value as "Todos" | PlanId)}
                className="rounded-full border border-primary/20 bg-card px-3 py-2 text-xs font-medium text-foreground/80"
              >
                <option value="Todos">Todos los planes</option>
                {PLANES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as "Todos" | EstadoClinica)}
                className="rounded-full border border-primary/20 bg-card px-3 py-2 text-xs font-medium text-foreground/80"
              >
                <option value="Todos">Todos los estados</option>
                {ESTADOS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          }
        >
          <div className="space-y-3">
            {clinicasFiltradas.length === 0 && (
              <Vacio texto="No hay clínicas que coincidan con los filtros." />
            )}

            {clinicasFiltradas.map((c) => (
              <Fila
                key={c.id}
                avatar={<Avatar nombre={c.nombre} color={c.color} />}
                titulo={
                  <span className="flex flex-wrap items-center gap-2">
                    {c.nombre}
                    <Pill className={planStyles[c.plan]}>{c.plan}</Pill>
                    <Pill className={estadoStyles[c.estado]}>{c.estado}</Pill>
                    {c.id === activa.id && (
                      <Pill className="bg-primary/10 text-primary">Activa ahora</Pill>
                    )}
                  </span>
                }
                detalle={`${c.ciudad} · ${uso[c.id].usuarios} usuarios · ${uso[c.id].sucursales} sucursales · ${c.adminEmail}`}
                derecha={
                  <>
                    <BotonIcono
                      icon={Eye}
                      titulo="Ver detalle"
                      onClick={() => setDetalleId(c.id)}
                    />
                    <BotonIcono
                      icon={Repeat}
                      titulo="Usar esta clínica"
                      onClick={() => usarClinica(c)}
                    />
                    <BotonIcono
                      icon={Pencil}
                      titulo="Editar"
                      onClick={() => setModalClinica({ clinica: c })}
                    />
                    <BotonIcono
                      icon={Power}
                      titulo={c.estado === "Suspendida" ? "Reactivar" : "Suspender"}
                      onClick={() => alternarEstado(c)}
                    />
                  </>
                }
              />
            ))}
          </div>
        </Panel>
      )}

      {/* ───────────── SUCURSALES ───────────── */}
      {tab === "sucursales" && (
        <Panel
          title={`Sucursales — ${activa.nombre}`}
          action={
            <button onClick={() => setModalSucursal(true)} className="btn-ce">
              <Plus className="h-4 w-4" />
              Nueva sucursal
            </button>
          }
        >
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-primary/[0.04] p-4">
              <div className="text-xs text-muted-foreground">Sucursales</div>
              <div className="mt-1 text-xl font-bold text-foreground">
                {sucursalesActiva.length}
              </div>
            </div>
            <div className="rounded-2xl bg-primary/[0.04] p-4">
              <div className="text-xs text-muted-foreground">Límite del plan {activa.plan}</div>
              <div className="mt-1 text-xl font-bold text-foreground">{limActiva.sucursales}</div>
            </div>
            <div className="rounded-2xl bg-primary/[0.04] p-4">
              <div className="text-xs text-muted-foreground">Boxes totales</div>
              <div className="mt-1 text-xl font-bold text-foreground">
                {sucursalesActiva.reduce((s, x) => s + x.boxes, 0)}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {sucursalesActiva.length === 0 && (
              <Vacio texto="Esta clínica todavía no tiene sucursales." />
            )}

            {sucursalesActiva.map((s) => (
              <Fila
                key={s.id}
                avatar={<IconoFila icon={MapPin} />}
                titulo={
                  <span className="flex items-center gap-2">
                    {s.nombre}
                    <Pill
                      className={
                        s.activa ? "bg-primary/10 text-primary" : "bg-rose-100 text-rose-700"
                      }
                    >
                      {s.activa ? "Activa" : "Inactiva"}
                    </Pill>
                  </span>
                }
                detalle={`${s.direccion} · ${s.boxes} boxes · Resp.: ${s.responsable}`}
                derecha={
                  <BotonIcono
                    icon={Power}
                    titulo={s.activa ? "Desactivar" : "Activar"}
                    onClick={() => alternarSucursal(s)}
                  />
                }
              />
            ))}
          </div>
        </Panel>
      )}

      {/* ───────────── USUARIOS ───────────── */}
      {tab === "usuarios" && (
        <Panel
          title={`Usuarios — ${activa.nombre}`}
          action={
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {usuariosActiva.length} / {limActiva.usuarios} del plan
            </span>
          }
        >
          <div className="mb-5 rounded-2xl bg-primary/[0.035] p-4 text-xs leading-relaxed text-muted-foreground">
            Cada usuario pertenece a una sola clínica. El login es único (usuario o email +
            contraseña) y, al autenticar, el sistema resuelve la clínica, el rol y los permisos. El
            administrador nunca ve la contraseña actual: solo puede restablecer el acceso o
            desactivar al usuario.
          </div>

          <div className="space-y-3">
            {usuariosActiva.length === 0 && (
              <Vacio texto="Esta clínica todavía no tiene usuarios." />
            )}

            {usuariosActiva.map((u) => (
              <Fila
                key={u.id}
                avatar={<Avatar nombre={u.nombre} color={activa.color} />}
                titulo={
                  <span className="flex flex-wrap items-center gap-2">
                    {u.nombre}
                    <Pill className="border border-primary/20 text-foreground/80">{u.rol}</Pill>
                    <Pill
                      className={
                        u.activo ? "bg-primary/10 text-primary" : "bg-rose-100 text-rose-700"
                      }
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </Pill>
                  </span>
                }
                detalle={`${u.email} · Último acceso: ${u.ultimoAcceso}`}
                derecha={
                  <>
                    <BotonIcono
                      icon={KeyRound}
                      titulo="Restablecer acceso"
                      onClick={() => restablecerAcceso(u)}
                    />
                    <BotonIcono
                      icon={Power}
                      titulo={u.activo ? "Desactivar" : "Reactivar"}
                      onClick={() => alternarUsuario(u)}
                    />
                  </>
                }
              />
            ))}
          </div>
        </Panel>
      )}

      {/* ───────────── PLANES Y AISLAMIENTO ───────────── */}
      {tab === "planes" && (
        <div className="space-y-5">
          <Panel
            title="Planes por clínica"
            action={
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Plan de {activa.nombre}: {activa.plan}
              </span>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PLANES.map((p, index) => {
                const info = PLAN_INFO[p];
                const actual = activa.plan === p;
                const cantidad = clinicas.filter((c) => c.plan === p).length;

                return (
                  <div
                    key={p}
                    className={`multi-fade-up rounded-2xl border bg-card p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-sm ${
                      actual
                        ? "border-primary shadow-sm"
                        : "border-primary/10 hover:border-primary/20"
                    }`}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <Pill className={planStyles[p]}>{p}</Pill>
                      <span className="text-[10px] text-muted-foreground">{cantidad} clínicas</span>
                    </div>
                    <div className="mt-3 text-sm font-semibold text-foreground">
                      {info.audiencia}
                    </div>

                    <ul className="mt-4 space-y-2 text-xs text-foreground/80">
                      {[
                        `${info.usuarios} usuarios`,
                        `${info.profesionales} profesionales`,
                        `${info.sucursales} sucursal(es)`,
                        `${info.almacenamiento} GB de archivos`,
                      ].map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel
            title="Aislamiento de datos"
            action={
              <span className="text-xs text-muted-foreground">
                Ninguna clínica ve datos de otra
              </span>
            }
          >
            <div className="space-y-3">
              {REGLAS_AISLAMIENTO.map((r) => (
                <Fila
                  key={r.titulo}
                  avatar={<IconoFila icon={ShieldCheck} />}
                  titulo={r.titulo}
                  detalle={r.detalle}
                  derecha={
                    <Pill
                      className={
                        r.listo
                          ? "bg-primary/10 text-primary"
                          : "border border-primary/20 bg-card text-foreground/80"
                      }
                    >
                      {r.listo ? "Activo" : "En preparación"}
                    </Pill>
                  }
                />
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* Modales */}
      {modalClinica && (
        <ModalClinica
          clinica={modalClinica.clinica}
          onClose={() => setModalClinica(null)}
          onGuardar={(d) => guardarClinica(d, modalClinica.clinica)}
        />
      )}

      {modalSucursal && (
        <ModalSucursal onClose={() => setModalSucursal(false)} onGuardar={guardarSucursal} />
      )}

      {detalle && (
        <ModalDetalle
          clinica={detalle}
          uso={uso[detalle.id]}
          onClose={() => setDetalleId(null)}
          onUsar={() => usarClinica(detalle)}
          onEditar={() => {
            setDetalleId(null);
            setModalClinica({ clinica: detalle });
          }}
        />
      )}
    </div>
  );
}
