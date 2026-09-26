export type RRHHCategoriaId =
  | "gestion-personal"
  | "asistencia-tiempo"
  | "nomina-documentacion"
  | "desarrollo"
  | "comunicacion"
  | "automatizacion-reportes"
  | "configuracion-seguridad";

export interface RRHHItem {
  id: string;
  label: string;
  descripcion: string;
}

export interface RRHHCategoria {
  id: RRHHCategoriaId;
  label: string;
  items: RRHHItem[];
}

export const RRHH_CATEGORIAS: RRHHCategoria[] = [
  {
    id: "gestion-personal",
    label: "Gestión de personal",
    items: [
      { id: "dashboard", label: "Dashboard de RR.HH.", descripcion: "Resumen general: dotación, altas/bajas, alertas activas." },
      { id: "empleados", label: "Empleados", descripcion: "Listado y ficha de cada empleado." },
      { id: "legajos", label: "Legajos digitales", descripcion: "Documentación personal y laboral de cada empleado." },
      { id: "contratos", label: "Contratos", descripcion: "Contratos vigentes, vencimientos y renovaciones." },
      { id: "organigrama", label: "Organigrama", descripcion: "Estructura jerárquica de la clínica." },
      { id: "matriz-puestos", label: "Matriz de puestos y roles", descripcion: "Puestos, responsabilidades y requisitos de cada rol." },
      { id: "sucursales", label: "Sucursales y departamentos", descripcion: "Organización por sede y área." },
    ],
  },
  {
    id: "asistencia-tiempo",
    label: "Asistencia y tiempo",
    items: [
      { id: "vacaciones", label: "Vacaciones", descripcion: "Solicitudes, saldos y calendario de vacaciones." },
      { id: "ausencias", label: "Ausencias y licencias", descripcion: "Licencias médicas, personales y otras ausencias." },
      { id: "incapacidades", label: "Incapacidades", descripcion: "Carga de constancias de incapacidad y seguimiento." },
      { id: "control-horario", label: "Control horario", descripcion: "Fichadas, horas trabajadas y llegadas tarde." },
    ],
  },
  {
    id: "nomina-documentacion",
    label: "Nómina y documentación",
    items: [
      { id: "nomina", label: "Nómina", descripcion: "Liquidación de sueldos y recibos." },
      { id: "documentacion", label: "Documentación", descripcion: "Documentos generales del área de RR.HH." },
      { id: "archivos-word-pdf", label: "Gestión de archivos Word/PDF", descripcion: "Repositorio de documentos editables y PDF." },
      { id: "importacion-excel", label: "Importación/exportación Excel", descripcion: "Carga y descarga masiva de datos en Excel." },
    ],
  },
  {
    id: "desarrollo",
    label: "Desarrollo y desempeño",
    items: [
      { id: "capacitaciones", label: "Capacitaciones", descripcion: "Cursos, certificaciones y seguimiento de formación." },
      { id: "evaluacion-desempeno", label: "Evaluación de desempeño", descripcion: "Evaluaciones periódicas por empleado." },
      { id: "historial-laboral", label: "Historial laboral", descripcion: "Trayectoria del empleado dentro de la clínica." },
    ],
  },
  {
    id: "comunicacion",
    label: "Comunicación",
    items: [
      { id: "comunicaciones-internas", label: "Comunicaciones internas", descripcion: "Anuncios y novedades para el equipo." },
      { id: "cumpleanos-eventos", label: "Cumpleaños y eventos", descripcion: "Calendario de cumpleaños y eventos internos." },
    ],
  },
  {
    id: "automatizacion-reportes",
    label: "Automatización y reportes",
    items: [
      { id: "automatizaciones-n8n", label: "Automatizaciones con n8n", descripcion: "Flujos automáticos conectados a n8n." },
      { id: "reportes", label: "Reportes de RR.HH.", descripcion: "Reportes exportables de todo el módulo." },
      { id: "alertas-vencimientos", label: "Alertas y vencimientos", descripcion: "Vencimientos de contratos, licencias y documentos." },
    ],
  },
  {
    id: "configuracion-seguridad",
    label: "Configuración y seguridad",
    items: [
      { id: "configuracion-rrhh", label: "Configuración de RR.HH.", descripcion: "Parámetros generales del módulo." },
      { id: "permisos-accesos", label: "Permisos y accesos", descripcion: "Quién puede ver o editar cada sección." },
      { id: "auditoria", label: "Auditoría de acciones", descripcion: "Registro de cambios realizados en el módulo." },
    ],
  },
];

export const RRHH_ITEMS_FLAT: RRHHItem[] = RRHH_CATEGORIAS.flatMap((c) => c.items);