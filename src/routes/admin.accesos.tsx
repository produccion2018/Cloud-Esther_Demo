import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Minus, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Cargando, Seccion } from "@/components/admin/bits";
import { RestrictedView } from "@/components/admin/restricted";
import {
  ROLES,
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

/** Qué puede hacer cada perfil (lo mismo que aplica el menú). */
const MATRIZ: [string, string][] = [
  ["Resumen", "/admin"],
  ["Demos e interesados", "/admin/demos"],
  ["Clínicas clientes", "/admin/clinicas"],
  ["Pagos y cobranza", "/admin/pagos"],
  ["Planes y precios", "/admin/planes"],
  ["Consumo de IA", "/admin/ia"],
  ["Personal", "/admin/personal"],
  ["Nómina y pagos", "/admin/nomina"],
  ["Gastos y proveedores", "/admin/gastos"],
  ["Soporte técnico", "/admin/soporte"],
  ["Auditoría", "/admin/auditoria"],
  ["Reportes", "/admin/reportes"],
  ["Notificaciones", "/admin/notificaciones"],
  ["Mi perfil y contraseña", "/admin/cuenta"],
  ["Equipo y accesos", "/admin/accesos"],
];
const EXTRAS: [string, AdminRole[]][] = [
  ["Ver importes y facturación", ["owner"]],
  ["Editar precios y límites", ["owner"]],
  ["Seguimiento de demos", ["owner", "partner", "customer-care"]],
  ["Gestionar tickets", ["owner", "support", "customer-care"]],
  ["Ver sueldos y nómina", ["owner", "partner"]],
];

function AccessPage() {
  const { role } = useRole();
  const sesion = useSesionAdmin();
  const { data: equipo, isLoading } = useEquipo();
  const [invitar, setInvitar] = useState(false);
  const cambiar = useAccion(
    (a: { id: string; c: Parameters<typeof actualizarAdmin>[1] }) => actualizarAdmin(a.id, a.c),
    ["equipo"],
    "Acceso actualizado",
  );
  if (!canAccess(role, "/admin/accesos")) return <RestrictedView />;

  return (
    <AdminShell
      title="Equipo y accesos"
      description="Quién puede entrar al panel interno y con qué perfil: Dueño, Socio, Soporte técnico (técnico en sistemas / desarrollo) y Asistente / Secretaría."
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
        descripcion="Cambiá el perfil o quitá el acceso. El Dueño no se puede desactivar."
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
                          disabled={yo || cambiar.isPending}
                          onChange={(e) =>
                            cambiar.mutate({ id: a.id, c: { rol: e.target.value as AdminRole } })
                          }
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {roleLabel[r]}
                            </option>
                          ))}
                        </select>
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
        titulo="Qué ve cada perfil"
        descripcion="Esto define el menú y los permisos. El backend también lo valida."
        sinPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-primary/[0.035] text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-5 py-2.5">Sección o permiso</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-3 py-2.5 text-center">
                    {roleLabel[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ...MATRIZ.map(([l, ruta]) => [l, ROLES.filter((r) => canAccess(r, ruta))] as const),
                ...EXTRAS,
              ].map(([l, roles]) => (
                <tr key={l} className="border-t border-border/60">
                  <td className="px-5 py-2.5 font-medium">{l}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-3 py-2.5 text-center">
                      {roles.includes(r) ? (
                        <Check className="mx-auto h-4 w-4 text-success" aria-label="Sí" />
                      ) : (
                        <Minus
                          className="mx-auto h-4 w-4 text-muted-foreground/50"
                          aria-label="No"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      <DialogoInvitar abierto={invitar} onCerrar={() => setInvitar(false)} />
    </AdminShell>
  );
}

function DialogoInvitar({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<AdminRole>("customer-care");
  const [error, setError] = useState<string | null>(null);
  const [clave, setClave] = useState<string | null>(null);
  const invitar = useAccion(invitarAdmin, ["equipo"], (d) => `Acceso creado para ${d.nombre}`);

  const cerrar = () => {
    setNombre("");
    setEmail("");
    setRol("customer-care");
    setError(null);
    setClave(null);
    onCerrar();
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return setError("Escribí el nombre.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Escribí un correo válido.");
    setError(null);
    invitar.mutate({ nombre, email, rol }, { onSuccess: (r) => setClave(r.clavePrueba ?? null) });
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
        {clave ? (
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
                {ROLES.map((r) => (
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
                      onChange={() => setRol(r)}
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
