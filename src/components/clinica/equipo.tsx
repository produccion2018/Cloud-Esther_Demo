import { Loader2, MailPlus, RefreshCw, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { MensajeError } from "@/components/clinica/marco";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ROLES_CLINICA,
  cambiarPersonaEquipo,
  invitarAlEquipo,
  reenviarInvitacion,
  verEquipo,
  type EquipoClinica,
  type PersonaEquipo,
  type RolClinica,
} from "@/lib/clinica/api";

/* Ubicación: src/components/clinica/equipo.tsx
   EQUIPO de la clínica (solo el Administrador): invitar personas con un rol (dentro del límite
   del plan), cambiar el rol, desactivar (le corta el acceso al instante) y reenviar invitaciones. */

const CAMPO = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

const ESTADO: Record<PersonaEquipo["estado"], { texto: string; clase: string }> = {
  activa: { texto: "Activa", clase: "bg-success/15 text-success" },
  invitada: { texto: "Invitada (falta su contraseña)", clase: "bg-amber-500/15 text-amber-700" },
  desactivada: { texto: "Desactivada", clase: "bg-muted text-muted-foreground" },
};

const fecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "Nunca";

export function EquipoClinicaPanel({ slug }: { slug: string }) {
  const [equipo, setEquipo] = useState<EquipoClinica | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [invitar, setInvitar] = useState(false);

  const cargar = useCallback(() => {
    setError(null);
    verEquipo(slug)
      .then(setEquipo)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo cargar el equipo."));
  }, [slug]);
  useEffect(cargar, [cargar]);

  const cambiar = async (p: PersonaEquipo, cambios: { rol?: RolClinica; activo?: boolean }, ok: string) => {
    setOcupado(p.id);
    try {
      setEquipo(await cambiarPersonaEquipo(slug, p.id, cambios));
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setOcupado(null);
    }
  };

  const reenviar = async (p: PersonaEquipo) => {
    setOcupado(p.id);
    try {
      await reenviarInvitacion(slug, p.id);
      toast.success(`Le reenviamos la invitación a ${p.email}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo reenviar.");
    } finally {
      setOcupado(null);
    }
  };

  if (error) return <MensajeError>{error}</MensajeError>;
  if (!equipo) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando el equipo…
      </p>
    );
  }

  const lleno = equipo.limite !== null && equipo.usados >= equipo.limite;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <div>
          <h2 className="font-bold">Equipo de la clínica</h2>
          <p className="text-sm text-muted-foreground">
            {equipo.limite === null
              ? `${equipo.usados} personas con acceso (tu plan no tiene límite).`
              : `${equipo.usados} de ${equipo.limite} personas que permite tu plan.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={cargar}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Actualizar
          </Button>
          <Button size="sm" onClick={() => setInvitar(true)} disabled={lleno} title={lleno ? "Llegaste al límite de tu plan" : undefined}>
            <UserPlus className="mr-1.5 h-4 w-4" /> Invitar persona
          </Button>
        </div>
      </div>
      {lleno && (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          Llegaste al límite de tu plan. Para sumar a alguien, desactivá a otra persona o pasate a un plan mayor.
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Persona</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Último ingreso</th>
              <th className="px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {equipo.personas.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3">
                  <p className="font-medium">
                    {p.nombre} {p.soyYo && <span className="text-xs text-muted-foreground">(vos)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    aria-label={`Rol de ${p.nombre}`}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={p.rol}
                    disabled={p.soyYo || ocupado === p.id || p.estado === "desactivada"}
                    onChange={(e) =>
                      void cambiar(p, { rol: e.target.value as RolClinica }, `Rol de ${p.nombre} actualizado.`)
                    }
                  >
                    {ROLES_CLINICA.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`border-0 ${ESTADO[p.estado].clase}`}>
                    {ESTADO[p.estado].texto}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{fecha(p.ultimoIngreso)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {p.estado === "invitada" && (
                      <Button variant="outline" size="sm" disabled={ocupado === p.id} onClick={() => void reenviar(p)}>
                        <MailPlus className="mr-1.5 h-4 w-4" /> Reenviar
                      </Button>
                    )}
                    {!p.soyYo &&
                      (p.estado === "desactivada" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={ocupado === p.id}
                          onClick={() => void cambiar(p, { activo: true }, `${p.nombre} vuelve a tener acceso.`)}
                        >
                          Reactivar
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          disabled={ocupado === p.id}
                          onClick={() => {
                            if (window.confirm(`¿Desactivar a ${p.nombre}? Pierde el acceso en este mismo momento.`)) {
                              void cambiar(p, { activo: false }, `${p.nombre} ya no tiene acceso.`);
                            }
                          }}
                        >
                          Desactivar
                        </Button>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DialogoInvitar
        slug={slug}
        abierto={invitar}
        onCerrar={() => setInvitar(false)}
        onListo={(e) => {
          setEquipo(e);
          setInvitar(false);
        }}
      />
    </div>
  );
}

function DialogoInvitar({
  slug,
  abierto,
  onCerrar,
  onListo,
}: {
  slug: string;
  abierto: boolean;
  onCerrar: () => void;
  onListo: (e: EquipoClinica) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<RolClinica>("secretaria");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (nombre.trim().length < 2) return setError("Escribí el nombre.");
    if (!email.trim()) return setError("Escribí el correo.");
    setError(null);
    setCargando(true);
    try {
      const equipo = await invitarAlEquipo(slug, { nombre: nombre.trim(), email: email.trim(), rol });
      toast.success(`Invitación enviada a ${email.trim()}.`);
      setNombre("");
      setEmail("");
      setRol("secretaria");
      onListo(equipo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo invitar.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar a una persona</DialogTitle>
          <DialogDescription>Le llega un correo para elegir su contraseña (vence en 72 horas).</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={enviar} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="inv-nombre">Nombre y apellido</Label>
            <Input id="inv-nombre" value={nombre} maxLength={160} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-email">Correo</Label>
            <Input id="inv-email" type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-rol">Rol</Label>
            <select id="inv-rol" className={CAMPO} value={rol} onChange={(e) => setRol(e.target.value as RolClinica)}>
              {ROLES_CLINICA.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre} — {r.detalle}
                </option>
              ))}
            </select>
          </div>
          {error && <MensajeError>{error}</MensajeError>}
          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar invitación
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
