import { createFileRoute } from "@tanstack/react-router";
import { CalendarOff, FileText, Pencil, Plus, Trash2, UserCheck, Users } from "lucide-react";
import { useState } from "react";

import { Cargando, KpiCard, Seccion, Vacio } from "@/components/admin/bits";
import {
  Campo,
  DialogoFormulario,
  INPUT,
  Pestanas,
  Pildora,
  Tabla,
  confirmar,
} from "@/components/admin/formularios";
import { RestrictedView } from "@/components/admin/restricted";
import { canAccess, permisos, useRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { nuevoIdLocal } from "@/lib/admin/api";
import { useBorrarDe, useColeccion, useGuardarEn } from "@/lib/admin/consultas";
import { diasHasta, fecha, hoyISO, importe } from "@/lib/admin/formato";
import type { Asistencia, Ausencia, DocumentoInterno, Empleado } from "@/lib/admin/tipos-empresa";

export const Route = createFileRoute("/admin/personal")({
  head: () => ({
    meta: [
      { title: "Personal — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PersonalPage,
});

type Vista = "empleados" | "asistencia" | "ausencias" | "documentos";

function PersonalPage() {
  const { role } = useRole();
  const [vista, setVista] = useState<Vista>("empleados");
  const { data: empleados } = useColeccion("empleados");
  const { data: ausencias } = useColeccion("ausencias");
  if (!canAccess(role, "/admin/personal")) return <RestrictedView />;
  return (
    <AdminShell
      title="Personal"
      description="El equipo interno de Cloud Esther (no las clínicas): legajos, asistencia, vacaciones y licencias, y la documentación de cada persona."
    >
      <Pestanas
        valor={vista}
        onCambiar={setVista}
        opciones={[
          {
            id: "empleados",
            label: "Empleados",
            cantidad: (empleados ?? []).filter((e) => e.estado !== "Baja").length,
          },
          { id: "asistencia", label: "Asistencia" },
          {
            id: "ausencias",
            label: "Vacaciones y licencias",
            cantidad: (ausencias ?? []).filter((a) => a.estado === "Solicitada").length,
          },
          { id: "documentos", label: "Documentación" },
        ]}
      />
      {vista === "empleados" ? (
        <Empleados />
      ) : vista === "asistencia" ? (
        <Asistencias />
      ) : vista === "ausencias" ? (
        <Ausencias />
      ) : (
        <Documentos />
      )}
    </AdminShell>
  );
}

/** Nombre del empleado por id. */
function useNombres() {
  const { data } = useColeccion("empleados");
  const lista = data ?? [];
  return {
    lista,
    nombre: (id: string | null) =>
      id ? (lista.find((e) => e.id === id)?.nombre ?? "—") : "General",
  };
}

function SelectEmpleado({
  valor,
  onCambiar,
  conGeneral,
}: {
  valor: string;
  onCambiar: (v: string) => void;
  conGeneral?: boolean;
}) {
  const { lista } = useNombres();
  return (
    <select
      className={INPUT}
      value={valor}
      onChange={(e) => onCambiar(e.target.value)}
      required={!conGeneral}
    >
      <option value="">
        {conGeneral ? "General (no es de una persona)" : "Elegí una persona"}
      </option>
      {lista
        .filter((e) => e.estado !== "Baja")
        .map((e) => (
          <option key={e.id} value={e.id}>
            {e.nombre}
          </option>
        ))}
    </select>
  );
}

/* ───────────── Empleados ───────────── */

const EMPLEADO_VACIO: Empleado = {
  id: "",
  nombre: "",
  documento: "",
  cargo: "",
  area: "Desarrollo",
  ingreso: hoyISO(),
  contratacion: "Relación de dependencia",
  sueldoBase: 0,
  moneda: "ARS",
  jornadaHoras: 40,
  horario: "Lun a Vie 9 a 18",
  estado: "Activo",
  email: "",
  telefono: "",
};

function Empleados() {
  const { role } = useRole();
  const verSueldos = permisos.verSueldos(role);
  const { data, isLoading } = useColeccion("empleados");
  const [editando, setEditando] = useState<Empleado | null>(null);
  const [verBajas, setVerBajas] = useState(false);
  if (isLoading) return <Cargando />;
  const lista = data ?? [];
  const activos = lista.filter((e) => e.estado === "Activo");
  const filas = lista.filter((e) => verBajas || e.estado !== "Baja");
  const masaSalarial = activos
    .filter((e) => e.moneda === "ARS")
    .reduce((s, e) => s + e.sueldoBase, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard
          accent
          label="Activos"
          value={String(activos.length)}
          hint="Trabajando hoy"
          icon={<Users className="h-4 w-4" />}
        />
        <KpiCard
          label="De licencia"
          value={String(lista.filter((e) => e.estado === "Licencia").length)}
          hint="Vuelven después"
          icon={<CalendarOff className="h-4 w-4" />}
          tono="warning"
        />
        <KpiCard
          label="Horas semanales"
          value={String(activos.reduce((s, e) => s + e.jornadaHoras, 0))}
          hint="Suma del equipo activo"
          icon={<UserCheck className="h-4 w-4" />}
        />
        <KpiCard
          label="Sueldos base (ARS)"
          value={verSueldos ? importe(masaSalarial) : "Reservado"}
          hint={verSueldos ? "Por mes, sin cargas" : "Solo Dueño y Socio"}
          icon={<FileText className="h-4 w-4" />}
        />
      </div>
      <Seccion
        titulo="Equipo interno"
        descripcion="Tocá el lápiz para editar el legajo. Dar de baja no borra el historial de la persona."
        sinPadding
        acciones={
          <>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={verBajas}
                onChange={(e) => setVerBajas(e.target.checked)}
              />{" "}
              Ver bajas
            </label>
            <Button
              size="sm"
              onClick={() => setEditando({ ...EMPLEADO_VACIO, id: nuevoIdLocal("emp") })}
            >
              <Plus className="mr-1 h-4 w-4" /> Agregar persona
            </Button>
          </>
        }
      >
        {filas.length === 0 ? (
          <div className="p-5">
            <Vacio
              titulo="Todavía no cargaste personas"
              texto="Agregá al equipo interno para llevar asistencia, licencias y nómina."
            />
          </div>
        ) : (
          <Tabla
            columnas={[
              "Persona",
              "Cargo y área",
              "Contratación",
              "Jornada",
              "Sueldo base",
              "Estado",
              "",
            ]}
          >
            {filas.map((e) => (
              <tr key={e.id} className="border-t border-border/60">
                <td className="py-3 pl-5 pr-3">
                  <p className="font-semibold">{e.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.email || "Sin email"} · desde {fecha(e.ingreso)}
                  </p>
                </td>
                <td className="px-3 py-3 text-xs">
                  {e.cargo}
                  <span className="block text-muted-foreground">{e.area}</span>
                </td>
                <td className="px-3 py-3 text-xs">{e.contratacion}</td>
                <td className="px-3 py-3 text-xs">
                  {e.jornadaHoras} h/sem
                  <span className="block text-muted-foreground">{e.horario}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums">
                  {verSueldos ? importe(e.sueldoBase, e.moneda) : "••••"}
                </td>
                <td className="px-3 py-3">
                  <Pildora
                    tono={
                      e.estado === "Activo" ? "ok" : e.estado === "Licencia" ? "alerta" : "neutro"
                    }
                  >
                    {e.estado}
                  </Pildora>
                </td>
                <td className="py-3 pl-3 pr-5 text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Editar ${e.nombre}`}
                    onClick={() => setEditando(e)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </Tabla>
        )}
      </Seccion>
      {editando && (
        <FormEmpleado
          key={editando.id}
          inicial={editando}
          nuevo={!lista.some((e) => e.id === editando.id)}
          verSueldos={verSueldos}
          onCerrar={() => setEditando(null)}
        />
      )}
    </>
  );
}

function FormEmpleado({
  inicial,
  nuevo,
  verSueldos,
  onCerrar,
}: {
  inicial: Empleado;
  nuevo: boolean;
  verSueldos: boolean;
  onCerrar: () => void;
}) {
  const [e, setE] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const guardar = useGuardarEn("empleados", nuevo ? "Persona agregada" : "Legajo actualizado");
  const set = <K extends keyof Empleado>(k: K, v: Empleado[K]) => setE((x) => ({ ...x, [k]: v }));
  return (
    <DialogoFormulario
      abierto
      ancho="sm:max-w-2xl"
      titulo={nuevo ? "Agregar persona al equipo" : `Legajo de ${inicial.nombre}`}
      descripcion="Datos laborales del equipo interno. El sueldo solo lo ven el Dueño y el Socio."
      onCerrar={onCerrar}
      guardando={guardar.isPending}
      error={error}
      onGuardar={() => {
        if (!e.nombre.trim() || !e.cargo.trim()) return setError("Completá el nombre y el cargo.");
        guardar.mutate(
          { item: e, accion: `${nuevo ? "Alta" : "Edición"} de legajo: ${e.nombre}` },
          { onSuccess: onCerrar },
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Nombre y apellido">
          <input
            className={INPUT}
            value={e.nombre}
            onChange={(x) => set("nombre", x.target.value)}
          />
        </Campo>
        <Campo label="Documento">
          <input
            className={INPUT}
            value={e.documento}
            onChange={(x) => set("documento", x.target.value)}
          />
        </Campo>
        <Campo label="Cargo">
          <input
            className={INPUT}
            value={e.cargo}
            onChange={(x) => set("cargo", x.target.value)}
            placeholder="Ej.: Soporte a clínicas"
          />
        </Campo>
        <Campo label="Área">
          <select
            className={INPUT}
            value={e.area}
            onChange={(x) => set("area", x.target.value as Empleado["area"])}
          >
            {(
              ["Dirección", "Desarrollo", "Soporte", "Comercial", "Administración", "Otra"] as const
            ).map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Email">
          <input
            className={INPUT}
            type="email"
            value={e.email}
            onChange={(x) => set("email", x.target.value)}
          />
        </Campo>
        <Campo label="Teléfono">
          <input
            className={INPUT}
            value={e.telefono}
            onChange={(x) => set("telefono", x.target.value)}
          />
        </Campo>
        <Campo label="Fecha de ingreso">
          <input
            className={INPUT}
            type="date"
            value={e.ingreso}
            onChange={(x) => set("ingreso", x.target.value)}
          />
        </Campo>
        <Campo label="Tipo de contratación">
          <select
            className={INPUT}
            value={e.contratacion}
            onChange={(x) => set("contratacion", x.target.value as Empleado["contratacion"])}
          >
            {(
              ["Relación de dependencia", "Monotributo / factura", "Freelance", "Pasantía"] as const
            ).map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Horas por semana">
          <input
            className={INPUT}
            type="number"
            min={1}
            max={60}
            value={e.jornadaHoras}
            onChange={(x) => set("jornadaHoras", Number(x.target.value))}
          />
        </Campo>
        <Campo label="Horario habitual" ayuda="Texto libre, ej.: «Lun a Vie 9 a 18».">
          <input
            className={INPUT}
            value={e.horario}
            onChange={(x) => set("horario", x.target.value)}
          />
        </Campo>
        {verSueldos && (
          <>
            <Campo label="Sueldo base mensual">
              <input
                className={INPUT}
                type="number"
                min={0}
                value={e.sueldoBase}
                onChange={(x) => set("sueldoBase", Number(x.target.value))}
              />
            </Campo>
            <Campo label="Moneda">
              <select
                className={INPUT}
                value={e.moneda}
                onChange={(x) => set("moneda", x.target.value as Empleado["moneda"])}
              >
                {(["ARS", "USD", "UYU", "CLP"] as const).map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Campo>
          </>
        )}
        <Campo label="Estado">
          <select
            className={INPUT}
            value={e.estado}
            onChange={(x) => set("estado", x.target.value as Empleado["estado"])}
          >
            {(["Activo", "Licencia", "Baja"] as const).map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Campo>
      </div>
    </DialogoFormulario>
  );
}

/* ───────────── Asistencia ───────────── */

const TONO_ASISTENCIA = {
  Presente: "ok",
  "Llegada tarde": "alerta",
  Ausente: "peligro",
  "Ausente justificado": "neutro",
} as const;

function Asistencias() {
  const { nombre } = useNombres();
  const { data, isLoading } = useColeccion("asistencias");
  const borrar = useBorrarDe("asistencias", "Registro eliminado");
  const [editando, setEditando] = useState<Asistencia | null>(null);
  const [persona, setPersona] = useState("");
  if (isLoading) return <Cargando />;
  const lista = (data ?? [])
    .filter((a) => !persona || a.empleadoId === persona)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const delMes = (data ?? []).filter((a) => a.fecha.slice(0, 7) === hoyISO().slice(0, 7));
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard
          accent
          label="Registros del mes"
          value={String(delMes.length)}
          icon={<UserCheck className="h-4 w-4" />}
        />
        <KpiCard
          label="Llegadas tarde"
          value={String(delMes.filter((a) => a.tipo === "Llegada tarde").length)}
          hint="Este mes"
          tono="warning"
        />
        <KpiCard
          label="Ausencias"
          value={String(delMes.filter((a) => a.tipo.startsWith("Ausente")).length)}
          hint="Este mes"
          tono="destructive"
        />
        <KpiCard
          label="Horas extra"
          value={String(delMes.reduce((s, a) => s + a.horasExtra, 0))}
          hint="Este mes"
        />
      </div>
      <Seccion
        titulo="Asistencia diaria"
        descripcion="Registrá entrada, salida y horas extra. Las horas extra se pueden sumar después en la liquidación."
        sinPadding
        acciones={
          <>
            <div className="w-48">
              <SelectEmpleado valor={persona} onCambiar={setPersona} conGeneral />
            </div>
            <Button
              size="sm"
              onClick={() =>
                setEditando({
                  id: nuevoIdLocal("as"),
                  empleadoId: "",
                  fecha: hoyISO(),
                  entrada: "09:00",
                  salida: "",
                  horasExtra: 0,
                  tipo: "Presente",
                  observaciones: "",
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" /> Registrar
            </Button>
          </>
        }
      >
        {lista.length === 0 ? (
          <div className="p-5">
            <Vacio titulo="Sin registros de asistencia" />
          </div>
        ) : (
          <Tabla
            columnas={[
              "Fecha",
              "Persona",
              "Entrada",
              "Salida",
              "Horas extra",
              "Tipo",
              "Observaciones",
              "",
            ]}
          >
            {lista.map((a) => (
              <tr key={a.id} className="border-t border-border/60">
                <td className="py-3 pl-5 pr-3 text-xs">{fecha(a.fecha)}</td>
                <td className="px-3 py-3 font-semibold">{nombre(a.empleadoId)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums">
                  {a.entrada || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums">
                  {a.salida || "—"}
                </td>
                <td className="px-3 py-3 text-xs">{a.horasExtra || "—"}</td>
                <td className="px-3 py-3">
                  <Pildora tono={TONO_ASISTENCIA[a.tipo]}>{a.tipo}</Pildora>
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground">
                  {a.observaciones || "—"}
                </td>
                <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Editar"
                    onClick={() => setEditando(a)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Eliminar"
                    onClick={() =>
                      confirmar("¿Eliminar este registro de asistencia?") &&
                      borrar.mutate({ id: a.id })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </Tabla>
        )}
      </Seccion>
      {editando && (
        <FormAsistencia key={editando.id} inicial={editando} onCerrar={() => setEditando(null)} />
      )}
    </>
  );
}

function FormAsistencia({ inicial, onCerrar }: { inicial: Asistencia; onCerrar: () => void }) {
  const [a, setA] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const guardar = useGuardarEn("asistencias", "Asistencia guardada");
  const set = <K extends keyof Asistencia>(k: K, v: Asistencia[K]) =>
    setA((x) => ({ ...x, [k]: v }));
  return (
    <DialogoFormulario
      abierto
      titulo="Registro de asistencia"
      onCerrar={onCerrar}
      guardando={guardar.isPending}
      error={error}
      onGuardar={() => {
        if (!a.empleadoId) return setError("Elegí la persona.");
        guardar.mutate({ item: a }, { onSuccess: onCerrar });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Persona" className="sm:col-span-2">
          <SelectEmpleado valor={a.empleadoId} onCambiar={(v) => set("empleadoId", v)} />
        </Campo>
        <Campo label="Fecha">
          <input
            className={INPUT}
            type="date"
            value={a.fecha}
            onChange={(x) => set("fecha", x.target.value)}
          />
        </Campo>
        <Campo label="Tipo">
          <select
            className={INPUT}
            value={a.tipo}
            onChange={(x) => set("tipo", x.target.value as Asistencia["tipo"])}
          >
            {(Object.keys(TONO_ASISTENCIA) as Asistencia["tipo"][]).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Entrada">
          <input
            className={INPUT}
            type="time"
            value={a.entrada}
            onChange={(x) => set("entrada", x.target.value)}
          />
        </Campo>
        <Campo label="Salida" ayuda="Dejalo vacío si todavía no salió.">
          <input
            className={INPUT}
            type="time"
            value={a.salida}
            onChange={(x) => set("salida", x.target.value)}
          />
        </Campo>
        <Campo label="Horas extra">
          <input
            className={INPUT}
            type="number"
            min={0}
            step={0.5}
            value={a.horasExtra}
            onChange={(x) => set("horasExtra", Number(x.target.value))}
          />
        </Campo>
        <Campo label="Observaciones">
          <input
            className={INPUT}
            value={a.observaciones}
            onChange={(x) => set("observaciones", x.target.value)}
          />
        </Campo>
      </div>
    </DialogoFormulario>
  );
}

/* ───────────── Vacaciones y licencias ───────────── */

function Ausencias() {
  const { nombre } = useNombres();
  const { data, isLoading } = useColeccion("ausencias");
  const guardar = useGuardarEn("ausencias", "Solicitud actualizada");
  const [editando, setEditando] = useState<Ausencia | null>(null);
  if (isLoading) return <Cargando />;
  const lista = [...(data ?? [])].sort((a, b) => b.desde.localeCompare(a.desde));
  const dias = (x: Ausencia) =>
    Math.max(
      1,
      Math.round((new Date(x.hasta).getTime() - new Date(x.desde).getTime()) / 86_400_000) + 1,
    );
  return (
    <>
      <Seccion
        titulo="Vacaciones y licencias"
        descripcion="Cargá la solicitud y aprobala o rechazala. Las aprobadas quedan en el historial de la persona."
        sinPadding
        acciones={
          <Button
            size="sm"
            onClick={() =>
              setEditando({
                id: nuevoIdLocal("au"),
                empleadoId: "",
                tipo: "Vacaciones",
                desde: hoyISO(),
                hasta: hoyISO(),
                estado: "Solicitada",
                observaciones: "",
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Nueva solicitud
          </Button>
        }
      >
        {lista.length === 0 ? (
          <div className="p-5">
            <Vacio titulo="No hay vacaciones ni licencias cargadas" />
          </div>
        ) : (
          <Tabla columnas={["Persona", "Tipo", "Desde", "Hasta", "Días", "Estado", ""]}>
            {lista.map((a) => (
              <tr key={a.id} className="border-t border-border/60">
                <td className="py-3 pl-5 pr-3 font-semibold">
                  {nombre(a.empleadoId)}
                  {a.observaciones && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {a.observaciones}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-xs">{a.tipo}</td>
                <td className="px-3 py-3 text-xs">{fecha(a.desde)}</td>
                <td className="px-3 py-3 text-xs">{fecha(a.hasta)}</td>
                <td className="px-3 py-3 text-xs">{dias(a)}</td>
                <td className="px-3 py-3">
                  <Pildora
                    tono={
                      a.estado === "Aprobada"
                        ? "ok"
                        : a.estado === "Rechazada"
                          ? "peligro"
                          : "alerta"
                    }
                  >
                    {a.estado}
                  </Pildora>
                </td>
                <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                  {a.estado === "Solicitada" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mr-1 h-8"
                        onClick={() =>
                          guardar.mutate({
                            item: { ...a, estado: "Aprobada" },
                            accion: `Aprobó ${a.tipo.toLowerCase()} de ${nombre(a.empleadoId)}`,
                          })
                        }
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mr-1 h-8"
                        onClick={() => guardar.mutate({ item: { ...a, estado: "Rechazada" } })}
                      >
                        Rechazar
                      </Button>
                    </>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Editar"
                    onClick={() => setEditando(a)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </Tabla>
        )}
      </Seccion>
      {editando && (
        <FormAusencia key={editando.id} inicial={editando} onCerrar={() => setEditando(null)} />
      )}
    </>
  );
}

function FormAusencia({ inicial, onCerrar }: { inicial: Ausencia; onCerrar: () => void }) {
  const [a, setA] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const guardar = useGuardarEn("ausencias", "Solicitud guardada");
  const set = <K extends keyof Ausencia>(k: K, v: Ausencia[K]) => setA((x) => ({ ...x, [k]: v }));
  return (
    <DialogoFormulario
      abierto
      titulo="Vacaciones o licencia"
      onCerrar={onCerrar}
      guardando={guardar.isPending}
      error={error}
      onGuardar={() => {
        if (!a.empleadoId) return setError("Elegí la persona.");
        if (a.hasta < a.desde) return setError("La fecha «hasta» no puede ser anterior a «desde».");
        guardar.mutate({ item: a }, { onSuccess: onCerrar });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Persona" className="sm:col-span-2">
          <SelectEmpleado valor={a.empleadoId} onCambiar={(v) => set("empleadoId", v)} />
        </Campo>
        <Campo label="Tipo">
          <select
            className={INPUT}
            value={a.tipo}
            onChange={(x) => set("tipo", x.target.value as Ausencia["tipo"])}
          >
            {(
              [
                "Vacaciones",
                "Licencia médica",
                "Licencia por estudio",
                "Licencia personal",
                "Otra",
              ] as const
            ).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Estado">
          <select
            className={INPUT}
            value={a.estado}
            onChange={(x) => set("estado", x.target.value as Ausencia["estado"])}
          >
            {(["Solicitada", "Aprobada", "Rechazada"] as const).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Desde">
          <input
            className={INPUT}
            type="date"
            value={a.desde}
            onChange={(x) => set("desde", x.target.value)}
          />
        </Campo>
        <Campo label="Hasta">
          <input
            className={INPUT}
            type="date"
            value={a.hasta}
            onChange={(x) => set("hasta", x.target.value)}
          />
        </Campo>
        <Campo label="Observaciones" className="sm:col-span-2">
          <input
            className={INPUT}
            value={a.observaciones}
            onChange={(x) => set("observaciones", x.target.value)}
          />
        </Campo>
      </div>
    </DialogoFormulario>
  );
}

/* ───────────── Documentación ───────────── */

function Documentos() {
  const { nombre } = useNombres();
  const { data, isLoading } = useColeccion("documentos");
  const borrar = useBorrarDe("documentos", "Documento eliminado");
  const [editando, setEditando] = useState<DocumentoInterno | null>(null);
  if (isLoading) return <Cargando />;
  const lista = [...(data ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
  return (
    <>
      <Seccion
        titulo="Documentación interna"
        descripcion="Contratos, recibos, legajos y políticas. Avisamos cuando un documento está por vencer."
        sinPadding
        acciones={
          <Button
            size="sm"
            onClick={() =>
              setEditando({
                id: nuevoIdLocal("doc"),
                titulo: "",
                categoria: "Contrato laboral",
                empleadoId: null,
                fecha: hoyISO(),
                vence: null,
                archivo: "",
              })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Agregar documento
          </Button>
        }
      >
        <p className="border-b border-border/60 bg-warning/10 px-5 py-2 text-[11px] text-warning-foreground">
          La subida real de archivos se hace en el servidor (pendiente de backend). Por ahora se
          registra el nombre del archivo.
        </p>
        {lista.length === 0 ? (
          <div className="p-5">
            <Vacio titulo="Sin documentos" />
          </div>
        ) : (
          <Tabla columnas={["Documento", "Categoría", "Persona", "Fecha", "Vencimiento", ""]}>
            {lista.map((d) => {
              const dias = d.vence ? diasHasta(d.vence) : null;
              return (
                <tr key={d.id} className="border-t border-border/60">
                  <td className="py-3 pl-5 pr-3">
                    <p className="font-semibold">{d.titulo}</p>
                    <p className="text-xs text-muted-foreground">{d.archivo || "Sin archivo"}</p>
                  </td>
                  <td className="px-3 py-3 text-xs">{d.categoria}</td>
                  <td className="px-3 py-3 text-xs">{nombre(d.empleadoId)}</td>
                  <td className="px-3 py-3 text-xs">{fecha(d.fecha)}</td>
                  <td className="px-3 py-3">
                    {dias === null ? (
                      <span className="text-xs text-muted-foreground">No vence</span>
                    ) : (
                      <Pildora tono={dias < 0 ? "peligro" : dias <= 30 ? "alerta" : "ok"}>
                        {dias < 0
                          ? "Vencido"
                          : dias <= 30
                            ? `Vence en ${dias} días`
                            : fecha(d.vence)}
                      </Pildora>
                    )}
                  </td>
                  <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Editar"
                      onClick={() => setEditando(d)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Eliminar"
                      onClick={() =>
                        confirmar(`¿Eliminar «${d.titulo}»?`) &&
                        borrar.mutate({ id: d.id, accion: `Eliminó el documento «${d.titulo}»` })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </Tabla>
        )}
      </Seccion>
      {editando && (
        <FormDocumento key={editando.id} inicial={editando} onCerrar={() => setEditando(null)} />
      )}
    </>
  );
}

function FormDocumento({ inicial, onCerrar }: { inicial: DocumentoInterno; onCerrar: () => void }) {
  const [d, setD] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const guardar = useGuardarEn("documentos", "Documento guardado");
  const set = <K extends keyof DocumentoInterno>(k: K, v: DocumentoInterno[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  return (
    <DialogoFormulario
      abierto
      titulo="Documento interno"
      onCerrar={onCerrar}
      guardando={guardar.isPending}
      error={error}
      onGuardar={() => {
        if (!d.titulo.trim()) return setError("Poné un título.");
        guardar.mutate(
          { item: d, accion: `Guardó el documento «${d.titulo}»` },
          { onSuccess: onCerrar },
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Título" className="sm:col-span-2">
          <input
            className={INPUT}
            value={d.titulo}
            onChange={(x) => set("titulo", x.target.value)}
          />
        </Campo>
        <Campo label="Categoría">
          <select
            className={INPUT}
            value={d.categoria}
            onChange={(x) => set("categoria", x.target.value as DocumentoInterno["categoria"])}
          >
            {(
              [
                "Contrato laboral",
                "Recibo de sueldo",
                "Legajo",
                "Política interna",
                "Contrato comercial",
                "Otro",
              ] as const
            ).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Persona">
          <SelectEmpleado
            valor={d.empleadoId ?? ""}
            onCambiar={(v) => set("empleadoId", v || null)}
            conGeneral
          />
        </Campo>
        <Campo label="Fecha">
          <input
            className={INPUT}
            type="date"
            value={d.fecha}
            onChange={(x) => set("fecha", x.target.value)}
          />
        </Campo>
        <Campo label="Vence" ayuda="Dejalo vacío si no vence.">
          <input
            className={INPUT}
            type="date"
            value={d.vence ?? ""}
            onChange={(x) => set("vence", x.target.value || null)}
          />
        </Campo>
        <Campo
          label="Archivo"
          className="sm:col-span-2"
          ayuda="Nombre del archivo (la subida se habilita con el backend)."
        >
          <input
            className={INPUT}
            type="file"
            onChange={(x) => {
              const f = x.target.files?.[0];
              if (f) set("archivo", f.name);
            }}
          />
        </Campo>
      </div>
    </DialogoFormulario>
  );
}
