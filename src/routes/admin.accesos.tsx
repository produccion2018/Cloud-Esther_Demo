import { createFileRoute } from "@tanstack/react-router";
import { Copy, KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Cargando, Seccion } from "@/components/admin/bits";
import { RestrictedView } from "@/components/admin/restricted";
import {
  PERMISOS,
  PERMISOS_DEL_ROL,
  ROLES,
  ROLES_ASIGNABLES,
  accesoTotal,
  canAccess,
  roleDescription,
  roleLabel,
  useRole,
  type AdminRole,
} from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actualizarAdmin, invitarAdmin } from "@/lib/admin/api";
import { useAccion, useEquipo } from "@/lib/admin/consultas";
import { haceCuanto } from "@/lib/admin/formato";
import { useSesionAdmin } from "@/lib/admin/sesion";
import type { AdminUser, Permiso } from "@/lib/admin/tipos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/accesos")({
  head: () => ({
    meta: [
      { title: "Equipo y accesos — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccessPage,
});

const SELECT =
  "h-9 rounded-lg border border-input bg-card px-2 text-xs font-semibold outline-none focus:border-primary/50 disabled:opacity-60";

function AccessPage() {
  const { role } = useRole();
  const sesion = useSesionAdmin();
  const { data: equipo, isLoading } = useEquipo();
  const [invitar, setInvitar] = useState(false);
  const [editando, setEditando] = useState<AdminUser | null>(null);
  const cambiar = useAccion(
    (a: { id: string; c: Parameters<typeof actualizarAdmin>[1] }) => actualizarAdmin(a.id, a.c),
    ["equipo"],
    "Acceso actualizado",
  );
  if (!canAccess(role, "/admin/accesos")) return <RestrictedView />;

  return (
    <AdminShell
      title="Equipo y accesos"
      description="Quién puede entrar al panel interno y qué puede usar cada persona. Los permisos se eligen persona por persona."
      actions={
        <Button onClick={() => setInvitar(true)}>
          <UserPlus className="mr-1.5 h-4 w-4" /> Dar acceso
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {ROLES.map((r) => (
          <div
            key={r}
            className="rounded-[22px] border border-primary/20 bg-gradient-to-br from-card to-primary/[0.06] p-4"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-primary/75">
              {roleLabel[r]}
            </p>
            <p className="mt-1 text-[28px] font-extrabold leading-tight text-primary">
              {(equipo ?? []).filter((a) => a.rol === r && a.activo).length}
            </p>
            <p className="text-xs leading-snug text-muted-foreground">{roleDescription[r]}</p>
          </div>
        ))}
      </div>

      <Seccion
        titulo="Personas con acceso"
        descripcion="Elegí los permisos de cada persona, cambiá su perfil o quitá el acceso. El Dueño no se puede desactivar."
        sinPadding
      >
        {isLoading ? (
          <Cargando />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-primary/[0.035] text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-5 py-2.5">Persona</th>
                  <th className="px-3 py-2.5">Perfil</th>
                  <th className="px-3 py-2.5">Permisos</th>
                  <th className="px-3 py-2.5">Último ingreso</th>
                  <th className="px-5 py-2.5 text-right">Acceso</th>
                </tr>
              </thead>
              <tbody>
                {(equipo ?? []).map((a) => {
                  const yo = a.id === sesion?.usuario.id;
                  return (
                    <tr
                      key={a.id}
                      className={cn("border-t border-border/60", !a.activo && "opacity-55")}
                    >
                      <td className="px-5 py-3">
                        <p className="font-semibold">
                          {a.nombre}{" "}
                          {yo && (
                            <span className="text-xs font-normal text-muted-foreground">(vos)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          className={SELECT}
                          value={a.rol}
                          disabled={yo || a.rol === "owner" || cambiar.isPending}
                          onChange={(e) =>
                            cambiar.mutate({ id: a.id, c: { rol: e.target.value as AdminRole } })
                          }
                        >
                          {(a.rol === "owner" ? ROLES : ROLES_ASIGNABLES).map((r) => (
                            <option key={r} value={r}>
                              {roleLabel[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        {accesoTotal(a.rol) ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                            <ShieldCheck className="h-3.5 w-3.5" /> Todo
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={cambiar.isPending}
                            onClick={() => setEditando(a)}
                          >
                            <KeyRound className="mr-1 h-3.5 w-3.5" />
                            {(a.permisos ?? PERMISOS_DEL_ROL[a.rol]).length} permisos
                          </Button>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {haceCuanto(a.ultimoAcceso)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {!yo && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={a.activo ? "text-destructive hover:text-destructive" : ""}
                            disabled={a.rol === "owner" || cambiar.isPending}
                            onClick={() => cambiar.mutate({ id: a.id, c: { activo: !a.activo } })}
                          >
                            {a.activo ? "Quitar acceso" : "Reactivar"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>

      <Seccion
        titulo="Cómo funcionan los permisos"
        descripcion="El menú de cada persona muestra solo lo que tiene permitido. El servidor también lo controla."
      >
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>
            <b className="text-foreground">Dueño y Socio</b> tienen todo, siempre.
          </li>
          <li>
            A cada persona le tildás lo que puede usar (por ejemplo: una asistente para Demos y Atención,
            otra para Nómina y Atención). El perfil solo elige las casillas iniciales.
          </li>
          <li>
            Si le quitás un permiso a alguien, lo pierde <b className="text-foreground">al instante</b>.
            Cada cambio queda registrado en la actividad del equipo.
          </li>
          <li>
            <b className="text-foreground">Equipo y accesos</b>, <b className="text-foreground">Planes y precios</b>,
            cambiar <b className="text-foreground">Países</b> y la configuración del demo son siempre solo del Dueño y el
            Socio.
          </li>
        </ul>
      </Seccion>

      {editando && (
        <DialogoPermisos
          persona={editando}
          guardando={cambiar.isPending}
          onGuardar={(permisos) =>
            cambiar.mutate({ id: editando.id, c: { permisos } }, { onSuccess: () => setEditando(null) })
          }
          onCerrar={() => setEditando(null)}
        />
      )}
      <DialogoInvitar abierto={invitar} onCerrar={() => setInvitar(false)} />
    </AdminShell>
  );
}

function DialogoInvitar({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<AdminRole>("customer-care");
  const [elegidos, setElegidos] = useState<Permiso[]>(PERMISOS_DEL_ROL["customer-care"]);
  const [error, setError] = useState<string | null>(null);
  const [clave, setClave] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const invitar = useAccion(invitarAdmin, ["equipo"], (d) => `Acceso creado para ${d.nombre}`);

  const cerrar = () => {
    setNombre("");
    setEmail("");
    setRol("customer-care");
    setElegidos(PERMISOS_DEL_ROL["customer-care"]);
    setError(null);
    setClave(null);
    setEnviado(false);
    onCerrar();
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return setError("Escribí el nombre.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Escribí un correo válido.");
    setError(null);
    invitar.mutate(
      { nombre, email, rol, ...(accesoTotal(rol) ? {} : { permisos: elegidos }) },
      {
        onSuccess: (r) => {
          setClave(r.clavePrueba ?? null);
          setEnviado(true);
        },
      },
    );
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && cerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dar acceso al panel</DialogTitle>
          <DialogDescription>
            La persona recibe un correo para crear su contraseña. Elegí el perfil según su trabajo.
          </DialogDescription>
        </DialogHeader>
        {enviado && !clave ? (
          <div className="space-y-3 text-sm">
            <p className="rounded-xl bg-success/10 px-3 py-2 font-semibold text-success">
              Acceso creado. Se envió el correo de invitación.
            </p>
            <p className="text-muted-foreground">
              La persona elige su propia contraseña con el enlace del correo (vale 72 horas y se usa
              una sola vez). Mientras no haya dominio propio, el correo te llega a vos: reenviáselo.
            </p>
            <DialogFooter>
              <Button onClick={cerrar}>Listo</Button>
            </DialogFooter>
          </div>
        ) : clave ? (
          <div className="space-y-3 text-sm">
            <p className="rounded-xl bg-success/10 px-3 py-2 font-semibold text-success">
              Acceso creado.
            </p>
            <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] p-3 text-xs">
              <p className="font-semibold text-primary">Sin backend conectado (prueba)</p>
              <p className="mt-1 text-muted-foreground">
                Todavía no se envían correos. Contraseña temporal para probar el ingreso:
              </p>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(clave)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1 font-mono font-semibold ring-1 ring-border"
              >
                {clave} <Copy className="h-3 w-3" />
              </button>
            </div>
            <DialogFooter>
              <Button onClick={cerrar}>Listo</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="inombre">Nombre y apellido</Label>
              <Input id="inombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iemail">Correo</Label>
              <Input
                id="iemail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@cloudesther.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <div className="grid gap-2">
                {ROLES_ASIGNABLES.map((r) => (
                  <label
                    key={r}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition",
                      rol === r
                        ? "border-primary bg-primary/[0.05]"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="rol"
                      checked={rol === r}
                      onChange={() => {
                        setRol(r);
                        setElegidos(PERMISOS_DEL_ROL[r]);
                      }}
                      className="mt-1 accent-[var(--primary)]"
                    />
                    <span>
                      <span className="block font-semibold">{roleLabel[r]}</span>
                      <span className="block text-xs text-muted-foreground">
                        {roleDescription[r]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {!accesoTotal(rol) && (
              <div className="space-y-2">
                <Label>Permisos</Label>
                <CasillasPermisos elegidos={elegidos} onCambiar={setElegidos} />
              </div>
            )}
            {error && (
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cerrar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={invitar.isPending}>
                Dar acceso
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Casillas de permisos (se usan al invitar y al editar a una persona). */
function CasillasPermisos({
  elegidos,
  onCambiar,
}: {
  elegidos: Permiso[];
  onCambiar: (p: Permiso[]) => void;
}) {
  const alternar = (p: Permiso) =>
    onCambiar(elegidos.includes(p) ? elegidos.filter((x) => x !== p) : [...elegidos, p]);
  return (
    <div className="grid max-h-[46vh] gap-1.5 overflow-y-auto pr-1">
      {PERMISOS.map((p) => (
        <label
          key={p.id}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border p-2.5 text-sm transition",
            elegidos.includes(p.id) ? "border-primary bg-primary/[0.05]" : "border-border hover:border-primary/40",
          )}
        >
          <input
            type="checkbox"
            checked={elegidos.includes(p.id)}
            onChange={() => alternar(p.id)}
            className="mt-0.5 size-4 accent-[var(--primary)]"
          />
          <span>
            <span className="block font-semibold">{p.nombre}</span>
            <span className="block text-xs text-muted-foreground">{p.detalle}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function DialogoPermisos({
  persona,
  guardando,
  onGuardar,
  onCerrar,
}: {
  persona: AdminUser;
  guardando: boolean;
  onGuardar: (p: Permiso[]) => void;
  onCerrar: () => void;
}) {
  const [elegidos, setElegidos] = useState<Permiso[]>(persona.permisos ?? PERMISOS_DEL_ROL[persona.rol]);
  return (
    <Dialog open onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permisos de {persona.nombre}</DialogTitle>
          <DialogDescription>
            Tildá lo que puede usar en el panel. Se aplica al instante y queda registrado.
          </DialogDescription>
        </DialogHeader>
        <CasillasPermisos elegidos={elegidos} onCambiar={setElegidos} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="button" disabled={guardando} onClick={() => onGuardar(elegidos)}>
            Guardar permisos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
