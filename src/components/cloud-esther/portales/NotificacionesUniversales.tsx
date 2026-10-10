import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  FileText,
  FlaskConical,
  KeyRound,
  ListChecks,
  MessageCircle,
  Stethoscope,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useLeidas } from "./preferencias";

/* Ubicación: src/components/cloud-esther/portales/NotificacionesUniversales.tsx
   Centro de notificaciones único de los portales (paciente, profesional y administrativo).
   Reemplaza los módulos de «avisos» sueltos: turnos, tratamientos, estudios, documentos, pagos,
   autorizaciones, pacientes, tareas y mensajes llegan al mismo lugar, con filtro por categoría.
   Cada portal arma la lista con sus datos; acá solo se muestra y se marca como leída.
   TODO backend: notificaciones push (PWA) y por mail con las mismas categorías. */

export type CategoriaNotif =
  | "Turnos"
  | "Tratamientos"
  | "Estudios"
  | "Documentos"
  | "Pagos"
  | "Autorizaciones"
  | "Pacientes"
  | "Tareas"
  | "Mensajes"
  | "Avisos";

export type NotifUniversal = {
  id: string;
  categoria: CategoriaNotif;
  titulo: string;
  detalle?: string | undefined;
  fecha?: string | undefined; // ISO
  urgente?: boolean | undefined;
  onAbrir?: (() => void) | undefined;
};

const ICONO: Record<CategoriaNotif, LucideIcon> = {
  Turnos: CalendarDays,
  Tratamientos: Stethoscope,
  Estudios: FlaskConical,
  Documentos: FileText,
  Pagos: Wallet,
  Autorizaciones: KeyRound,
  Pacientes: UserRound,
  Tareas: ListChecks,
  Mensajes: MessageCircle,
  Avisos: ClipboardList,
};

function haceCuanto(iso?: string) {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 0) {
    const h = Math.round(-min / 60);
    return h < 24 ? `en ${Math.max(1, h)} h` : `en ${Math.round(h / 24)} d`;
  }
  if (min < 60) return min < 1 ? "recién" : `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
}

export function NotificacionesUniversales({
  items,
  clave,
}: {
  items: NotifUniversal[];
  /** Identifica a quién pertenecen las leídas (ej.: `paciente:12`). */
  clave: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState<CategoriaNotif | "Todas">("Todas");
  const { leidas, marcar } = useLeidas(clave);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const sinLeer = items.filter((i) => !leidas.includes(i.id));
  const categorias = [...new Set(items.map((i) => i.categoria))];
  const visibles = items
    .filter((i) => filtro === "Todas" || i.categoria === filtro)
    .sort(
      (a, b) =>
        Number(leidas.includes(a.id)) - Number(leidas.includes(b.id)) ||
        Number(!!b.urgente) - Number(!!a.urgente),
    );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={`Notificaciones${sinLeer.length ? ` (${sinLeer.length} sin leer)` : ""}`}
        aria-expanded={abierto}
        className="btn-icono-portal"
      >
        {sinLeer.length ? <BellRing className="size-[18px]" /> : <Bell className="size-[18px]" />}
        {sinLeer.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-br from-[#f43f5e] to-[#d946ef] px-1 text-[10px] font-bold text-white shadow-[0_6px_14px_-6px_rgba(225,29,72,0.9)] ring-2 ring-background">
            {sinLeer.length > 9 ? "9+" : sinLeer.length}
          </span>
        )}
      </button>

      {abierto && (
        <div className="fixed inset-x-3 top-16 z-[70] flex max-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden rounded-3xl border border-primary/15 bg-card shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[400px] sm:max-h-[560px]">
          <div className="bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 px-4 pb-3 pt-4 text-white">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold">Notificaciones</p>
                <p className="text-[11px] text-white/80">
                  {sinLeer.length ? `${sinLeer.length} sin leer` : "Estás al día"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {sinLeer.length > 0 && (
                  <button
                    type="button"
                    onClick={() => marcar(items.map((i) => i.id))}
                    className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/25"
                  >
                    <CheckCheck className="size-3.5" /> Marcar todo
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Cerrar"
                  onClick={() => setAbierto(false)}
                  className="grid size-8 place-items-center rounded-full hover:bg-white/15"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            {categorias.length > 1 && (
              <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
                {(["Todas", ...categorias] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFiltro(c)}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                      filtro === c
                        ? "bg-white text-primary"
                        : "bg-white/15 text-white hover:bg-white/25"
                    }`}
                  >
                    {c}
                    {c !== "Todas" && (
                      <span className="ml-1 opacity-70">
                        {items.filter((i) => i.categoria === c).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <ul className="flex-1 divide-y divide-border/60 overflow-y-auto">
            {visibles.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                No hay notificaciones.
              </li>
            ) : (
              visibles.map((n) => {
                const Icono = ICONO[n.categoria];
                const leida = leidas.includes(n.id);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        marcar([n.id]);
                        if (n.onAbrir) {
                          n.onAbrir();
                          setAbierto(false);
                        }
                      }}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-primary/[0.04] ${
                        leida ? "opacity-70" : ""
                      }`}
                    >
                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                          n.urgente ? "bg-rose-100 text-rose-600" : "bg-primary/10 text-primary"
                        }`}
                      >
                        <Icono className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{n.titulo}</span>
                          {!leida && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                        </span>
                        {n.detalle && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {n.detalle}
                          </span>
                        )}
                        <span className="mt-1 block text-[10.5px] font-semibold uppercase tracking-wide text-primary/70">
                          {n.categoria}
                          {n.fecha ? ` · ${haceCuanto(n.fecha)}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
