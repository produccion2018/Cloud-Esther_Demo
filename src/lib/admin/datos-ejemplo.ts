import type {
  AdminUser,
  Clinica,
  ConsumoIAMensual,
  CuentaDemo,
  EventoActividad,
  IngresoDemo,
  PlanConfig,
} from "./tipos";

/* Ubicación: src/lib/admin/datos-ejemplo.ts
   DATOS DE EJEMPLO para ver el panel funcionando mientras no hay backend conectado.
   El panel los muestra con la etiqueta «Datos de ejemplo». Al configurar VITE_ADMIN_API_URL
   se dejan de usar y todo sale del backend. */

const DIA = 86_400_000;
const hace = (dias: number, horas = 0) => new Date(Date.now() - dias * DIA - horas * 3_600_000);
const iso = (d: Date) => d.toISOString();
const diaISO = (d: Date) => d.toISOString().slice(0, 10);
const en = (dias: number) => diaISO(new Date(Date.now() + dias * DIA));

/* ───────────── Planes: mismos valores que la web y el demo ───────────── */

export const PLANES_INICIALES: PlanConfig[] = [
  {
    id: "inicial",
    nombre: "Start",
    precioMensual: null,
    descuentoAnual: 0.15,
    sucursales: 1,
    usuariosInternos: 5,
    pacientesActivos: 500,
    odontograma: "2D",
  },
  {
    id: "profesional",
    nombre: "Pro",
    precioMensual: null,
    descuentoAnual: 0.15,
    sucursales: 3,
    usuariosInternos: 15,
    pacientesActivos: 2000,
    odontograma: "2D",
  },
  {
    id: "avanzada",
    nombre: "Plus",
    precioMensual: null,
    descuentoAnual: 0.15,
    sucursales: 6,
    usuariosInternos: 40,
    pacientesActivos: 5000,
    odontograma: "3D",
  },
  {
    id: "grupo",
    nombre: "Enterprise",
    precioMensual: null,
    descuentoAnual: 0.15,
    sucursales: 20,
    usuariosInternos: 150,
    pacientesActivos: 15000,
    odontograma: "3D",
  },
];

/* ───────────── Equipo interno ───────────── */

export const ADMINS_INICIALES: AdminUser[] = [
  {
    id: "adm-1",
    nombre: "Dueño Cloud Esther",
    email: "dueno@cloudesther.com",
    telefono: "",
    rol: "owner",
    activo: true,
    ultimoAcceso: iso(hace(0, 1)),
    creado: iso(hace(240)),
  },
  {
    id: "adm-2",
    nombre: "Socio Cloud Esther",
    email: "socio@cloudesther.com",
    telefono: "",
    rol: "partner",
    activo: true,
    ultimoAcceso: iso(hace(1, 3)),
    creado: iso(hace(240)),
  },
  {
    id: "adm-3",
    nombre: "Soporte Técnico",
    email: "soporte@cloudesther.com",
    telefono: "",
    rol: "support",
    activo: true,
    ultimoAcceso: iso(hace(2)),
    creado: iso(hace(60)),
  },
  {
    id: "adm-4",
    nombre: "Secretaría",
    email: "secretaria@cloudesther.com",
    telefono: "",
    rol: "customer-care",
    activo: true,
    ultimoAcceso: iso(hace(0, 4)),
    creado: iso(hace(30)),
  },
];

/** Contraseñas de prueba del modo sin backend (se guardan como hash; solo para probar). */
export const CLAVES_PRUEBA: Record<string, string> = {
  "dueno@cloudesther.com": "Dueno2026!",
  "socio@cloudesther.com": "Socio2026!",
  "soporte@cloudesther.com": "Soporte2026!",
  "secretaria@cloudesther.com": "Secretaria2026!",
};

/* ───────────── Clínicas clientes ───────────── */

type FilaClinica = [
  string,
  string,
  Clinica["plan"],
  Clinica["estadoPago"],
  number, // días hasta el cobro
  number, // meses de cliente
  [number, number, number, number, number], // sucursales, usuarios, pacientes activos, archivados, minutos IA
  string, // contacto
];

const FILAS: FilaClinica[] = [
  [
    "Clínica Dental Sonrisas",
    "Córdoba",
    "avanzada",
    "al-dia",
    12,
    14,
    [3, 22, 2870, 410, 1880],
    "Mariana López",
  ],
  [
    "Odontología Integral Norte",
    "Rosario",
    "profesional",
    "pendiente",
    3,
    9,
    [2, 11, 1460, 120, 640],
    "Diego Fernández",
  ],
  [
    "Centro Odontológico Palermo",
    "CABA",
    "grupo",
    "al-dia",
    20,
    22,
    [12, 96, 11230, 2040, 4120],
    "Laura Méndez",
  ],
  ["Dra. Paula Ríos", "Mendoza", "inicial", "al-dia", 8, 5, [1, 3, 310, 40, 0], "Paula Ríos"],
  [
    "Dental Care Patagonia",
    "Neuquén",
    "profesional",
    "mora",
    -9,
    11,
    [3, 14, 1890, 230, 520],
    "Sergio Luna",
  ],
  [
    "Sonríe Clínicas",
    "La Plata",
    "avanzada",
    "al-dia",
    15,
    7,
    [5, 34, 4410, 600, 2210],
    "Valeria Gómez",
  ],
  [
    "Consultorio Dr. Aguirre",
    "Tucumán",
    "inicial",
    "pendiente",
    2,
    3,
    [1, 4, 470, 25, 0],
    "Bruno Aguirre",
  ],
  [
    "Grupo Odonto Sur",
    "Bahía Blanca",
    "grupo",
    "al-dia",
    26,
    18,
    [9, 71, 8320, 1200, 3350],
    "Florencia Díaz",
  ],
  [
    "Estética Dental Belgrano",
    "CABA",
    "avanzada",
    "mora",
    -15,
    10,
    [2, 18, 2120, 300, 1460],
    "Martín González",
  ],
  [
    "Clínica Familiar Oeste",
    "Morón",
    "profesional",
    "al-dia",
    6,
    6,
    [1, 8, 980, 90, 210],
    "Ana Torres",
  ],
  [
    "OdontoKids Salta",
    "Salta",
    "inicial",
    "suspendida",
    -40,
    4,
    [1, 2, 150, 10, 0],
    "Julián Ortega",
  ],
];

export const CLINICAS_INICIALES: Clinica[] = FILAS.map(
  ([nombre, ciudad, plan, estadoPago, cobro, meses, [suc, usu, pac, arch, ia], contacto], i) => ({
    id: `cli-${String(i + 1).padStart(3, "0")}`,
    nombre,
    ciudad,
    pais: "Argentina",
    plan,
    ciclo: i % 4 === 0 ? "Anual" : "Mensual",
    importe: null,
    estadoPago,
    proximoCobro: en(cobro),
    clienteDesde: diaISO(hace(meses * 30)),
    contacto: {
      nombre: contacto,
      email: `${contacto.split(" ")[0]?.toLowerCase() ?? "contacto"}@${nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[^a-z]/g, "")
        .slice(0, 14)}.com`,
      telefono: `+54 11 5${String(100 + i * 37).slice(0, 3)}-${String(1000 + i * 211).slice(0, 4)}`,
    },
    uso: {
      sucursales: suc,
      usuariosInternos: usu,
      pacientesActivos: pac,
      pacientesArchivados: arch,
      minutosIA: ia,
    },
    ultimoAcceso: estadoPago === "suspendida" ? iso(hace(38)) : iso(hace(i % 3, i)),
  }),
);

/* ───────────── Cuentas de demo ───────────── */

const MODULOS = [
  "Dashboard",
  "Agenda y turnos",
  "Pacientes",
  "Historia clínica",
  "Odontograma 3D",
  "Odontograma 2D",
  "Facturación",
  "Presupuestos",
  "Esther IA",
  "Marketing y captación",
];

function ingresos(
  cantidad: number,
  diasAtras: number,
  minutos: number[],
  planes: string[],
): IngresoDemo[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const min = minutos[i % minutos.length] ?? 10;
    return {
      id: `ing-${diasAtras}-${i}`,
      inicio: iso(hace(Math.max(0, diasAtras - i * 2), 2 + i)),
      minutos: min,
      cierre: min >= 30 ? "Expiró" : i === cantidad - 1 && diasAtras === 0 ? "En curso" : "Salió",
      modulos: MODULOS.slice(i % 3, (i % 3) + 3 + (min > 20 ? 3 : 0)),
      planes: planes.slice(0, 1 + (i % planes.length)),
    } satisfies IngresoDemo;
  });
}

export const DEMOS_INICIALES: CuentaDemo[] = [
  {
    id: "demo-1",
    nombre: "Carolina Benítez",
    email: "carolina@sonrisaplena.com",
    telefono: "+54 9 351 555-1020",
    clinica: "Sonrisa Plena",
    pais: "Argentina",
    planElegido: "Plus",
    registrado: iso(hace(6)),
    ingresos: ingresos(5, 6, [30, 24, 30, 18, 12], ["Plus", "Enterprise"]),
    solicitudes: [{ fecha: iso(hace(1, 2)), tipo: "Contratación" }],
    estado: "En curso",
    notas: "",
    responsable: null,
  },
  {
    id: "demo-2",
    nombre: "Federico Paz",
    email: "fede@odontopaz.com.ar",
    telefono: "+54 9 11 4455-2211",
    clinica: "OdontoPaz",
    pais: "Argentina",
    planElegido: "Pro",
    registrado: iso(hace(3)),
    ingresos: ingresos(2, 3, [22, 9], ["Pro", "Plus"]),
    estado: "Contactada",
    notas: "Pidió presupuesto para 2 sucursales. Volver a llamar el lunes.",
    responsable: "Secretaría",
  },
  {
    id: "demo-3",
    nombre: "Lucía Herrera",
    email: "lucia@dentalherrera.com",
    telefono: "+56 9 8765 4321",
    clinica: "Dental Herrera",
    pais: "Chile",
    planElegido: "Start",
    registrado: iso(hace(12)),
    ingresos: ingresos(1, 12, [4], ["Start"]),
    estado: "Sin actividad",
    notas: "",
    responsable: null,
  },
  {
    id: "demo-4",
    nombre: "Gustavo Ibarra",
    email: "gibarra@grupoibarra.com",
    telefono: "+54 9 261 433-9090",
    clinica: "Grupo Ibarra Odontología",
    pais: "Argentina",
    planElegido: "Enterprise",
    registrado: iso(hace(20)),
    ingresos: ingresos(7, 20, [30, 30, 26, 30, 15, 30, 28], ["Enterprise", "Plus"]),
    estado: "Convertida",
    notas: "Contrató Enterprise anual. Alta como cliente.",
    responsable: "Socio Cloud Esther",
  },
  {
    id: "demo-5",
    nombre: "Natalia Suárez",
    email: "nati@clinicasuarez.uy",
    telefono: "+598 99 123 456",
    clinica: "Clínica Suárez",
    pais: "Uruguay",
    planElegido: "Plus",
    registrado: iso(hace(1)),
    ingresos: ingresos(2, 1, [30, 14], ["Plus"]),
    estado: "En curso",
    notas: "",
    responsable: null,
  },
  {
    id: "demo-6",
    nombre: "Pablo Medina",
    email: "pablo@medinadental.com",
    telefono: "+54 9 381 400-1122",
    clinica: "Medina Dental",
    pais: "Argentina",
    planElegido: "Pro",
    registrado: iso(hace(9)),
    ingresos: ingresos(3, 9, [12, 8, 6], ["Pro"]),
    estado: "Sin actividad",
    notas: "",
    responsable: null,
  },
  {
    id: "demo-7",
    nombre: "Romina Castro",
    email: "romina@odontocastro.com",
    telefono: "+54 9 341 677-3344",
    clinica: "Odonto Castro",
    pais: "Argentina",
    planElegido: "Start",
    registrado: iso(hace(15)),
    ingresos: ingresos(1, 15, [2], ["Start"]),
    estado: "Descartada",
    notas: "Buscaba solo agenda. No le interesa por ahora.",
    responsable: "Secretaría",
  },
  {
    id: "demo-8",
    nombre: "Hernán Vidal",
    email: "hvidal@sonrieya.com",
    telefono: "+54 9 223 555-8800",
    clinica: "Sonríe Ya",
    pais: "Argentina",
    planElegido: "Plus",
    registrado: iso(hace(0, 3)),
    ingresos: ingresos(1, 0, [18], ["Plus"]),
    solicitudes: [{ fecha: iso(hace(0, 1)), tipo: "Información comercial" }],
    estado: "En curso",
    notas: "",
    responsable: null,
  },
];

export const ACTIVIDAD_INICIAL: EventoActividad[] = [
  {
    id: "a1",
    fecha: iso(hace(0, 1)),
    actor: "Dueño Cloud Esther",
    accion: "Ingresó al panel",
    tipo: "acceso",
  },
  {
    id: "a2",
    fecha: iso(hace(0, 3)),
    actor: "Sistema",
    accion: "Nueva cuenta de demo: Sonríe Ya (Plus)",
    tipo: "demo",
  },
  {
    id: "a3",
    fecha: iso(hace(0, 4)),
    actor: "Secretaría",
    accion: "Marcó como contactada la demo de OdontoPaz",
    tipo: "demo",
  },
  {
    id: "a4",
    fecha: iso(hace(1, 2)),
    actor: "Sistema",
    accion: "Cobro registrado: Grupo Odonto Sur",
    tipo: "pago",
  },
  {
    id: "a5",
    fecha: iso(hace(2)),
    actor: "Sistema",
    accion: "Dental Care Patagonia pasó a mora (9 días)",
    tipo: "pago",
  },
  {
    id: "a6",
    fecha: iso(hace(3)),
    actor: "Socio Cloud Esther",
    accion: "Convirtió la demo de Grupo Ibarra en cliente Enterprise",
    tipo: "demo",
  },
  {
    id: "a7",
    fecha: iso(hace(5)),
    actor: "Dueño Cloud Esther",
    accion: "Invitó a Secretaría al panel",
    tipo: "equipo",
  },
];

export const CONSUMO_IA_INICIAL: ConsumoIAMensual[] = (() => {
  const meses = ["Abr", "May", "Jun", "Jul", "Ago", "Sep"];
  const valores = [6200, 7400, 8900, 10300, 12100, 14390];
  return meses.map((mes, i) => ({ mes, minutos: valores[i] ?? 0 }));
})();

/** Altas de clínicas por mes (últimos 6 meses). */
export const CRECIMIENTO_INICIAL = [
  { mes: "Abr", nuevas: 1, total: 5 },
  { mes: "May", nuevas: 1, total: 6 },
  { mes: "Jun", nuevas: 0, total: 6 },
  { mes: "Jul", nuevas: 2, total: 8 },
  { mes: "Ago", nuevas: 1, total: 9 },
  { mes: "Sep", nuevas: 2, total: 11 },
];
