export type Plan = {
  id: string;
  name: string;
  tagline: string;
  price: string;
  setup: string;
  branches: string;
  users: string;
  support: string;
  modules: string;
  features: string[];
  featured?: boolean;
};

/**
 * Precios de referencia. Los valores no incluyen IVA;
 * el texto "+ IVA" se agrega en el componente de presentación (PlanCards).
 */
export const plans: Plan[] = [
  {
    id: "esencial",
    name: "Esencial",
    tagline: "Para clínicas que están comenzando.",
    price: "$79.900",
    setup: "$149.000",
    branches: "1 sucursal",
    users: "Hasta 5 usuarios",
    support: "Soporte por email",
    modules: "Módulos esenciales",
    features: [
      "Dashboard",
      "Agenda y turnos",
      "Gestión de pacientes",
      "Gestión clínica",
      "Historia clínica",
      "Odontograma básico",
      "Finanzas y facturación básica",
      "Notificaciones básicas",
      "Configuración de la clínica",
    ],
  },

  {
    id: "profesional",
    name: "Profesional",
    tagline: "Para clínicas en crecimiento.",
    price: "$139.900",
    setup: "$259.000",
    branches: "Hasta 3 sucursales",
    users: "Hasta 15 usuarios",
    support: "Soporte prioritario",
    modules: "Módulos esenciales + gestión",
    features: [
      "Todo lo del plan Esencial",
      "Comunicación con pacientes",
      "Presupuestos y pagos",
      "Estudios y diagnóstico",
      "Laboratorio",
      "Analítica y reportes",
      "Portal del paciente",
      "Documentos",
      "Seguridad y permisos",
      "Notificaciones avanzadas",
      "Integraciones básicas",
    ],
    featured: true,
  },

  {
    id: "avanzado",
    name: "Avanzado",
    tagline: "Para clínicas con mayor volumen.",
    price: "$249.900",
    setup: "$449.000",
    branches: "Hasta 6 sucursales",
    users: "Hasta 40 usuarios",
    support: "Soporte prioritario 24/5",
    modules: "Módulos avanzados",
    features: [
      "Todo lo del plan Profesional",
      "Odontograma 3D",
      "Estudios y diagnóstico avanzado",
      "Comunicación con pacientes",
      "Marketing y captación",
      "Inventario",
      "Recursos Humanos + automatizaciones n8n",
      "Esther IA",
      "Analítica avanzada",
      "Auditoría",
      "Integraciones avanzadas",
    ],
  },

  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Para grupos odontológicos y organizaciones.",
    price: "$429.900",
    setup: "$749.000",
    branches: "Sucursales ilimitadas",
    users: "Usuarios ilimitados",
    support: "Soporte dedicado 24/7",
    modules: "Todos los módulos",
    features: [
      "Todo lo del plan Avanzado",
      "Odontograma 3D avanzado",
      "Comunicación avanzada",
      "Marketing y captación avanzada",
      "Recursos Humanos + automatizaciones n8n",
      "Esther IA avanzada",
      "Auditoría completa",
      "Administración multiempresa",
      "Integraciones a medida",
      "Documentos y seguridad avanzada",
      "Gerente de cuenta asignado",
    ],
  },
];

/**
 * Comparación de módulos incluidos en cada plan.
 *
 * Orden:
 * 0 = Esencial
 * 1 = Profesional
 * 2 = Avanzado
 * 3 = Enterprise
 */
export const comparison: { feature: string; values: string[] }[] = [
  { feature: "Dashboard", values: ["✓", "✓", "✓", "✓"] },

  { feature: "Agenda y turnos", values: ["✓", "✓", "✓", "✓"] },

  { feature: "Pacientes", values: ["✓", "✓", "✓", "✓"] },

  { feature: "Gestión clínica", values: ["✓", "✓", "✓", "✓"] },

  { feature: "Historia clínica", values: ["✓", "✓", "✓", "✓"] },

  { feature: "Odontograma básico", values: ["✓", "✓", "✓", "✓"] },

  { feature: "Odontograma 3D", values: ["Adicional", "Adicional", "✓", "✓"] },

  { feature: "Estudios y diagnóstico", values: ["—", "✓", "✓", "✓"] },

  { feature: "Laboratorio", values: ["—", "✓", "✓", "✓"] },

  { feature: "Finanzas", values: ["Básicas", "✓", "✓", "✓"] },

  { feature: "Facturación y pagos", values: ["Simple", "✓", "✓", "✓"] },

  { feature: "Presupuestos", values: ["—", "✓", "✓", "✓"] },

  { feature: "Analítica", values: ["—", "✓", "Avanzada", "Avanzada"] },

  { feature: "Notificaciones", values: ["Básicas", "Avanzadas", "Avanzadas", "A medida"] },

  { feature: "Comunicación", values: ["—", "—", "✓", "Avanzada"] },

  { feature: "Marketing y captación", values: ["—", "—", "✓", "Avanzada"] },

  { feature: "Portal del paciente", values: ["—", "✓", "✓", "✓"] },

  { feature: "Inventario", values: ["—", "—", "✓", "✓"] },

  { feature: "Recursos Humanos", values: ["—", "—", "✓ + n8n", "✓ + n8n"] },

  { feature: "Equipo profesional", values: ["✓", "✓", "✓", "✓"] },

  { feature: "Documentos", values: ["—", "✓", "✓", "✓"] },

  { feature: "Seguridad y permisos", values: ["Básica", "✓", "Avanzada", "Avanzada"] },

  { feature: "Auditoría", values: ["Adicional", "Adicional", "✓", "Completa"] },

  { feature: "Configuración", values: ["✓", "✓", "✓", "✓"] },

  { feature: "Esther IA", values: ["Adicional", "Adicional", "✓", "✓"] },

  { feature: "Integraciones", values: ["—", "Básicas", "Avanzadas", "A medida"] },

  { feature: "Multiempresa", values: ["—", "—", "—", "✓"] },

  { feature: "Soporte prioritario", values: ["—", "✓", "24/5", "24/7"] },
];

/**
 * Módulos que el cliente puede contratar por separado,
 * independientemente del plan contratado.
 *
 * Los precios son valores de referencia iniciales.
 * Se muestran sin IVA para luego calcular el impuesto.
 */
export type AdditionalModule = {
  id: string;
  name: string;
  description: string;
  price: string;
  billing: string;
};

export const additionalModules: AdditionalModule[] = [
  {
    id: "odontograma-3d",
    name: "Odontograma 3D",
    description:
      "Odontograma en 3D para visualizar piezas, tratamientos, estados y evolución clínica. El odontograma básico ya está incluido en todos los planes.",
    price: "$34.900",
    billing: "por mes + IVA",
  },
  {
    id: "esther-ia",
    name: "Esther IA",
    description:
      "Asistente inteligente para resúmenes clínicos, agenda y análisis del rendimiento.",
    price: "$49.900",
    billing: "por mes + IVA",
  },
  {
    id: "auditoria",
    name: "Auditoría",
    description:
      "Registro y trazabilidad de acciones de usuarios para control y cumplimiento.",
    price: "$29.900",
    billing: "por mes + IVA",
  },
  {
    id: "marketing",
    name: "Marketing y captación",
    description:
      "Herramientas para campañas, captación y seguimiento de oportunidades.",
    price: "$42.900",
    billing: "por mes + IVA",
  },
  {
    id: "comunicacion",
    name: "Comunicación",
    description:
      "Herramientas avanzadas para comunicación y seguimiento de pacientes.",
    price: "$42.900",
    billing: "por mes + IVA",
  },
  {
    id: "inventario",
    name: "Inventario",
    description:
      "Control de insumos, stock, movimientos y disponibilidad.",
    price: "$34.900",
    billing: "por mes + IVA",
  },
  {
    id: "recursos-humanos",
    name: "Recursos Humanos + n8n",
    description:
      "Gestión del equipo y automatizaciones de procesos mediante n8n.",
    price: "$54.900",
    billing: "por mes + IVA",
  },
  {
    id: "portal-paciente",
    name: "Portal del paciente",
    description:
      "Acceso del paciente a información, documentos, turnos y comunicaciones.",
    price: "$34.900",
    billing: "por mes + IVA",
  },
  {
    id: "analitica-avanzada",
    name: "Analítica avanzada",
    description:
      "Indicadores y análisis avanzados para conocer el rendimiento de la clínica.",
    price: "$42.900",
    billing: "por mes + IVA",
  },
  {
    id: "laboratorio",
    name: "Laboratorio",
    description:
      "Gestión y seguimiento de trabajos enviados al laboratorio.",
    price: "$34.900",
    billing: "por mes + IVA",
  },
  {
    id: "estudios-diagnostico",
    name: "Estudios y diagnóstico",
    description:
      "Gestión de estudios, imágenes, diagnósticos y documentación asociada.",
    price: "$34.900",
    billing: "por mes + IVA",
  },
  {
    id: "integraciones",
    name: "Integraciones",
    description:
      "Conexión con servicios externos y automatización de procesos.",
    price: "$49.900",
    billing: "por mes + IVA",
  },
];

/**
 * Módulos disponibles para mostrar en formularios de interés,
 * demostraciones y contratación.
 */
export const modulesOfInterest = [
  "Agenda y gestión de citas",
  "Gestión de pacientes",
  "Gestión clínica",
  "Odontograma básico",
  "Odontograma 3D",
  "Turnos",
  "Notificaciones",
  "Comunicación con pacientes",
  "Facturación y pagos",
  "Presupuestos",
  "Analítica y reportes",
  "Analítica avanzada",
  "Laboratorio",
  "Caja / Finanzas",
  "Marketing y captación",
  "Directorio de clínicas y odontólogos",
  "Seguridad y control de accesos",
  "Auditoría",
  "Configuración",
  "Inventario",
  "Recursos Humanos + n8n",
  "Equipo profesional",
  "Administración multiempresa",
  "IA Esther",
  "Estudios y diagnóstico por imagen",
  "Portal del paciente",
  "Integraciones",
  "Documentos",
];

export const faqs = [
  {
    q: "¿Cloud Esther sirve para cualquier clínica?",
    a: "Sí. Funciona tanto para consultorios individuales como para clínicas con varias sucursales y equipos grandes.",
  },
  {
    q: "¿Puedo cambiar de plan?",
    a: "Podés subir o bajar de plan cuando lo necesites. Los módulos se activan al instante desde la administración.",
  },
  {
    q: "¿Puedo contratar módulos adicionales?",
    a: "Sí. Podés contratar módulos individuales además de tu plan actual. Por ejemplo, una clínica puede contratar el plan Esencial y agregar el Odontograma 3D o Esther IA sin necesidad de cambiar de plan.",
  },
  {
    q: "¿Puedo administrar varias sucursales?",
    a: "Desde el plan Profesional podés gestionar múltiples sucursales con agendas, equipos y reportes independientes.",
  },
  {
    q: "¿Puedo agregar diferentes usuarios?",
    a: "Sí, con roles y permisos diferenciados para profesionales, recepción, administración y dirección.",
  },
  {
    q: "¿Puedo migrar la información de mi clínica?",
    a: "Acompañamos la migración de pacientes, historias clínicas y agenda dentro del proceso de implementación.",
  },
  {
    q: "¿Existe período de prueba?",
    a: "Podés explorar una demo completa de la plataforma con datos de ejemplo antes de contratar.",
  },
  {
    q: "¿Necesito instalar algún programa?",
    a: "No. Cloud Esther funciona en la nube desde cualquier navegador, computadora o tablet.",
  },
  {
    q: "¿Mis datos están protegidos?",
    a: "Trabajamos con cifrado, control de accesos por rol y registros de auditoría de cada acción.",
  },
  {
    q: "¿Cloud Esther tiene inteligencia artificial?",
    a: "Esther IA te ayuda con resúmenes clínicos, sugerencias de agenda y análisis del rendimiento de la clínica.",
  },
];