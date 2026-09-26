export interface RRHHStat {
  label: string;
  value: string;
}

export interface RRHHMock {
  stats?: RRHHStat[];
  columnas: string[];
  filas: string[][];
}

export const RRHH_MOCK: Record<string, RRHHMock> = {
  dashboard: {
    stats: [
      { label: "Empleados activos", value: "18" },
      { label: "Ausencias hoy", value: "2" },
      { label: "Contratos por vencer", value: "3" },
      { label: "Capacitaciones en curso", value: "1" },
    ],
    columnas: ["Novedad", "Empleado", "Fecha"],
    filas: [
      ["Alta de legajo", "Martín Souza", "24 Sep 2026"],
      ["Vacaciones aprobadas", "Lucía Fernández", "22 Sep 2026"],
      ["Contrato próximo a vencer", "Dr. Juan Pérez", "05 Oct 2026"],
      ["Capacitación completada", "Ana Ríos", "18 Sep 2026"],
    ],
  },
  empleados: {
    stats: [
      { label: "Total", value: "18" },
      { label: "Odontólogos", value: "5" },
      { label: "Administrativos", value: "6" },
      { label: "Asistentes", value: "7" },
    ],
    columnas: ["Nombre", "Puesto", "Sucursal", "Estado"],
    filas: [
      ["Dr. Juan Pérez", "Odontólogo", "Centro", "Activo"],
      ["Lucía Fernández", "Asistente dental", "Centro", "Activo"],
      ["Martín Souza", "Recepción", "Norte", "Activo"],
      ["Ana Ríos", "Administrativa", "Centro", "Licencia"],
      ["Carla Gómez", "Odontóloga", "Palermo", "Activo"],
    ],
  },
  contratos: {
    stats: [
      { label: "Vigentes", value: "15" },
      { label: "Por vencer (30 días)", value: "3" },
      { label: "Vencidos", value: "0" },
    ],
    columnas: ["Empleado", "Tipo", "Inicio", "Vencimiento"],
    filas: [
      ["Dr. Juan Pérez", "Indefinido", "01 Mar 2022", "—"],
      ["Lucía Fernández", "Plazo fijo", "01 Jun 2024", "01 Jun 2026"],
      ["Martín Souza", "Plazo fijo", "15 Oct 2024", "15 Oct 2026"],
    ],
  },
  organigrama: {
    columnas: ["Nivel", "Puesto", "Reporta a"],
    filas: [
      ["1", "Dirección clínica", "—"],
      ["2", "Coordinación odontológica", "Dirección clínica"],
      ["2", "Coordinación administrativa", "Dirección clínica"],
      ["3", "Odontólogos", "Coordinación odontológica"],
      ["3", "Recepción / Administración", "Coordinación administrativa"],
    ],
  },
  "matriz-puestos": {
    columnas: ["Puesto", "Requisitos", "Responsabilidades clave"],
    filas: [
      ["Odontólogo", "Matrícula profesional vigente", "Atención clínica, diagnóstico, tratamientos"],
      ["Asistente dental", "Certificación de asistente", "Preparación de sala, instrumental, apoyo clínico"],
      ["Recepción", "Manejo de sistemas de agenda", "Turnos, atención al paciente, cobros"],
    ],
  },
  sucursales: {
    stats: [
      { label: "Sucursales", value: "3" },
      { label: "Departamentos", value: "4" },
    ],
    columnas: ["Sucursal", "Departamento", "Empleados"],
    filas: [
      ["Centro", "Clínico", "9"],
      ["Centro", "Administrativo", "3"],
      ["Norte", "Clínico", "3"],
      ["Palermo", "Clínico", "3"],
    ],
  },
  vacaciones: {
    stats: [
      { label: "Solicitudes pendientes", value: "2" },
      { label: "Aprobadas este mes", value: "4" },
      { label: "Días promedio usados", value: "12" },
    ],
    columnas: ["Empleado", "Desde", "Hasta", "Estado"],
    filas: [
      ["Lucía Fernández", "10 Oct 2026", "20 Oct 2026", "Aprobada"],
      ["Martín Souza", "01 Nov 2026", "10 Nov 2026", "Pendiente"],
      ["Carla Gómez", "15 Dic 2026", "31 Dic 2026", "Pendiente"],
    ],
  },
  ausencias: {
    stats: [
      { label: "Ausencias activas", value: "1" },
      { label: "Este mes", value: "3" },
    ],
    columnas: ["Empleado", "Tipo", "Desde", "Hasta"],
    filas: [
      ["Ana Ríos", "Licencia médica", "20 Sep 2026", "30 Sep 2026"],
      ["Martín Souza", "Personal", "18 Sep 2026", "18 Sep 2026"],
    ],
  },
  incapacidades: {
    columnas: ["Empleado", "Fecha inicio", "Fecha fin", "Constancia"],
    filas: [["Ana Ríos", "20 Sep 2026", "30 Sep 2026", "Cargada"]],
  },
  "control-horario": {
    stats: [
      { label: "Presentes hoy", value: "16" },
      { label: "Llegadas tarde (mes)", value: "5" },
      { label: "Horas extra (mes)", value: "22 hs" },
    ],
    columnas: ["Empleado", "Entrada", "Salida", "Estado"],
    filas: [
      ["Dr. Juan Pérez", "08:58", "18:05", "A tiempo"],
      ["Lucía Fernández", "09:12", "17:50", "Tarde"],
      ["Martín Souza", "08:55", "17:30", "A tiempo"],
    ],
  },
  nomina: {
    stats: [
      { label: "Nómina del mes", value: "$4.850.000" },
      { label: "Empleados liquidados", value: "18/18" },
    ],
    columnas: ["Empleado", "Sueldo bruto", "Neto", "Estado"],
    filas: [
      ["Dr. Juan Pérez", "$980.000", "$820.000", "Pagado"],
      ["Lucía Fernández", "$520.000", "$450.000", "Pagado"],
      ["Martín Souza", "$480.000", "$415.000", "Pendiente"],
    ],
  },
  documentacion: {
    columnas: ["Documento", "Categoría", "Última actualización"],
    filas: [
      ["Reglamento interno", "Institucional", "01 Ago 2026"],
      ["Protocolo de bioseguridad", "Clínico", "15 Jul 2026"],
      ["Manual de convivencia", "Institucional", "10 Jun 2026"],
    ],
  },
  "archivos-word-pdf": {
    columnas: ["Archivo", "Formato", "Subido por"],
    filas: [
      ["Contrato modelo.docx", "Word", "RR.HH."],
      ["Constancia laboral.pdf", "PDF", "RR.HH."],
    ],
  },
  "importacion-excel": {
    columnas: ["Archivo", "Tipo", "Fecha", "Estado"],
    filas: [
      ["empleados_septiembre.xlsx", "Importación", "20 Sep 2026", "Procesado"],
      ["nomina_agosto.xlsx", "Exportación", "01 Sep 2026", "Descargado"],
    ],
  },
  capacitaciones: {
    stats: [
      { label: "En curso", value: "1" },
      { label: "Completadas (año)", value: "6" },
    ],
    columnas: ["Curso", "Empleado", "Estado"],
    filas: [
      ["Bioseguridad avanzada", "Todo el equipo clínico", "En curso"],
      ["Atención al paciente", "Recepción", "Completado"],
      ["Actualización en endodoncia", "Dr. Juan Pérez", "Completado"],
    ],
  },
  "evaluacion-desempeno": {
    columnas: ["Empleado", "Período", "Puntaje", "Estado"],
    filas: [
      ["Dr. Juan Pérez", "1er semestre 2026", "9.2", "Completada"],
      ["Lucía Fernández", "1er semestre 2026", "8.5", "Completada"],
      ["Martín Souza", "2do semestre 2026", "—", "Pendiente"],
    ],
  },
  "historial-laboral": {
    columnas: ["Empleado", "Evento", "Fecha"],
    filas: [
      ["Dr. Juan Pérez", "Ingreso", "01 Mar 2022"],
      ["Dr. Juan Pérez", "Ascenso a coordinador clínico", "01 Feb 2025"],
      ["Lucía Fernández", "Ingreso", "01 Jun 2024"],
    ],
  },
  "comunicaciones-internas": {
    columnas: ["Título", "Autor", "Fecha"],
    filas: [
      ["Nuevo protocolo de turnos", "Dirección", "22 Sep 2026"],
      ["Recordatorio: capacitación viernes", "RR.HH.", "20 Sep 2026"],
    ],
  },
  "cumpleanos-eventos": {
    columnas: ["Evento", "Fecha"],
    filas: [
      ["Cumpleaños Lucía Fernández", "03 Oct 2026"],
      ["Capacitación en bioseguridad", "05 Oct 2026"],
    ],
  },
  reportes: {
    columnas: ["Reporte", "Período", "Formato"],
    filas: [
      ["Dotación de personal", "Septiembre 2026", "PDF"],
      ["Ausentismo mensual", "Septiembre 2026", "Excel"],
      ["Costo de nómina", "Año 2026", "PDF"],
    ],
  },
  "alertas-vencimientos": {
    stats: [
      { label: "Alertas activas", value: "3" },
    ],
    columnas: ["Alerta", "Empleado", "Vence"],
    filas: [
      ["Vencimiento de contrato", "Dr. Juan Pérez", "05 Oct 2026"],
      ["Vencimiento de matrícula", "Carla Gómez", "12 Nov 2026"],
      ["Renovación de certificación", "Lucía Fernández", "01 Dic 2026"],
    ],
  },
  "configuracion-rrhh": {
    columnas: ["Parámetro", "Valor"],
    filas: [
      ["Días de vacaciones anuales", "14 días"],
      ["Tolerancia de llegada tarde", "10 minutos"],
      ["Período de evaluación", "Semestral"],
    ],
  },
  "permisos-accesos": {
    columnas: ["Rol", "Puede ver", "Puede editar"],
    filas: [
      ["Administrador", "Todo el módulo", "Todo el módulo"],
      ["Coordinador", "Empleados, Vacaciones, Ausencias", "Vacaciones, Ausencias"],
      ["Recepción", "Cumpleaños, Comunicaciones", "—"],
    ],
  },
  auditoria: {
    columnas: ["Acción", "Usuario", "Fecha"],
    filas: [
      ["Editó legajo de Lucía Fernández", "Dr. Juan Pérez", "24 Sep 2026 · 10:32"],
      ["Aprobó vacaciones de Lucía Fernández", "RR.HH.", "22 Sep 2026 · 09:15"],
      ["Activó flujo n8n de cumpleaños", "RR.HH.", "20 Sep 2026 · 16:40"],
    ],
  },
};