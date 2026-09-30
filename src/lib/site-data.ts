export type Plan = {
  id: string;
  name: string;
  tagline: string;
  /** Los precios se cargan desde el panel administrativo (backend). */
  price?: string;
  setup?: string;

  /** Límite de sucursales dentro del tenant/organización. */
  branches: string;

  /**
   * Usuarios internos del tenant:
   * odontólogos, asistentes, secretarias, administradores, etc.
   * Se mantiene `users` por compatibilidad con PlanCards.
   */
  users: string;

  /**
   * Se mantiene el campo por compatibilidad con componentes existentes.
   * Comercialmente se muestra como pacientes registrados, no como
   * "usuarios externos", ya que los pacientes no son necesariamente
   * usuarios del sistema.
   */
  externalUsers: string;

  /**
   * Se mantiene por compatibilidad.
   * Vacío mientras el portal de pacientes no forme parte de la oferta
   * comercial activa del producto.
   */
  portalLimit: string;

  support: string;
  modules: string;
  features: string[];
  featured?: boolean;
};

/**
 * Los planes no incluyen precios:
 * se cargan desde el panel administrativo.
 *
 * Arquitectura comercial:
 * Start → Pro → Plus → Enterprise
 *
 * Cloud Esther funciona como SaaS multitenant.
 * Los límites indicados corresponden a cada tenant/organización.
 */
export const plans: Plan[] = [
  {
    id: "esencial",
    name: "Start",
    tagline: "Para clínicas que están comenzando.",
    branches: "1 sucursal",
    users: "Hasta 5 usuarios internos",
    externalUsers: "Hasta 100 pacientes registrados",
    portalLimit: "",
    support: "Soporte por email",
    modules: "Módulos esenciales",
    features: [
      "Dashboard",
      "Agenda y turnos",
      "Gestión de pacientes",
      "Gestión clínica",
      "Historia clínica",
      "Odontograma 2D",
      "Recetas y tratamientos",
      "Estudios clínicos",
      "Finanzas y facturación básica",
      "Notificaciones y recordatorios básicos",
    ],
  },

  {
    id: "profesional",
    name: "Pro",
    tagline: "Para clínicas en crecimiento.",
    branches: "Hasta 3 sucursales",
    users: "Hasta 15 usuarios internos",
    externalUsers: "Hasta 500 pacientes registrados",
    portalLimit: "",
    support: "Soporte prioritario",
    modules: "Módulos esenciales + gestión",
    features: [
      "Todo lo del plan Start",
      "Comunicación con pacientes",
      "Presupuestos",
      "Pagos y facturación avanzada",
      "Estudios y diagnóstico",
      "Laboratorio",
      "Analítica y reportes",
      "Documentos",
      "Notificaciones avanzadas",
      "Integraciones básicas",
      "Configuración básica",
    ],
    featured: true,
  },

  {
    id: "avanzado",
    name: "Plus",
    tagline: "Para clínicas con mayor volumen.",
    branches: "Hasta 6 sucursales",
    users: "Hasta 40 usuarios internos",
    externalUsers: "Hasta 2.000 pacientes registrados",
    portalLimit: "",
    support: "Soporte prioritario con atención ampliada",
    modules: "Módulos avanzados",
    features: [
      "Todo lo del plan Pro",
      "Odontograma 3D",
      "Estudios y diagnóstico avanzado",
      "Comunicación avanzada con pacientes",
      "Marketing y captación",
      "Inventario",
      "Recursos Humanos",
      "Permisos y accesos",
      "Esther IA",
      "Analítica avanzada",
      "Auditoría",
      "Integraciones avanzadas",
      "Configuración avanzada",
    ],
  },

  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Para grupos odontológicos y organizaciones.",
    branches: "Hasta 20 sucursales",
    users: "Hasta 150 usuarios internos",
    externalUsers: "Hasta 10.000 pacientes registrados",
    portalLimit: "",
    support: "Soporte dedicado 24/7",
    modules: "Todos los módulos",
    features: [
      "Todo lo del plan Plus",
      "Hasta 5 empresas por cuenta corporativa",
      "Administración multiempresa",
      "Gestión centralizada de sucursales",
      "Odontograma 3D avanzado",
      "Comunicación avanzada",
      "Marketing y captación avanzada",
      "Recursos Humanos avanzado",
      "Automatizaciones y workflows con n8n",
      "Esther IA avanzada",
      "Analítica avanzada",
      "Auditoría completa",
      "Integraciones personalizadas",
      "Documentos avanzados",
      "Seguridad avanzada",
      "Gerente de cuenta asignado",
    ],
  },
];

/**
 * Comparación de módulos incluidos en cada plan.
 *
 * Orden:
 * 0 = Start
 * 1 = Pro
 * 2 = Plus
 * 3 = Enterprise
 *
 * Los límites pertenecen al tenant/organización correspondiente.
 */
export const comparison: { feature: string; values: string[] }[] = [
  {
    feature: "Sucursales",
    values: ["1", "Hasta 3", "Hasta 6", "Hasta 20"],
  },

  {
    feature: "Usuarios internos",
    values: ["Hasta 5", "Hasta 15", "Hasta 40", "Hasta 150"],
  },

  {
    feature: "Pacientes registrados",
    values: ["Hasta 100", "Hasta 500", "Hasta 2.000", "Hasta 10.000"],
  },

  {
    feature: "Empresas por cuenta",
    values: ["1", "1", "1", "Hasta 5"],
  },

  { feature: "Dashboard", values: ["✓", "✓", "✓", "✓"] },

  { feature: "Agenda y turnos", values: ["✓", "✓", "✓", "✓"] },

  { feature: "Pacientes", values: ["✓", "✓", "✓", "✓"] },

  { feature: "Gestión clínica", values: ["✓", "✓", "✓", "✓"] },

  { feature: "Historia clínica", values: ["✓", "✓", "✓", "✓"] },

  { feature: "Odontograma 2D", values: ["✓", "✓", "—", "—"] },

  { feature: "Odontograma 3D", values: ["—", "—", "✓", "✓"] },

  {
    feature: "Odontograma 3D avanzado",
    values: ["—", "—", "—", "✓"],
  },

  {
    feature: "Estudios y diagnóstico",
    values: ["✓", "✓", "✓", "✓"],
  },

  {
    feature: "Diagnóstico avanzado",
    values: ["—", "—", "✓", "✓"],
  },

  { feature: "Laboratorio", values: ["—", "✓", "✓", "✓"] },

  { feature: "Finanzas", values: ["Básicas", "✓", "✓", "✓"] },

  {
    feature: "Facturación y pagos",
    values: ["Básica", "Avanzada", "Avanzada", "Avanzada"],
  },

  { feature: "Presupuestos", values: ["—", "✓", "✓", "✓"] },

  {
    feature: "Analítica",
    values: ["—", "✓", "Avanzada", "Avanzada"],
  },

  {
    feature: "Notificaciones",
    values: ["Básicas", "Avanzadas", "Avanzadas", "Avanzadas"],
  },

  {
    feature: "Comunicación",
    values: ["—", "✓", "Avanzada", "Avanzada"],
  },

  {
    feature: "Marketing y captación",
    values: ["—", "—", "✓", "Avanzada"],
  },

  {
    feature: "Inventario",
    values: ["—", "—", "✓", "✓"],
  },

  {
    feature: "Recursos Humanos",
    values: ["—", "—", "✓", "Avanzada"],
  },

  {
    feature: "Automatizaciones n8n",
    values: ["—", "—", "—", "✓"],
  },

  {
    feature: "Esther IA",
    values: ["—", "—", "✓", "Avanzada"],
  },

  {
    feature: "Documentos",
    values: ["—", "✓", "✓", "Avanzados"],
  },

  {
    feature: "Permisos y accesos",
    values: ["—", "—", "✓", "Avanzados"],
  },

  {
    feature: "Auditoría",
    values: ["—", "—", "✓", "Completa"],
  },

  {
    feature: "Configuración",
    values: ["Básica", "Básica", "Avanzada", "Avanzada"],
  },

  {
    feature: "Integraciones",
    values: ["—", "Básicas", "Avanzadas", "Personalizadas"],
  },

  {
    feature: "Multiempresa",
    values: ["—", "—", "—", "✓"],
  },

  {
    feature: "Gestión centralizada",
    values: ["—", "—", "—", "✓"],
  },

  {
    feature: "Portal de pacientes",
    values: ["—", "—", "—", "—"],
  },

  {
    feature: "Soporte",
    values: ["Email", "Prioritario", "Atención ampliada", "24/7"],
  },

  {
    feature: "Gerente de cuenta",
    values: ["—", "—", "—", "✓"],
  },
];

/**
 * Módulos que pueden contratarse adicionalmente.
 *
 * Importante:
 * "Adicional" significa que el módulo puede comercializarse
 * fuera del paquete principal cuando Cloud Esther lo habilite.
 * No implica que todos los módulos puedan agregarse a cualquier
 * plan sin restricciones comerciales.
 */
export type AdditionalModule = {
  id: string;
  name: string;
  description: string;
  price?: string;
  billing?: string;
};

export const additionalModules: AdditionalModule[] = [
  {
    id: "odontograma-3d",
    name: "Odontograma 3D",
    description:
      "Visualización odontológica tridimensional para explorar piezas, tratamientos, estados y evolución clínica.",
  },
  {
    id: "esther-ia",
    name: "Esther IA",
    description:
      "Asistente inteligente para resúmenes clínicos, análisis de información y apoyo en la gestión de la clínica.",
  },
  {
    id: "auditoria",
    name: "Auditoría",
    description:
      "Registro y trazabilidad de acciones para control interno, seguridad y seguimiento de actividad.",
  },
  {
    id: "marketing",
    name: "Marketing y captación",
    description:
      "Herramientas para campañas, captación de pacientes y seguimiento de oportunidades.",
  },
  {
    id: "comunicacion",
    name: "Comunicación",
    description:
      "Herramientas para comunicación y seguimiento de pacientes a través de los canales habilitados.",
  },
  {
    id: "inventario",
    name: "Inventario",
    description: "Control de insumos, existencias, movimientos y disponibilidad.",
  },
  {
    id: "recursos-humanos",
    name: "Recursos Humanos",
    description:
      "Gestión del equipo, empleados, asistencia, vacaciones, documentación y procesos internos.",
  },
  {
    id: "analitica-avanzada",
    name: "Analítica avanzada",
    description: "Indicadores y análisis avanzados para conocer el rendimiento de la clínica.",
  },
  {
    id: "laboratorio",
    name: "Laboratorio",
    description: "Gestión y seguimiento de trabajos enviados al laboratorio.",
  },
  {
    id: "estudios-diagnostico",
    name: "Estudios y diagnóstico",
    description: "Gestión de estudios, imágenes, diagnósticos y documentación clínica asociada.",
  },
  {
    id: "integraciones",
    name: "Integraciones",
    description: "Conexión de Cloud Esther con servicios externos y herramientas compatibles.",
  },
  {
    id: "automatizaciones-n8n",
    name: "Automatizaciones n8n",
    description: "Automatización de procesos y flujos de trabajo mediante n8n.",
  },
];

/**
 * Módulos disponibles para formularios de interés,
 * demostraciones y contratación.
 */
export const modulesOfInterest = [
  "Dashboard",
  "Agenda y gestión de turnos",
  "Gestión de pacientes",
  "Gestión clínica",
  "Historia clínica",
  "Odontograma básico",
  "Odontograma 3D",
  "Recetas y tratamientos",
  "Estudios y diagnóstico",
  "Laboratorio",
  "Facturación y pagos",
  "Presupuestos",
  "Analítica y reportes",
  "Analítica avanzada",
  "Notificaciones",
  "Comunicación con pacientes",
  "Marketing y captación",
  "Inventario",
  "Recursos Humanos",
  "Automatizaciones n8n",
  "Directorio de clínicas y odontólogos",
  "Seguridad y control de accesos",
  "Auditoría",
  "Configuración",
  "Equipo profesional",
  "Administración multiempresa",
  "IA Esther",
  "Documentos",
  "Integraciones",
];

/**
 * Preguntas frecuentes.
 */
export const faqs = [
  {
    q: "¿Cloud Esther sirve para cualquier clínica?",
    a: "Sí. Cloud Esther funciona como una plataforma SaaS multitenant para consultorios, clínicas con varias sucursales y organizaciones odontológicas.",
  },
  {
    q: "¿Cada clínica tiene sus propios datos?",
    a: "Sí. Cada empresa opera dentro de su propio tenant, con aislamiento de información, usuarios, pacientes, sucursales y permisos.",
  },
  {
    q: "¿Puedo cambiar de plan?",
    a: "Sí. Podés subir o bajar de plan según las necesidades de tu organización. La disponibilidad de módulos y límites se actualiza según el plan contratado.",
  },
  {
    q: "¿Puedo contratar módulos adicionales?",
    a: "Algunos módulos pueden contratarse por separado cuando estén disponibles para contratación adicional. Su disponibilidad depende del plan y de las condiciones comerciales vigentes.",
  },
  {
    q: "¿Puedo administrar varias sucursales?",
    a: "Sí. El plan Pro permite administrar hasta 3 sucursales, Plus hasta 6 y Enterprise hasta 20 sucursales dentro de la organización.",
  },
  {
    q: "¿Cuántos usuarios puedo tener?",
    a: "Start permite hasta 5 usuarios internos, Pro hasta 15, Plus hasta 40 y Enterprise hasta 150 usuarios internos.",
  },
  {
    q: "¿Cloud Esther permite administrar varias empresas?",
    a: "Sí. La administración multiempresa está disponible en Enterprise, con hasta 5 empresas por cuenta corporativa.",
  },
  {
    q: "¿Puedo migrar la información de mi clínica?",
    a: "La migración de información puede acompañarse durante el proceso de implementación, según el origen, formato y alcance de los datos.",
  },
  {
    q: "¿Existe período de prueba?",
    a: "Podés explorar una demostración de la plataforma con datos de ejemplo antes de contratar.",
  },
  {
    q: "¿Necesito instalar algún programa?",
    a: "No. Cloud Esther funciona en la nube y puede utilizarse desde un navegador compatible.",
  },
  {
    q: "¿Mis datos están protegidos?",
    a: "Cloud Esther contempla aislamiento entre tenants, control de accesos por roles y permisos, y registros de auditoría según el plan contratado.",
  },
  {
    q: "¿Cloud Esther tiene inteligencia artificial?",
    a: "Sí. Esther IA forma parte de los planes superiores y está orientada al apoyo de la gestión, análisis y procesos clínicos definidos por la plataforma.",
  },
];
