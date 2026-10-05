import { useState } from "react";
import {
  ArrowDownCircle,
  CalendarClock,
  ClipboardList,
  Coins,
  FileText,
  History,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Wallet,
} from "lucide-react";

import {
  SeccionPaciente,
  useRegistrosPacientes,
  useTodosLosRegistros,
} from "@/components/cloud-esther/PacienteSecciones";
import { setTareasStore, storeAgenda, type Turno } from "@/lib/cloud-esther/agenda-store";
import { useAuditoria } from "@/lib/cloud-esther/auditoria-store";
import type { TeamMember } from "@/lib/cloud-esther/equipo-profesional-data";
import { usePacientes, type Paciente } from "@/lib/cloud-esther/pacientes";
import { registrarEventoEquipo, storeEquipoPortal } from "@/lib/cloud-esther/portal-equipo-store";
import { storePresupuestos } from "@/lib/cloud-esther/presupuestos-store";
import { KpiPortal, PestanasPortal, TarjetaPortal } from "../PortalShell";

/* Ubicación: src/components/cloud-esther/portales/equipo/SeccionesAdministrativas.tsx
   Secciones propias del Portal administrativo (Plan 4): Caja del día, Pacientes (alta,
   búsqueda, ficha y documentación), Tareas con responsable y vencimiento, Liquidaciones y
   comisiones de profesionales y Auditoría de acciones administrativas. Cada una se muestra solo
   si el propietario dio el permiso correspondiente. Datos por empresa. */

const pesos = (n: number) => `$ ${Math.round(n).toLocaleString("es-AR")}`;
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const nombreDe = (m: TeamMember) => `${m.firstName} ${m.lastName}`.trim();
const INPUT =
  "h-11 w-full rounded-xl border border-primary/15 bg-card px-3 text-base outline-none focus:border-primary/45 focus:ring-4 focus:ring-primary/10 sm:h-10 sm:text-sm";

/* ───────────── Caja del día ───────────── */

export function CajaPortal() {
  const registros = useTodosLosRegistros();
  const { pacientes } = usePacientes();
  const [dia, setDia] = useState(hoyISO());
  const movs = pacientes.flatMap((p) =>
    (registros[p.id]?.cuenta ?? []).map((m) => ({ ...m, paciente: `${p.nombre} ${p.apellido}` })),
  );
  const delDia = movs.filter((m) => m.fecha === dia).sort((a, b) => b.id - a.id);
  const ingresos = delDia.filter((m) => m.tipo === "Pago");
  const total = ingresos.reduce((a, m) => a + m.monto, 0);
  const porMedio = [...new Set(ingresos.map((m) => m.medio || "Sin medio"))].map((medio) => ({
    medio,
    total: ingresos
      .filter((m) => (m.medio || "Sin medio") === medio)
      .reduce((a, m) => a + m.monto, 0),
  }));
  const mes = dia.slice(0, 7);
  const delMes = movs
    .filter((m) => m.tipo === "Pago" && m.fecha.startsWith(mes))
    .reduce((a, m) => a + m.monto, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-semibold">
          Día
          <input
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className={`${INPUT} mt-1 w-48`}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiPortal
          titulo="Ingresos del día"
          valor={pesos(total)}
          detalle={`${ingresos.length} cobros`}
          icon={ArrowDownCircle}
          tono="verde"
        />
        <KpiPortal
          titulo="Operaciones"
          valor={String(delDia.length)}
          detalle="cargos y pagos"
          icon={ReceiptText}
        />
        <KpiPortal titulo="Ingresos del mes" valor={pesos(delMes)} icon={Coins} tono="azul" />
        <KpiPortal
          titulo="Medios usados"
          valor={String(porMedio.length)}
          detalle={porMedio.map((x) => x.medio).join(", ") || "—"}
          icon={Wallet}
          tono="ambar"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <TarjetaPortal titulo="Operaciones del día" icon={ReceiptText}>
          {delDia.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hubo movimientos este día.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {delDia.map((m) => (
                <li key={`${m.paciente}-${m.id}`} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{m.paciente}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {m.concepto} · {m.tipo}
                      {m.medio ? ` · ${m.medio}` : ""}
                    </span>
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums ${m.tipo === "Pago" ? "text-emerald-600" : ""}`}
                  >
                    {pesos(m.monto)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TarjetaPortal>
        <TarjetaPortal titulo="Por medio de pago" icon={Wallet}>
          <ul className="space-y-2 text-sm">
            {porMedio.length === 0 && <li className="text-muted-foreground">Sin cobros.</li>}
            {porMedio.map((x) => (
              <li key={x.medio} className="flex justify-between gap-2">
                <span>{x.medio}</span>
                <b className="tabular-nums">{pesos(x.total)}</b>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">
            El arqueo y la facturación fiscal están en Facturación → Caja (si tenés permiso).
          </p>
        </TarjetaPortal>
      </div>
    </div>
  );
}

/* ───────────── Pacientes (alta, búsqueda, ficha y documentación) ───────────── */

const OBRAS = ["Particular", "OSDE", "Swiss Medical", "Galeno", "Medicus", "IOMA", "PAMI", "Otra"];

export function PacientesAdministracion({
  puedeCrear,
  puedeEditar,
  onToast,
  abrirInicial,
}: {
  puedeCrear: boolean;
  puedeEditar: boolean;
  onToast: (m: string) => void;
  abrirInicial?: string | null;
}) {
  const { pacientes, setPacientes } = usePacientes();
  const registros = useRegistrosPacientes();
  const [q, setQ] = useState("");
  const [alta, setAlta] = useState(false);
  const [actual, setActual] = useState<number | null>(
    () => pacientes.find((p) => `${p.nombre} ${p.apellido}` === abrirInicial)?.id ?? null,
  );
  const [pestana, setPestana] = useState<"ficha" | "documentos" | "turnos" | "cuenta">("ficha");
  const texto = q.trim().toLowerCase();
  const lista = pacientes.filter(
    (p) =>
      !texto ||
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(texto) ||
      p.documento.includes(texto.replace(/\D/g, "") || "~") ||
      p.telefono.replace(/\D/g, "").includes(texto.replace(/\D/g, "") || "~"),
  );
  const paciente = pacientes.find((p) => p.id === actual);

  if (paciente) {
    const r = registros.de(paciente.id);
    return (
      <div className="space-y-4">
        <TarjetaPortal
          titulo={`${paciente.nombre} ${paciente.apellido}`}
          detalle={`DNI ${paciente.documento} · ${paciente.obraSocial || "Particular"} · ${paciente.sucursal}`}
          icon={FileText}
          acciones={
            <button
              type="button"
              onClick={() => setActual(null)}
              className="btn-ce-outline !min-h-10"
            >
              Volver al listado
            </button>
          }
        >
          <PestanasPortal
            valor={pestana}
            onCambiar={setPestana}
            opciones={[
              { id: "ficha", label: "Ficha" },
              { id: "documentos", label: "Documentación", cantidad: r.documentos.length },
              { id: "turnos", label: "Turnos", cantidad: r.turnos.length },
              { id: "cuenta", label: "Cuenta corriente", cantidad: r.cuenta.length },
            ]}
          />
        </TarjetaPortal>
        <div className="rounded-3xl border border-primary/10 bg-card p-3 shadow-sm sm:p-5">
          {pestana === "ficha" ? (
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {(
                [
                  ["Teléfono", paciente.telefono],
                  ["Email", paciente.email],
                  ["Dirección", paciente.direccion],
                  ["Nacimiento", paciente.fechaNacimiento],
                  ["Obra social", paciente.obraSocial],
                  ["Afiliado", paciente.afiliado],
                  ["Sucursal", paciente.sucursal],
                  ["Estado", paciente.estado],
                ] as const
              ).map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-3 border-b border-border/50 py-1.5"
                >
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="truncate font-semibold">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <SeccionPaciente
              key={`${paciente.id}-${pestana}`}
              seccion={pestana}
              datos={r}
              cambiar={(clave, fn) =>
                puedeEditar
                  ? registros.cambiar(paciente.id, clave, fn)
                  : onToast("Tu usuario solo puede consultar")
              }
              onToast={onToast}
              contexto={{
                paciente: `${paciente.nombre} ${paciente.apellido}`,
                email: paciente.email,
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, DNI o teléfono"
            className={`${INPUT} pl-10`}
          />
        </label>
        {puedeCrear && (
          <button type="button" onClick={() => setAlta(true)} className="btn-ce !min-h-11">
            <UserPlus className="size-4" /> Alta de paciente
          </button>
        )}
      </div>
      {alta && (
        <AltaPaciente
          onCerrar={() => setAlta(false)}
          onGuardar={(p) => {
            const id = Math.max(0, ...pacientes.map((x) => x.id)) + 1;
            setPacientes((prev) => [{ ...p, id }, ...prev]);
            onToast(`Paciente ${p.nombre} ${p.apellido} dado de alta`);
            setAlta(false);
            setActual(id);
          }}
        />
      )}
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {lista.slice(0, 60).map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setActual(p.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-primary/10 bg-card p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-sm font-bold text-white">
                {p.nombre[0]}
                {p.apellido[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {p.nombre} {p.apellido}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  DNI {p.documento} · {p.telefono || "sin teléfono"}
                </span>
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${p.estado === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
              >
                {p.estado}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AltaPaciente({
  onCerrar,
  onGuardar,
}: {
  onCerrar: () => void;
  onGuardar: (p: Omit<Paciente, "id">) => void;
}) {
  const [f, setF] = useState({
    nombre: "",
    apellido: "",
    documento: "",
    fechaNacimiento: "",
    telefono: "",
    email: "",
    obraSocial: "Particular",
    sucursal: "Clínica Centro",
  });
  const [error, setError] = useState("");
  const campo = (k: keyof typeof f, label: string, type = "text") => (
    <label className="text-xs font-semibold">
      {label}
      <input
        type={type}
        value={f[k]}
        onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))}
        className={`${INPUT} mt-1`}
      />
    </label>
  );
  return (
    <TarjetaPortal
      titulo="Alta de paciente"
      detalle="Datos básicos: el resto se completa en la ficha"
      icon={UserPlus}
    >
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.nombre.trim() || !f.apellido.trim())
            return setError("Completá nombre y apellido.");
          if (!/^\d{6,10}$/.test(f.documento.replace(/\D/g, "")))
            return setError("El documento tiene que tener entre 6 y 10 dígitos.");
          onGuardar({
            nombre: f.nombre.trim(),
            apellido: f.apellido.trim(),
            documento: f.documento.replace(/\D/g, ""),
            fechaNacimiento: f.fechaNacimiento,
            genero: "",
            email: f.email.trim(),
            telefono: f.telefono.trim(),
            sucursal: f.sucursal,
            obraSocial: f.obraSocial === "Particular" ? "No aplica / particular" : f.obraSocial,
            afiliado: "",
            direccion: "",
            nota: "",
            estado: "Activo",
            foto: null,
          });
        }}
      >
        {campo("nombre", "Nombre")}
        {campo("apellido", "Apellido")}
        {campo("documento", "Documento")}
        {campo("fechaNacimiento", "Nacimiento", "date")}
        {campo("telefono", "Teléfono", "tel")}
        {campo("email", "Email", "email")}
        <label className="text-xs font-semibold">
          Obra social
          <select
            value={f.obraSocial}
            onChange={(e) => setF((x) => ({ ...x, obraSocial: e.target.value }))}
            className={`${INPUT} mt-1`}
          >
            {OBRAS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Sucursal
          <select
            value={f.sucursal}
            onChange={(e) => setF((x) => ({ ...x, sucursal: e.target.value }))}
            className={`${INPUT} mt-1`}
          >
            {["Clínica Centro", "Clínica Norte", "Clínica Sur"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        {error && <p className="text-xs text-destructive sm:col-span-2">{error}</p>}
        <div className="flex gap-2 sm:col-span-2">
          <button
            type="button"
            onClick={onCerrar}
            className="btn-ce-outline !min-h-11 flex-1 justify-center"
          >
            Cancelar
          </button>
          <button type="submit" className="btn-ce !min-h-11 flex-1 justify-center">
            Dar de alta
          </button>
        </div>
      </form>
    </TarjetaPortal>
  );
}

/* ───────────── Tareas con responsable y vencimiento ───────────── */

export function TareasAdministrativas({
  yo,
  miembros,
  puedeCrear,
  puedeEliminar,
  vista,
  onToast,
}: {
  yo: TeamMember;
  miembros: TeamMember[];
  puedeCrear: boolean;
  puedeEliminar: boolean;
  vista: boolean;
  onToast: (m: string) => void;
}) {
  const { tareas } = storeAgenda.usar();
  const [filtro, setFiltro] = useState<"pendientes" | "vencidas" | "mias" | "hechas">("pendientes");
  const [texto, setTexto] = useState("");
  const [responsable, setResponsable] = useState(nombreDe(yo));
  const [vence, setVence] = useState("");
  const hoy = hoyISO();
  const visibles = tareas
    .filter((t) =>
      filtro === "pendientes"
        ? !t.hecha
        : filtro === "vencidas"
          ? !t.hecha && !!t.vence && t.vence < hoy
          : filtro === "mias"
            ? !t.hecha && t.responsable === nombreDe(yo)
            : t.hecha,
    )
    .sort((a, b) => (a.vence ?? "9999").localeCompare(b.vence ?? "9999"));
  const contar = (f: typeof filtro) =>
    tareas.filter((t) =>
      f === "pendientes"
        ? !t.hecha
        : f === "vencidas"
          ? !t.hecha && !!t.vence && t.vence < hoy
          : f === "mias"
            ? !t.hecha && t.responsable === nombreDe(yo)
            : t.hecha,
    ).length;

  return (
    <div className="space-y-4">
      {puedeCrear && (
        <TarjetaPortal titulo="Nueva tarea" icon={Plus}>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_200px_160px_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              if (vista || !texto.trim()) return;
              setTareasStore((prev) => [
                {
                  id: Date.now(),
                  texto: texto.trim(),
                  categoria: "Administración",
                  paciente: "",
                  fecha: hoy,
                  hecha: false,
                  responsable,
                  ...(vence ? { vence } : {}),
                },
                ...prev,
              ]);
              registrarEventoEquipo(yo.id, "Creó una tarea", `${texto.trim()} → ${responsable}`);
              setTexto("");
              setVence("");
              onToast("Tarea creada");
            }}
          >
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Qué hay que hacer"
              className={INPUT}
            />
            <select
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              className={INPUT}
              aria-label="Responsable"
            >
              {miembros
                .filter((m) => m.status === "activo")
                .map((m) => (
                  <option key={m.id}>{nombreDe(m)}</option>
                ))}
            </select>
            <input
              type="date"
              value={vence}
              onChange={(e) => setVence(e.target.value)}
              className={INPUT}
              aria-label="Vence"
            />
            <button
              type="submit"
              disabled={!texto.trim()}
              className="btn-ce !min-h-11 justify-center"
            >
              <Plus className="size-4" /> Crear
            </button>
          </form>
        </TarjetaPortal>
      )}
      <PestanasPortal
        valor={filtro}
        onCambiar={setFiltro}
        opciones={[
          { id: "pendientes", label: "Pendientes", cantidad: contar("pendientes") },
          { id: "vencidas", label: "Vencidas", cantidad: contar("vencidas") },
          { id: "mias", label: "A mi cargo", cantidad: contar("mias") },
          { id: "hechas", label: "Hechas", cantidad: contar("hechas") },
        ]}
      />
      <TarjetaPortal icon={ClipboardList} titulo={`${visibles.length} tareas`}>
        {visibles.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay tareas en esta vista.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {visibles.map((t) => {
              const vencida = !t.hecha && !!t.vence && t.vence < hoy;
              return (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <button
                    type="button"
                    aria-label={t.hecha ? "Marcar pendiente" : "Marcar hecha"}
                    disabled={vista}
                    onClick={() =>
                      setTareasStore((prev) =>
                        prev.map((x) => (x.id === t.id ? { ...x, hecha: !x.hecha } : x)),
                      )
                    }
                    className={`grid size-8 shrink-0 place-items-center rounded-lg border ${t.hecha ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                  >
                    {t.hecha && "✓"}
                  </button>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm ${t.hecha ? "text-muted-foreground line-through" : "font-semibold"}`}
                    >
                      {t.texto}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {t.responsable ?? "Sin responsable"}
                      {t.paciente ? ` · ${t.paciente}` : ""}
                      {t.vence ? ` · vence ${t.vence.split("-").reverse().join("/")}` : ""}
                    </span>
                  </span>
                  {vencida && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10.5px] font-semibold text-rose-700">
                      Vencida
                    </span>
                  )}
                  {puedeEliminar && (
                    <button
                      type="button"
                      aria-label="Eliminar"
                      disabled={vista}
                      onClick={() => setTareasStore((prev) => prev.filter((x) => x.id !== t.id))}
                      className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </TarjetaPortal>
    </div>
  );
}

/* ───────────── Liquidaciones y comisiones ───────────── */

export function LiquidacionesPortal({
  miembros,
  turnos,
}: {
  miembros: TeamMember[];
  turnos: Turno[];
}) {
  const aranceles = storePresupuestos.usar().aranceles;
  const [mes, setMes] = useState(hoyISO().slice(0, 7));
  const precioDe = (tratamiento: string) =>
    aranceles.find((a) =>
      a.nombre.toLowerCase().includes(tratamiento.toLowerCase().split(" ")[0] ?? ""),
    )?.precio ?? 0;
  const filas = miembros
    .filter((m) => m.role === "odontologo")
    .map((m) => {
      const atendidos = turnos.filter(
        (t) => t.odontologo === nombreDe(m) && t.estado === "Atendida" && t.fecha.startsWith(mes),
      );
      const facturado = atendidos.reduce((a, t) => a + precioDe(t.tratamiento), 0);
      const pct =
        m.commissions?.find((c) => c.service === "Tratamientos")?.percentage ??
        m.commissions?.[0]?.percentage ??
        0;
      return {
        m,
        atendidos: atendidos.length,
        facturado,
        pct,
        comision: Math.round((facturado * pct) / 100),
      };
    });
  const total = filas.reduce((a, f) => a + f.comision, 0);
  return (
    <div className="space-y-4">
      <label className="text-xs font-semibold">
        Período
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className={`${INPUT} mt-1 w-48`}
        />
      </label>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiPortal titulo="Comisiones del período" valor={pesos(total)} icon={Coins} tono="verde" />
        <KpiPortal
          titulo="Prácticas atendidas"
          valor={String(filas.reduce((a, f) => a + f.atendidos, 0))}
          icon={CalendarClock}
        />
        <KpiPortal
          titulo="Profesionales"
          valor={String(filas.length)}
          icon={ReceiptText}
          tono="azul"
        />
      </div>
      <TarjetaPortal
        titulo="Liquidación por profesional"
        detalle="Prácticas atendidas × arancel × % de comisión"
        icon={Coins}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                <th className="py-2 pr-3">Profesional</th>
                <th className="px-3 py-2">Atendidos</th>
                <th className="px-3 py-2">Facturado</th>
                <th className="px-3 py-2">Comisión</th>
                <th className="py-2 pl-3 text-right">A liquidar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filas.map((f) => (
                <tr key={f.m.id}>
                  <td className="py-2.5 pr-3 font-semibold">{nombreDe(f.m)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{f.atendidos}</td>
                  <td className="px-3 py-2.5 tabular-nums">{pesos(f.facturado)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{f.pct} %</td>
                  <td className="py-2.5 pl-3 text-right font-bold tabular-nums">
                    {pesos(f.comision)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Cálculo de referencia con los aranceles de Presupuestos. Sueldos y recibos están en
          Recursos Humanos.
        </p>
      </TarjetaPortal>
    </div>
  );
}

/* ───────────── Auditoría ───────────── */

export function AuditoriaPortal({
  clinicId,
  miembros,
}: {
  clinicId: string | null;
  miembros: TeamMember[];
}) {
  const { eventos: eventosClinica } = useAuditoria(clinicId ?? "demo");
  const { eventos: eventosPortal } = storeEquipoPortal.usar();
  const [q, setQ] = useState("");
  const nombre = (id: string) => {
    const m = miembros.find((x) => x.id === id);
    return m ? nombreDe(m) : "Integrante";
  };
  const filas = [
    ...eventosPortal.map((e) => ({
      id: e.id,
      fecha: e.fecha,
      quien: nombre(e.miembroId),
      accion: e.accion,
      detalle: e.detalle,
      origen: "Portal del equipo",
    })),
    ...eventosClinica.map((e) => ({
      id: e.id,
      fecha: e.fecha,
      quien: e.usuario,
      accion: e.accion,
      detalle: e.modulo,
      origen: "Clínica",
    })),
  ]
    .filter(
      (f) => !q || `${f.quien} ${f.accion} ${f.detalle}`.toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 200);
  return (
    <TarjetaPortal
      titulo="Auditoría de acciones"
      detalle="Quién hizo qué y cuándo"
      icon={ShieldCheck}
    >
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar persona o acción"
          className={`${INPUT} pl-10`}
        />
      </label>
      {filas.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No hay acciones registradas.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border/60">
          {filas.map((f) => (
            <li key={`${f.origen}-${f.id}`} className="flex items-start gap-3 py-2.5">
              <History className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm">
                  <b>{f.quien}</b> · {f.accion}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {new Date(f.fecha).toLocaleString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {f.detalle} · {f.origen}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </TarjetaPortal>
  );
}
