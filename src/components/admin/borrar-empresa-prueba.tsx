import { useState } from "react";
import { FlaskConical, History, ShieldAlert, Trash2 } from "lucide-react";

import { Seccion } from "@/components/admin/bits";
import { accesoTotal, useRole } from "@/components/admin/role";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { borrarEmpresaPrueba } from "@/lib/admin/api";
import { useAccion, useBorradoPruebas } from "@/lib/admin/consultas";
import { clinicaProlija, fecha, haceCuanto } from "@/lib/admin/formato";
import type { Clinica } from "@/lib/admin/tipos";

/* Ubicación: src/components/admin/borrar-empresa-prueba.tsx
   BORRAR EMPRESAS DE PRUEBA (solo para la etapa de pruebas, antes de producción).
   - Solo lo ven el Dueño y el Socio.
   - Solo aparece si el SERVIDOR lo tiene prendido (ALLOW_TEST_PURGE=true en staging).
     En producción está apagado: el botón no existe y el servidor rechaza el pedido igual.
   - Para confirmar hay que escribir la DIRECCIÓN de esa clínica: así nunca se borra otra.
   - El servidor borra SOLO esa empresa (todas sus tablas) y deja el registro para siempre. */

const CLAVES = ["clinicas", "borrado-pruebas", "contrataciones"];

/** ¿Se puede usar? Dueño/Socio + servidor con el borrado de pruebas prendido. */
function useHabilitado() {
  const { role } = useRole();
  const { data } = useBorradoPruebas();
  return accesoTotal(role) && data?.habilitado === true;
}

/** Zona de peligro dentro del detalle de una clínica. */
export function ZonaBorrarPrueba({ clinica: c, onBorrada }: { clinica: Clinica; onBorrada: () => void }) {
  const habilitado = useHabilitado();
  const [abierta, setAbierta] = useState(false);
  if (!habilitado || !c.slug) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-destructive/25 bg-gradient-to-br from-destructive/[0.06] via-transparent to-transparent p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <FlaskConical className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Empresa de prueba</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Solo para la etapa de pruebas. Borra esta clínica y todos sus datos (equipo, pacientes,
            agenda, chat). Las demás empresas no se tocan. No se puede deshacer.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAbierta(true)}
            className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" /> Borrar empresa de prueba
          </Button>
        </div>
      </div>
      <DialogoBorrar
        clinica={c}
        abierta={abierta}
        onCerrar={() => setAbierta(false)}
        onBorrada={() => {
          setAbierta(false);
          onBorrada();
        }}
      />
    </div>
  );
}

function DialogoBorrar({
  clinica: c,
  abierta,
  onCerrar,
  onBorrada,
}: {
  clinica: Clinica;
  abierta: boolean;
  onCerrar: () => void;
  onBorrada: () => void;
}) {
  const [escrito, setEscrito] = useState("");
  const [motivo, setMotivo] = useState("");
  const borrar = useAccion(borrarEmpresaPrueba, CLAVES, `Se borró la empresa de prueba «${c.nombre}».`);
  const direccion = c.slug ?? "";
  const listo = direccion !== "" && escrito.trim().toLowerCase() === direccion.toLowerCase();
  const cerrar = () => {
    if (borrar.isPending) return;
    setEscrito("");
    setMotivo("");
    onCerrar();
  };
  return (
    <Dialog open={abierta} onOpenChange={(v) => !v && cerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <ShieldAlert className="size-4" />
            </span>
            Borrar «{c.nombre}»
          </DialogTitle>
          <DialogDescription>
            Se borra <b>solo esta empresa</b> y todo lo suyo. Ninguna otra clínica se toca. No se
            puede deshacer y queda en el registro con tu nombre.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!listo || borrar.isPending) return;
            borrar.mutate(
              { id: c.id, confirmacion: escrito.trim(), motivo: motivo.trim() },
              { onSuccess: onBorrada },
            );
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="borrar-direccion" className="text-xs font-medium text-muted-foreground">
              Para confirmar, escribí la dirección de la clínica:{" "}
              <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">{direccion}</code>
            </label>
            <Input
              id="borrar-direccion"
              value={escrito}
              onChange={(e) => setEscrito(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={direccion}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="borrar-motivo" className="text-xs font-medium text-muted-foreground">
              Motivo (opcional, queda en el registro)
            </label>
            <Textarea
              id="borrar-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value.slice(0, 300))}
              placeholder="Ej.: cuenta creada para probar el alta"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={cerrar} disabled={borrar.isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={!listo || borrar.isPending}>
              {borrar.isPending ? "Borrando…" : "Borrar definitivamente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Registro de empresas de prueba borradas (solo Dueño y Socio; se ve si está prendido o hay registro). */
export function RegistroEmpresasBorradas() {
  const { role } = useRole();
  const { data } = useBorradoPruebas();
  if (!accesoTotal(role) || !data) return null;
  if (!data.habilitado && data.registro.length === 0) return null;
  return (
    <Seccion
      titulo="Empresas de prueba borradas"
      descripcion={
        data.habilitado
          ? "Modo pruebas prendido en este servidor: podés borrar una empresa desde su detalle. Cada borrado queda acá para siempre."
          : "El borrado de pruebas está apagado en este servidor. Queda el registro de lo que se borró."
      }
      acciones={
        data.habilitado ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/12 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            <FlaskConical className="size-3.5" /> Modo pruebas
          </span>
        ) : undefined
      }
      sinPadding
    >
      {data.registro.length === 0 ? (
        <p className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground">
          <History className="size-4" /> Todavía no se borró ninguna empresa.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {data.registro.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
                <Trash2 className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{clinicaProlija(r.clinica)}</span>
                <span className="block text-xs text-muted-foreground">
                  {r.direccion} · {r.quien} · {fecha(r.fecha)} ({haceCuanto(r.fecha)})
                  {r.motivo ? ` · ${r.motivo}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}
