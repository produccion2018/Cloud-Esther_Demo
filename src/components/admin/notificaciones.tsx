import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  CreditCard,
  Handshake,
  LifeBuoy,
  RefreshCw,
  Server,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { canAccess, useRole } from "./role";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { actualizarNotificaciones } from "@/lib/admin/api";
import { useAccion, useNotificaciones } from "@/lib/admin/consultas";
import { haceCuanto } from "@/lib/admin/formato";
import type { CategoriaNotificacion, Notificacion } from "@/lib/admin/tipos-empresa";
import { cn } from "@/lib/utils";

/* Ubicación: src/components/admin/notificaciones.tsx
   Centro de notificaciones del panel: campana con no leídas y piezas compartidas con
   /admin/notificaciones. Cada perfil ve solo las de las secciones a las que tiene acceso.
   TODO backend: el servidor genera las notificaciones (pagos, demos, tickets, seguridad). */

export const ICONO_CATEGORIA: Record<CategoriaNotificacion, LucideIcon> = {
  Clínicas: Building2,
  Suscripciones: RefreshCw,
  Pagos: CreditCard,
  Comercial: Handshake,
  Soporte: LifeBuoy,
  Seguridad: ShieldAlert,
  Sistema: Server,
};

export const TONO_PRIORIDAD = { Alta: "peligro", Media: "alerta", Baja: "neutro" } as const;

/** Notificaciones que le corresponden al perfil actual. */
export function useMisNotificaciones() {
  const { role } = useRole();
  const q = useNotificaciones();
  const lista = (q.data ?? [])
    .filter((n) => !n.enlace || canAccess(role, n.enlace))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  return { ...q, lista, sinLeer: lista.filter((n) => !n.leida && !n.archivada).length };
}

export function useCambiarNotificaciones() {
  return useAccion(
    (a: { ids: string[] | "todas"; cambios: Partial<Pick<Notificacion, "leida" | "archivada">> }) =>
      actualizarNotificaciones(a.ids, a.cambios),
    ["notificaciones"],
  );
}

export function FilaNotificacion({
  n,
  compacta,
  onAbrir,
}: {
  n: Notificacion;
  compacta?: boolean;
  onAbrir?: () => void;
}) {
  const Icono = ICONO_CATEGORIA[n.categoria];
  return (
    <button
      type="button"
      onClick={onAbrir}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-primary/[0.05]",
        !n.leida && "bg-primary/[0.04]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
          n.prioridad === "Alta"
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/10 text-primary",
        )}
      >
        <Icono className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cn("truncate text-sm", n.leida ? "font-medium" : "font-bold")}>
            {n.titulo}
          </span>
          {!n.leida && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Sin leer" />
          )}
        </span>
        <span className={cn("block text-xs text-muted-foreground", compacta && "truncate")}>
          {n.detalle}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground/80">
          {n.categoria} · {haceCuanto(n.fecha)}
        </span>
      </span>
    </button>
  );
}

/** Campana de la barra superior. */
export function Campana() {
  const { lista, sinLeer } = useMisNotificaciones();
  const cambiar = useCambiarNotificaciones();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const recientes = lista.filter((n) => !n.archivada).slice(0, 6);
  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={sinLeer ? `Notificaciones: ${sinLeer} sin leer` : "Notificaciones"}
          className="relative grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-foreground/80 transition hover:text-primary"
        >
          <Bell className="h-4 w-4" />
          {sinLeer > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {sinLeer > 9 ? "9+" : sinLeer}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-bold">
            Notificaciones{" "}
            {sinLeer > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                {sinLeer} sin leer
              </span>
            )}
          </p>
          {sinLeer > 0 && (
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() =>
                cambiar.mutate({
                  ids: lista.filter((n) => !n.leida).map((n) => n.id),
                  cambios: { leida: true },
                })
              }
            >
              Marcar leídas
            </button>
          )}
        </div>
        <div className="max-h-[380px] space-y-0.5 overflow-y-auto p-2">
          {recientes.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No tenés notificaciones.
            </p>
          ) : (
            recientes.map((n) => (
              <FilaNotificacion
                key={n.id}
                n={n}
                compacta
                onAbrir={() => {
                  if (!n.leida) cambiar.mutate({ ids: [n.id], cambios: { leida: true } });
                  setAbierto(false);
                  if (n.enlace) void navigate({ to: n.enlace });
                }}
              />
            ))
          )}
        </div>
        <div className="border-t border-border p-2">
          <Link
            to="/admin/notificaciones"
            onClick={() => setAbierto(false)}
            className="block rounded-xl px-3 py-2 text-center text-xs font-semibold text-primary hover:bg-primary/[0.05]"
          >
            Ver todas las notificaciones
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
