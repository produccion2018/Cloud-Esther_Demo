import { Navigate, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { RoleProvider } from "@/components/admin/role";
import { Toaster } from "@/components/ui/sonner";
import { marcarActividadSesion, registrarSalida, registrarSeccionSesion } from "@/lib/admin/api";
import { aplicarPreferencias, leerPreferencias } from "@/lib/admin/preferencias";
import {
  INACTIVIDAD_MS,
  cerrarSesionAdmin,
  inactivoDesde,
  marcarActividad,
  useSesionAdmin,
} from "@/lib/admin/sesion";

/* Panel del dueño de Cloud Esther, dentro de la misma aplicación del SaaS: tusitio.com/admin.
   No hay enlaces desde la web pública; se entra con usuario y contraseña del panel. */
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel del dueño | Cloud Esther" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

/** Pantallas que se ven sin sesión. */
const PUBLICAS = ["/admin/login", "/admin/recuperar", "/admin/restablecer"];

function AdminLayout() {
  const sesion = useSesionAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const publica = PUBLICAS.some((p) => pathname.startsWith(p));
  // La sesión vive en el navegador: hasta montar no se sabe si hay una.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  // Paleta y apariencia propias del panel (claro/oscuro y color del menú). Al salir del panel
  // se devuelve todo como estaba, para no tocar el diseño del SaaS.
  useEffect(() => {
    const raiz = document.documentElement;
    const teniaOscuro = raiz.classList.contains("dark");
    raiz.dataset["app"] = "panel";
    aplicarPreferencias();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const cambio = () => leerPreferencias().tema === "sistema" && aplicarPreferencias();
    mq.addEventListener("change", cambio);
    return () => {
      mq.removeEventListener("change", cambio);
      delete raiz.dataset["app"];
      delete raiz.dataset["lateral"];
      raiz.classList.toggle("dark", teniaOscuro);
    };
  }, []);

  // Auditoría: sección del panel usada en esta sesión.
  useEffect(() => {
    if (sesion && !publica) void registrarSeccionSesion(pathname);
  }, [sesion, publica, pathname]);

  // Cierre por inactividad (30 minutos sin usar el panel).
  useEffect(() => {
    if (!sesion) return;
    let ultimo = 0;
    let ultimoAuditoria = 0;
    const actividad = () => {
      const ahora = Date.now();
      if (ahora - ultimo > 15_000) {
        ultimo = ahora;
        marcarActividad();
      }
      // Última actividad de la sesión para la auditoría (cada minuto como máximo).
      if (ahora - ultimoAuditoria > 60_000) {
        ultimoAuditoria = ahora;
        void marcarActividadSesion();
      }
    };
    const eventos = ["pointerdown", "keydown", "scroll", "mousemove"] as const;
    eventos.forEach((e) => window.addEventListener(e, actividad, { passive: true }));
    const t = window.setInterval(() => {
      if (Date.now() - inactivoDesde() > INACTIVIDAD_MS) {
        void registrarSalida("Inactividad").finally(() => cerrarSesionAdmin("inactividad"));
      }
    }, 30_000);
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, actividad));
      window.clearInterval(t);
    };
  }, [sesion]);

  if (!montado) return <div className="min-h-screen bg-background" />;
  if (!sesion && !publica) return <Navigate to="/admin/login" replace />;
  if (sesion && pathname.startsWith("/admin/login")) return <Navigate to="/admin" replace />;

  return (
    <RoleProvider>
      <Outlet />
      <Toaster position="top-right" richColors closeButton />
    </RoleProvider>
  );
}
