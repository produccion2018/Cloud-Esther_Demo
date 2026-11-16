import { useEffect, useRef, useState } from "react";

import { useSesion } from "@/lib/cloud-esther/auth-store";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import type { PersonaEquipo, RolClinica } from "@/lib/clinica/api";
import { verEquipo } from "@/lib/clinica/api";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { cargarModulo } from "@/lib/clinica/sincronizar";
import type { ScheduleDay, TeamMember, TeamRole } from "@/lib/cloud-esther/equipo-profesional-data";

/* ───────────────────────────────────────────────────────────────
   Unificación del equipo (pedido de Camilo, nov 2026).
   Hay dos lugares de "equipo": Acceso (quién entra, backend) y el
   Equipo clínico (matrícula, firma, agenda). Este hook los combina
   para los selectores de profesional (recetas, agenda, etc.), para
   que muestren a TODAS las personas de la clínica, sin importar por
   dónde se cargaron. Es solo lectura: no escribe ni duplica datos.
   ─────────────────────────────────────────────────────────────── */
export function useProfesionalesClinica(): string[] {
  const { miembros } = useEquipo();
  const { usuario } = useSesion();
  const real = useClinicaReal();
  const [acceso, setAcceso] = useState<string[]>([]);

  // Trae los integrantes de Acceso (solo en clínica real).
  useEffect(() => {
    const slug = real?.slug;
    if (!slug) {
      setAcceso([]);
      return;
    }
    let vivo = true;
    verEquipo(slug)
      .then((e) => {
        if (vivo) setAcceso(e.personas.filter((p) => p.estado !== "desactivada").map((p) => p.nombre.trim()));
      })
      .catch(() => {
        if (vivo) setAcceso([]);
      });
    return () => {
      vivo = false;
    };
  }, [real?.slug]);

  const clinicos = miembros
    .filter((m) => m.role === "odontologo" && m.status !== "inactivo")
    .map((m) => `${m.firstName} ${m.lastName}`.trim());

  const todos = [...clinicos, ...acceso];
  const yo = usuario?.nombre?.trim();
  if (yo) todos.unshift(yo);
  // Sin repetidos, conservando el orden.
  return Array.from(new Set(todos.filter(Boolean)));
}

/* ───────── Unificación PROFUNDA del equipo ─────────
   Da de alta en el Equipo clínico (con perfil completo: horario por defecto,
   rol, etc.) a cada persona de Acceso que todavía no lo tenga. Así aparecen
   en TODOS lados (agenda, firma, historia), no solo en los selectores.
   Es ADDITIVO y seguro: nunca borra ni pisa a nadie, no duplica (match por
   email), y espera a que el equipo clínico cargue del servidor antes de tocar. */

const DIAS: ScheduleDay["day"][] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const horarioDefecto = (): ScheduleDay[] =>
  DIAS.map((day, i) => ({ day, active: i < 5, start: "09:00", end: "18:00" }));

const ROL_A_CLINICO: Record<RolClinica, TeamRole> = {
  admin: "administrador",
  odontologo: "odontologo",
  secretaria: "secretaria",
  asistente: "asistente",
};

function miembroDesdeAcceso(p: PersonaEquipo): TeamMember {
  const partes = p.nombre.trim().split(/\s+/);
  return {
    id: p.id,
    firstName: partes[0] ?? p.nombre,
    lastName: partes.slice(1).join(" "),
    role: ROL_A_CLINICO[p.rol] ?? "asistente",
    email: p.email,
    phone: "",
    status: p.estado === "desactivada" ? "inactivo" : "activo",
    schedule: horarioDefecto(),
    permissions: [],
    specialties: [],
  };
}

export function useSincronizarEquipo(): void {
  const real = useClinicaReal();
  const { setMiembros } = useEquipo();
  const hecho = useRef<string | null>(null);

  useEffect(() => {
    const slug = real?.slug;
    // Solo clínica real, una vez por clínica.
    if (!slug || hecho.current === slug) return;
    hecho.current = slug; // marcar antes del fetch para no duplicar en re-renders
    let vivo = true;
    // Clave: esperamos EXPLÍCITAMENTE a que el equipo clínico cargue del servidor
    // (cargarModulo resuelve también con 404 = vacío) y recién ahí combinamos con
    // Acceso. Antes esto dependía de moduloCargado() + un cambio de `miembros`, pero
    // si el módulo cargaba vacío sobre un estado ya vacío, el efecto no se re-disparaba
    // y el sync no corría nunca → la agenda quedaba sin integrantes.
    Promise.all([cargarModulo("equipo"), verEquipo(slug)])
      .then(([, e]) => {
        if (!vivo) return;
        // No damos de alta al Administrador como integrante clínico: es la cuenta, no un
        // profesional, y no queremos inventarle un horario de atención (ver punto 9).
        const nuevos = e.personas
          .filter((p) => p.email && p.rol !== "admin")
          .map(miembroDesdeAcceso);
        if (!nuevos.length) return;
        setMiembros((prev) => {
          // Dedupe por email contra el estado más reciente.
          const ya = new Set(prev.map((m) => (m.email ?? "").toLowerCase()).filter(Boolean));
          const faltan = nuevos.filter((n) => !ya.has(n.email.toLowerCase()));
          return faltan.length ? [...prev, ...faltan] : prev;
        });
      })
      .catch(() => {
        hecho.current = null; // si falló, permitir reintento
      });
    return () => {
      vivo = false;
    };
  }, [real?.slug, setMiembros]);
}
