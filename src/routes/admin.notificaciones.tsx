import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Archive, ArchiveRestore, Check, CheckCheck } from "lucide-react";
import { useState } from "react";

import { Cargando, Seccion, Vacio } from "@/components/admin/bits";
import { Pestanas, Pildora } from "@/components/admin/formularios";
import {
  FilaNotificacion,
  TONO_PRIORIDAD,
  useCambiarNotificaciones,
  useMisNotificaciones,
} from "@/components/admin/notificaciones";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import type { CategoriaNotificacion, Notificacion } from "@/lib/admin/tipos-empresa";

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
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>("todas");
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
        sinLeer > 0 ? (
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
        ) : undefined
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
        <select
          className={SELECT}
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaNotificacion | "")}
          aria-label="Categoría"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          className={SELECT}
          value={prioridad}
          onChange={(e) => setPrioridad(e.target.value as Notificacion["prioridad"] | "")}
          aria-label="Prioridad"
        >
          <option value="">Todas las prioridades</option>
          <option>Alta</option>
          <option>Media</option>
          <option>Baja</option>
        </select>
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </AdminShell>
  );
}
