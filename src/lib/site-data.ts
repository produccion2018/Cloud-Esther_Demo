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

export const plans: Plan[] = [
  {
    id: "esencial",
    name: "Esencial",
    tagline: "Para clínicas que están comenzando.",
    price: "$49.900",
    setup: "$99.000",
    branches: "1 sucursal",
    users: "Hasta 5 usuarios",
    support: "Soporte por email",
    modules: "Módulos base",
    features: [
      "Agenda y turnos",
      "Gestión de pacientes",
      "Historia clínica",
      "Notificaciones básicas",
      "Facturación simple",
    ],
  },
  {
    id: "profesional",
    name: "Profesional",
    tagline: "Para clínicas en crecimiento.",
    price: "$89.900",
    setup: "$179.000",
    branches: "Hasta 3 sucursales",
    users: "Hasta 15 usuarios",
    support: "Soporte prioritario",
    modules: "Módulos base + gestión clínica",
    features: [
      "Todo lo del plan Esencial",
      "Presupuestos y pagos",
      "Analítica y reportes",
      "Portal del paciente",
      "Laboratorio y documentos",
    ],
    featured: true,
  },
  {
    id: "avanzado",
    name: "Avanzado",
    tagline: "Para clínicas con mayor volumen.",
    price: "$164.900",
    setup: "$299.000",
    branches: "Hasta 6 sucursales",
    users: "Hasta 40 usuarios",
    support: "Soporte prioritario 24/5",
    modules: "Módulos avanzados",
    features: [
      "Todo lo del plan Profesional",
      "Marketing y captación",
      "Inventario",
      "Recursos Humanos",
      "Esther IA incluida",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Para grupos odontológicos y organizaciones.",
    price: "$284.900",
    setup: "$499.000",
    branches: "Sucursales ilimitadas",
    users: "Usuarios ilimitados",
    support: "Soporte dedicado 24/7",
    modules: "Todos los módulos",
    features: [
      "Todo lo del plan Avanzado",
      "Administración multiempresa",
      "Integraciones a medida",
      "Auditoría y control de accesos",
      "Gerente de cuenta asignado",
    ],
  },
];

export const comparison: { feature: string; values: string[] }[] = [
  { feature: "Agenda", values: ["✓", "✓", "✓", "✓"] },
  { feature: "Pacientes", values: ["✓", "✓", "✓", "✓"] },
  { feature: "Historia clínica", values: ["✓", "✓", "✓", "✓"] },
  { feature: "Turnos", values: ["✓", "✓", "✓", "✓"] },
  { feature: "Notificaciones", values: ["Básicas", "Avanzadas", "Avanzadas", "A medida"] },
  { feature: "Facturación", values: ["Simple", "✓", "✓", "✓"] },
  { feature: "Presupuestos", values: ["—", "✓", "✓", "✓"] },
  { feature: "Analítica", values: ["—", "✓", "Avanzada", "Avanzada"] },
  { feature: "Marketing", values: ["—", "—", "✓", "✓"] },
  { feature: "Inventario", values: ["—", "—", "✓", "✓"] },
  { feature: "Recursos Humanos", values: ["—", "—", "✓", "✓"] },
  { feature: "Portal del paciente", values: ["—", "✓", "✓", "✓"] },
  { feature: "Esther IA", values: ["—", "Limitada", "✓", "✓"] },
  { feature: "Integraciones", values: ["—", "Básicas", "✓", "A medida"] },
  { feature: "Multiempresa", values: ["—", "—", "—", "✓"] },
  { feature: "Soporte prioritario", values: ["—", "✓", "24/5", "24/7"] },
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
    q: "¿Puedo contratar módulos adicionales?",
    a: "Sí, los módulos se contratan por separado y se suman a tu plan actual sin interrumpir el servicio.",
  },
  {
    q: "¿Cloud Esther tiene inteligencia artificial?",
    a: "Esther IA te ayuda con resúmenes clínicos, sugerencias de agenda y análisis del rendimiento de la clínica.",
  },
];

export const modulesOfInterest = [
  "Agenda y gestión de citas",
  "Gestión de pacientes",
  "Gestión clínica",
  "Turnos",
  "Notificaciones",
  "Comunicación con pacientes",
  "Facturación y pagos",
  "Presupuestos",
  "Analítica y reportes",
  "Laboratorio",
  "Caja / Finanzas",
  "Marketing y captación",
  "Directorio de clínicas y odontólogos",
  "Seguridad y control de accesos",
  "Inventario",
  "Recursos Humanos",
  "Equipo profesional",
  "Administración multiempresa",
  "IA Esther",
  "Estudios y diagnóstico por imagen",
  "Portal del paciente",
  "Integraciones",
  "Documentos",
];
