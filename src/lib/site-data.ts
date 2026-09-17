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
      "Odontograma 3D",
      "Comunicación con pacientes",
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
      "Estudios y diagnóstico por imagen",
      "Marketing y captación",
      "Inventario e insumos",
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
      "Documentos y seguridad avanzada",
      "Auditoría completa y backups",
      "Gerente de cuenta asignado",
    ],
  },
];

export const comparison: { feature: string; values: string[] }[] = [
  // Clínico
  { feature: "Dashboard", values: ["✓", "✓", "✓", "✓"] },
  { feature: "Agenda", values: ["✓", "✓", "✓", "✓"] },
  { feature: "Pacientes", values: ["✓", "✓", "✓", "✓"] },
  { feature: "Gestión clínica", values: ["✓", "✓", "✓", "✓"] },
  { feature: "Odontograma 3D", values: ["—", "✓", "✓", "✓"] },
  { feature: "Turnos", values: ["✓", "✓", "✓", "✓"] },
  { feature: "Estudios y diagnóstico", values: ["—", "—", "✓", "✓"] },
  { feature: "Laboratorio", values: ["—", "✓", "✓", "✓"] },
  // Operación
  { feature: "Comunicación", values: ["—", "✓", "✓", "✓"] },
  { feature: "Notificaciones", values: ["Básicas", "Avanzadas", "Avanzadas", "A medida"] },
  { feature: "Marketing", values: ["—", "—", "✓", "✓"] },
  { feature: "Portal del paciente", values: ["—", "✓", "✓", "✓"] },
  { feature: "Inventario", values: ["—", "—", "✓", "✓"] },
  { feature: "Insumos", values: ["—", "—", "✓", "✓"] },
  { feature: "Recursos Humanos", values: ["—", "—", "✓", "✓"] },
  // Administración
  { feature: "Facturación", values: ["Simple", "✓", "✓", "✓"] },
  { feature: "Presupuestos", values: ["—", "✓", "✓", "✓"] },
  { feature: "Analítica", values: ["—", "✓", "Avanzada", "Avanzada"] },
  { feature: "Esther IA", values: ["—", "Limitada", "✓", "✓"] },
  { feature: "Multiempresa", values: ["—", "—", "—", "✓"] },
  { feature: "Integraciones", values: ["—", "Básicas", "✓", "A medida"] },
  { feature: "Documentos y seguridad", values: ["—", "Básica", "✓", "Completa"] },
  { feature: "Auditoría", values: ["—", "Básica", "✓", "Completa"] },
  { feature: "Configuración", values: ["Básica", "✓", "✓", "A medida"] },
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
  "Dashboard",
  "Agenda y gestión de citas",
  "Gestión de pacientes",
  "Gestión clínica",
  "Odontograma 3D",
  "Turnos",
  "Estudios y diagnóstico por imagen",
  "Laboratorio",
  "Comunicación con pacientes",
  "Notificaciones",
  "Marketing y captación",
  "Portal del paciente",
  "Inventario",
  "Insumos",
  "Equipo profesional y RRHH",
  "Facturación y pagos",
  "Presupuestos",
  "Analítica y reportes",
  "IA Esther",
  "Administración multiempresa",
  "Integraciones",
  "Documentos y seguridad",
  "Auditoría",
  "Configuración",
];