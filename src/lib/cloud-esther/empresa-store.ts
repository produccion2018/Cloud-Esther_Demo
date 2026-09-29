import { useEffect, useState } from "react";
import type { PlanId } from "@/lib/cloud-esther/data";

/* ─────────────────────────────────────────────
   Empresas registradas (multiempresa, localStorage)
   Cada registro en /registro crea (o actualiza, si el correo ya existe)
   una empresa y la deja como activa. El demo muestra la empresa activa.
───────────────────────────────────────────── */

export interface EmpresaRegistrada {
  id: string;
  nombre: string;
  contacto: string;
  email: string;
  plan: PlanId;
  alta: string;
}

const CLAVE_EMPRESAS = "cloud-esther:empresas";
const CLAVE_ACTIVA = "cloud-esther:empresa-activa";
const EVENTO_CAMBIO = "cloud-esther-empresa-changed";

function leerEmpresas(): EmpresaRegistrada[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLAVE_EMPRESAS);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function escribir(empresas: EmpresaRegistrada[], activaId: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAVE_EMPRESAS, JSON.stringify(empresas));
    if (activaId) window.localStorage.setItem(CLAVE_ACTIVA, activaId);
    else window.localStorage.removeItem(CLAVE_ACTIVA);
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
  window.dispatchEvent(new CustomEvent(EVENTO_CAMBIO));
}

function leerActivaId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CLAVE_ACTIVA);
  } catch {
    return null;
  }
}

export function registrarEmpresa(datos: Omit<EmpresaRegistrada, "id" | "alta">): EmpresaRegistrada {
  const empresas = leerEmpresas();
  const email = datos.email.trim().toLowerCase();
  const existente = empresas.find((e) => e.email === email);
  const empresa: EmpresaRegistrada = {
    id: existente?.id ?? `empresa_${Date.now()}`,
    alta: existente?.alta ?? new Date().toISOString().slice(0, 10),
    nombre: datos.nombre.trim(),
    contacto: datos.contacto.trim(),
    email,
    plan: datos.plan,
  };
  const siguientes = existente
    ? empresas.map((e) => (e.id === empresa.id ? empresa : e))
    : [...empresas, empresa];
  escribir(siguientes, empresa.id);
  return empresa;
}

/** Activa la empresa registrada con ese correo. Devuelve la empresa o null. */
export function iniciarSesionEmpresa(email: string): EmpresaRegistrada | null {
  const empresas = leerEmpresas();
  const empresa = empresas.find((e) => e.email === email.trim().toLowerCase()) ?? null;
  if (empresa) escribir(empresas, empresa.id);
  return empresa;
}

export function activarEmpresa(id: string) {
  const empresas = leerEmpresas();
  if (empresas.some((e) => e.id === id)) escribir(empresas, id);
}

export function cerrarSesionEmpresa() {
  escribir(leerEmpresas(), null);
}

export function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "CE";
}

/** Empresas registradas y la activa. Se carga después del montaje para no
 *  romper la hidratación del SSR, y se actualiza cuando cambia en otra pestaña
 *  o desde otro componente. */
export function useEmpresas() {
  const [estado, setEstado] = useState<{
    empresas: EmpresaRegistrada[];
    activa: EmpresaRegistrada | null;
  }>({
    empresas: [],
    activa: null,
  });

  useEffect(() => {
    const cargar = () => {
      const empresas = leerEmpresas();
      const activaId = leerActivaId();
      setEstado({ empresas, activa: empresas.find((e) => e.id === activaId) ?? null });
    };
    cargar();
    const onStorage = (e: StorageEvent) => {
      if (e.key === CLAVE_EMPRESAS || e.key === CLAVE_ACTIVA) cargar();
    };
    window.addEventListener(EVENTO_CAMBIO, cargar);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENTO_CAMBIO, cargar);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return estado;
}
