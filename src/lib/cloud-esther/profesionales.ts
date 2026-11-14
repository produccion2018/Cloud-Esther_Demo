import { useEffect, useState } from "react";

import { useSesion } from "@/lib/cloud-esther/auth-store";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { verEquipo } from "@/lib/clinica/api";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";

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
