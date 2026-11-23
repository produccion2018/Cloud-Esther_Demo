import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellRing,
  Building2,
  CreditCard,
  Handshake,
  LifeBuoy,
  Mail,
  MonitorSmartphone,
  RefreshCw,
  Send,
  Server,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { canAccess, useRole } from "./role";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  CON_BACKEND,
  actualizarNotificaciones,
  eliminarNotificaciones,
  guardarPreferencias,
  obtenerPreferencias,
  probarNotificaciones,
  quitarPush,
  registrarPush,
} from "@/lib/admin/api";
import {
  activarPushEnEsteDispositivo,
  desactivarPushLocal,
  pushDeEsteDispositivo,
  pushSoportado,
} from "@/lib/pwa";
import { useAccion, useNotificaciones } from "@/lib/admin/consultas";
import { haceCuanto } from "@/lib/admin/formato";
import type {
  CanalesNotificacion,
  CategoriaNotificacion,
  Notificacion,
  PreferenciasNotificaciones,
} from "@/lib/admin/tipos-empresa";
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

/** Eliminar (una o varias). Solo el Dueño; desaparecen para todo el equipo. */
export function useEliminarNotificaciones() {
  return useAccion(
    (ids: string[]) => eliminarNotificaciones(ids),
    ["notificaciones"],
    (ids) =>
      ids.length === 1 ? "Notificación eliminada" : `${ids.length} notificaciones eliminadas`,
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

/* ───────────── PREFERENCIAS: qué te llega y por dónde ───────────── */

const DETALLE_CATEGORIA: Record<CategoriaNotificacion, string> = {
  Clínicas: "Altas, bajas y cambios de las clínicas",
  Suscripciones: "Renovaciones, cancelaciones y cambios de plan",
  Pagos: "Cobros, pagos rechazados y reembolsos",
  Comercial: "Demos, contrataciones y pedidos de llamada",
  Soporte: "Tickets e incidencias de las clínicas",
  Seguridad: "Accesos, accesos de soporte y alertas",
  Sistema: "Avisos del sistema y del equipo",
};
const CANALES: { id: keyof CanalesNotificacion; nombre: string; icono: LucideIcon }[] = [
  { id: "panel", nombre: "Panel", icono: Bell },
  { id: "correo", nombre: "Correo", icono: Mail },
  { id: "push", nombre: "Push", icono: MonitorSmartphone },
];

export function PreferenciasNotificacionesDialogo({
  abierto,
  onCerrar,
}: {
  abierto: boolean;
  onCerrar: () => void;
}) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["preferenciasNotif"],
    queryFn: obtenerPreferencias,
    enabled: abierto,
  });
  const [prefs, setPrefs] = useState<PreferenciasNotificaciones | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [enEste, setEnEste] = useState<boolean | null>(null);
  const [ocupadoPush, setOcupadoPush] = useState(false);
  const [probando, setProbando] = useState(false);

  useEffect(() => {
    if (data) setPrefs(structuredClone(data.preferencias));
  }, [data]);
  useEffect(() => {
    if (!abierto) return;
    void pushDeEsteDispositivo().then((s) => setEnEste(!!s));
  }, [abierto]);

  const cambiar = (c: CategoriaNotificacion, canal: keyof CanalesNotificacion, v: boolean) =>
    setPrefs((p) =>
      p ? { ...p, categorias: { ...p.categorias, [c]: { ...p.categorias[c], [canal]: v } } } : p,
    );
  const todos = (canal: keyof CanalesNotificacion, v: boolean) =>
    setPrefs((p) =>
      p
        ? {
            ...p,
            categorias: Object.fromEntries(
              Object.entries(p.categorias).map(([c, x]) => [c, { ...x, [canal]: v }]),
            ) as PreferenciasNotificaciones["categorias"],
          }
        : p,
    );

  const guardar = async () => {
    if (!prefs) return;
    setGuardando(true);
    try {
      await guardarPreferencias(prefs);
      void qc.invalidateQueries({ queryKey: ["preferenciasNotif"] });
      void qc.invalidateQueries({ queryKey: ["notificaciones"] });
      toast.success("Preferencias guardadas");
      onCerrar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const activarPush = async () => {
    if (!data?.push.clavePublica) return;
    setOcupadoPush(true);
    try {
      const sub = await activarPushEnEsteDispositivo(data.push.clavePublica);
      await registrarPush(sub);
      setEnEste(true);
      void qc.invalidateQueries({ queryKey: ["preferenciasNotif"] });
      toast.success("Listo: este dispositivo va a recibir notificaciones");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo activar.");
    } finally {
      setOcupadoPush(false);
    }
  };
  const desactivarPush = async () => {
    setOcupadoPush(true);
    try {
      const endpoint = await desactivarPushLocal();
      if (endpoint) await quitarPush(endpoint);
      setEnEste(false);
      void qc.invalidateQueries({ queryKey: ["preferenciasNotif"] });
      toast.success("Este dispositivo ya no recibe notificaciones");
    } finally {
      setOcupadoPush(false);
    }
  };
  const probar = async () => {
    setProbando(true);
    try {
      const r = await probarNotificaciones();
      toast.success(
        `Prueba enviada: ${r.correo ? "correo ✓" : "correo ✗ (revisá Resend)"} · push a ${r.push} ${r.push === 1 ? "dispositivo" : "dispositivos"}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar la prueba.");
    } finally {
      setProbando(false);
    }
  };

  const push = data?.push;
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Qué te llega y por dónde</DialogTitle>
          <DialogDescription>
            Elegí por categoría si querés verla en el panel, recibirla por correo o como
            notificación push en el celular o la compu. Es solo para vos.
          </DialogDescription>
        </DialogHeader>
        {!prefs ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <div className="space-y-5">
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="bg-primary/[0.035] text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="px-4 py-2.5">Categoría</th>
                    {CANALES.map((c) => {
                      const todosOn = Object.values(prefs.categorias).every((x) => x[c.id]);
                      return (
                        <th key={c.id} className="px-2 py-2.5 text-center">
                          <button
                            type="button"
                            title={
                              todosOn ? `Apagar ${c.nombre} en todo` : `Prender ${c.nombre} en todo`
                            }
                            className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 hover:bg-primary/10 hover:text-primary"
                            onClick={() => todos(c.id, !todosOn)}
                          >
                            <c.icono className="h-3.5 w-3.5" /> {c.nombre}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(prefs.categorias) as CategoriaNotificacion[]).map((cat) => {
                    const Icono = ICONO_CATEGORIA[cat];
                    return (
                      <tr key={cat} className="border-t border-border/60">
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2 font-semibold">
                            <Icono className="h-4 w-4 text-primary" /> {cat}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {DETALLE_CATEGORIA[cat]}
                          </span>
                        </td>
                        {CANALES.map((c) => (
                          <td key={c.id} className="px-2 py-2.5 text-center">
                            <Switch
                              checked={prefs.categorias[cat][c.id]}
                              onCheckedChange={(v) => cambiar(cat, c.id, v)}
                              aria-label={`${cat} por ${c.nombre}`}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-border p-4 text-sm">
              <Switch
                checked={prefs.soloImportantes}
                onCheckedChange={(v) => setPrefs({ ...prefs, soloImportantes: v })}
                className="mt-0.5"
              />
              <span>
                <b>Por correo y push, solo lo importante</b>
                <span className="block text-xs text-muted-foreground">
                  Solo te llegan afuera del panel los avisos de prioridad Alta. En el panel ves todo
                  lo que elegiste.
                </span>
              </span>
            </label>

            <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
              <p className="flex items-center gap-2 text-sm font-bold">
                <BellRing className="h-4 w-4 text-primary" /> Notificaciones push en este
                dispositivo
              </p>
              {!CON_BACKEND || !push?.disponible ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Todavía no están activadas en el servidor (faltan las claves VAPID).
                </p>
              ) : !pushSoportado() ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Este navegador no las permite. En iPhone o iPad, primero instalá el panel como app
                  (Compartir › Agregar a inicio) y abrilo desde ahí.
                </p>
              ) : (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {enEste
                      ? "Activadas en este dispositivo."
                      : "No están activadas en este dispositivo."}{" "}
                    Tenés {push.dispositivos}{" "}
                    {push.dispositivos === 1 ? "dispositivo" : "dispositivos"} en total.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    variant={enEste ? "outline" : "default"}
                    disabled={ocupadoPush || enEste === null}
                    onClick={() => void (enEste ? desactivarPush() : activarPush())}
                  >
                    {enEste ? "Desactivar en este dispositivo" : "Activar en este dispositivo"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            disabled={!CON_BACKEND || probando}
            onClick={() => void probar()}
          >
            <Send className="mr-1.5 h-4 w-4" /> Enviarme una prueba
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button disabled={!prefs || guardando} onClick={() => void guardar()}>
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
