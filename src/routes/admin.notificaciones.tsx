import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Archive, ArchiveRestore, Check, CheckCheck, Settings2, Trash2 } from "lucide-react";
import { useState } from "react";

import { Cargando, Seccion, Vacio } from "@/components/admin/bits";
import { Pestanas, Pildora, confirmar } from "@/components/admin/formularios";
import {
  FilaNotificacion,
  PreferenciasNotificacionesDialogo,
  TONO_PRIORIDAD,
  useCambiarNotificaciones,
  useEliminarNotificaciones,
  useMisNotificaciones,
} from "@/components/admin/notificaciones";
import { accesoTotal, useRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import type { CategoriaNotificacion, Notificacion } from "@/lib/admin/tipos-empresa";
import { Seleccion } from "@/components/ui/seleccion";

export const Route = createFileRoute("/admin/notificaciones")({
  head: () => ({
    meta: [
      { title: "Notificaciones — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NotificacionesPage,
});

const CATEGORIAS: CategoriaNotificacion[] = [
  "Clínicas",
  "Suscripciones",
  "Pagos",
  "Comercial",
  "Soporte",
  "Seguridad",
  "Sistema",
];
const SELECT =
  "h-9 rounded-xl border border-input bg-card px-3 text-xs font-semibold outline-none focus:border-primary/50";
type Estado = "sin-leer" | "todas" | "archivadas";

function NotificacionesPage() {
  const { lista, sinLeer, isLoading } = useMisNotificaciones();
  const cambiar = useCambiarNotificaciones();
  const eliminar = useEliminarNotificaciones();
  const { role } = useRole();
  const puedeEliminar = accesoTotal(role);
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>("todas");
  const [verPreferencias, setVerPreferencias] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaNotificacion | "">("");
  const [prioridad, setPrioridad] = useState<Notificacion["prioridad"] | "">("");
  const filas = lista.filter(
    (n) =>
      (estado === "archivadas" ? n.archivada : !n.archivada && (estado === "todas" || !n.leida)) &&
      (!categoria || n.categoria === categoria) &&
      (!prioridad || n.prioridad === prioridad),
  );
  return (
    <AdminShell
      title="Notificaciones"
      description="Avisos de clínicas, suscripciones, pagos, solicitudes comerciales, soporte, seguridad y sistema. Solo ves los de las secciones a las que tenés acceso."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setVerPreferencias(true)}>
            <Settings2 className="mr-1.5 h-4 w-4" /> Preferencias
          </Button>
          {sinLeer > 0 || (puedeEliminar && filas.length > 0) ? (
            <div className="flex flex-wrap gap-2">
              {sinLeer > 0 && (
                <Button
                  variant="outline"
                  onClick={() =>
                    cambiar.mutate({
                      ids: lista.filter((n) => !n.leida).map((n) => n.id),
                      cambios: { leida: true },
                    })
                  }
                >
                  <CheckCheck className="mr-1.5 h-4 w-4" /> Marcar todas como leídas
                </Button>
              )}
              {puedeEliminar && filas.length > 0 && (
                <Button
                  variant="destructive"
                  disabled={eliminar.isPending}
                  onClick={() => {
                    const ids = filas.map((n) => n.id);
                    if (
                      confirmar(
                        `¿Eliminar ${ids.length === 1 ? "la notificación" : `las ${ids.length} notificaciones`} que estás viendo?\n\nSe borran para todo el equipo y no se pueden recuperar.`,
                      )
                    )
                      eliminar.mutate(ids);
                  }}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Eliminar todas ({filas.length})
                </Button>
              )}
            </div>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <Pestanas
          valor={estado}
          onCambiar={setEstado}
          opciones={[
            { id: "todas", label: "Todas", cantidad: lista.filter((n) => !n.archivada).length },
            { id: "sin-leer", label: "Sin leer", cantidad: sinLeer },
            {
              id: "archivadas",
              label: "Archivadas",
              cantidad: lista.filter((n) => n.archivada).length,
            },
          ]}
        />
        <Seleccion
          className={SELECT}
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaNotificacion | "")}
          aria-label="Categoría"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Seleccion>
        <Seleccion
          className={SELECT}
          value={prioridad}
          onChange={(e) => setPrioridad(e.target.value as Notificacion["prioridad"] | "")}
          aria-label="Prioridad"
        >
          <option value="">Todas las prioridades</option>
          <option>Alta</option>
          <option>Media</option>
          <option>Baja</option>
        </Seleccion>
      </div>
      <Seccion
        titulo="Bandeja"
        descripcion="Tocá una notificación para abrir la sección relacionada (queda marcada como leída)."
      >
        {isLoading ? (
          <Cargando />
        ) : filas.length === 0 ? (
          <Vacio titulo="No hay notificaciones en este filtro" />
        ) : (
          <ul className="divide-y divide-border/60">
            {filas.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-2 py-1.5 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <FilaNotificacion
                    n={n}
                    onAbrir={() => {
                      if (!n.leida) cambiar.mutate({ ids: [n.id], cambios: { leida: true } });
                      if (n.enlace) void navigate({ to: n.enlace });
                    }}
                  />
                </div>
                <Pildora tono={TONO_PRIORIDAD[n.prioridad]}>{n.prioridad}</Pildora>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    title={n.leida ? "Marcar como no leída" : "Marcar como leída"}
                    aria-label={n.leida ? "Marcar como no leída" : "Marcar como leída"}
                    onClick={() => cambiar.mutate({ ids: [n.id], cambios: { leida: !n.leida } })}
                  >
                    <Check
                      className={n.leida ? "h-4 w-4 text-muted-foreground" : "h-4 w-4 text-primary"}
                    />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={n.archivada ? "Desarchivar" : "Archivar"}
                    aria-label={n.archivada ? "Desarchivar" : "Archivar"}
                    onClick={() =>
                      cambiar.mutate({
                        ids: [n.id],
                        cambios: { archivada: !n.archivada, leida: true },
                      })
                    }
                  >
                    {n.archivada ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </Button>
                  {puedeEliminar && (
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Eliminar"
                      aria-label="Eliminar"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={eliminar.isPending}
                      onClick={() => {
                        if (
                          confirmar(
                            `¿Eliminar «${n.titulo}»?\n\nSe borra para todo el equipo y no se puede recuperar.`,
                          )
                        )
                          eliminar.mutate([n.id]);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
      <PreferenciasNotificacionesDialogo
        abierto={verPreferencias}
        onCerrar={() => setVerPreferencias(false)}
      />
    </AdminShell>
  );
}
