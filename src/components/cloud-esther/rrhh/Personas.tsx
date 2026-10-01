import { useRef, useState } from "react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  Download,
  FileText,
  GraduationCap,
  LayoutGrid,
  Mail,
  MessageCircle,
  Network,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Upload,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { storeEquipo, useEquipo, usuariosInternos } from "@/lib/cloud-esther/equipo-store";
import { useCloudEsther } from "@/lib/cloud-esther/data";
import { dentroDelLimite, MENSAJE_LIMITE } from "@/lib/cloud-esther/planes-config";
import {
  emptyMember,
  permsFor,
  type TeamMember,
  type TeamRole,
} from "@/lib/cloud-esther/equipo-profesional-data";
import { asegurarAcceso } from "@/lib/cloud-esther/portal-equipo-store";
import {
  COMPETENCIAS,
  DEPARTAMENTOS,
  antiguedad,
  auditar,
  diaISO,
  diasEntre,
  legajoDe,
  legajoIncompleto,
  nombreDe,
  saldoVacaciones,
  setRRHH,
  storeRRHH,
  type Departamento,
  type Legajo,
  type Modalidad,
} from "@/lib/cloud-esther/rrhh-store";
import { normalizarBusqueda } from "@/lib/utils";
import {
  ESQUEMAS,
  PAISES,
  contratoDe,
  formatoMoneda,
  paisDe,
  type EsquemaPago,
  type PaisId,
} from "@/lib/cloud-esther/nomina-paises";
import {
  Acciones,
  Avatar,
  BTN_ICONO,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  CHIP,
  Encabezado,
  Field,
  INPUT,
  Modal,
  Pill,
  ROL_LABEL,
  Sel,
  Vacio,
  ars,
  descargarCSV,
  fecha,
  titulo,
  type Ctx,
} from "./ui";

const ROLES: TeamRole[] = ["odontologo", "asistente", "secretaria", "administrador"];

export function Personas({ ctx }: { ctx: Ctx }) {
  const { miembros, ausencias } = useEquipo();
  const { legajos, documentos } = storeRRHH.usar();
  const [q, setQ] = useState("");
  const [rol, setRol] = useState<"" | TeamRole>("");
  const [suc, setSuc] = useState("");
  const [estado, setEstado] = useState<"activos" | "bajas">("activos");
  const [vista, setVista] = useState<"tarjetas" | "organigrama">("tarjetas");
  const [alta, setAlta] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  const conLegajo = miembros.map((m) => ({ m, l: legajoDe(m, legajos) }));
  const deBaja = (x: { m: TeamMember; l: Legajo }) => x.m.status === "inactivo" || !!x.l.baja;
  const lista = conLegajo
    .filter((x) => (estado === "bajas" ? deBaja(x) : !deBaja(x)))
    .filter((x) => ctx.sucursales.includes(x.l.sucursal) || !x.l.sucursal)
    .filter((x) => !rol || x.m.role === rol)
    .filter((x) => !suc || x.l.sucursal === suc)
    .filter(
      (x) =>
        !q ||
        normalizarBusqueda(`${nombreDe(x.m)} ${x.l.puesto} ${x.l.dni} ${x.m.email}`).includes(
          normalizarBusqueda(q),
        ),
    );

  const importar = async (f: File) => {
    const texto = await f.text();
    const filas = texto
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter((x) => x.trim());
    const [, ...datos] = filas;
    let n = 0;
    const nuevos: TeamMember[] = [];
    const nuevosLegajos: Legajo[] = [];
    for (const fila of datos) {
      const c = fila.split(/[;,]/).map((x) => x.replace(/^"|"$/g, "").trim());
      const [
        nombre = "",
        apellido = "",
        rolTxt = "",
        email = "",
        tel = "",
        puesto = "",
        ingreso = "",
        basico = "",
      ] = c;
      if (!nombre || !apellido) continue;
      const r = (ROLES.find((x) =>
        normalizarBusqueda(ROL_LABEL[x]).startsWith(normalizarBusqueda(rolTxt).slice(0, 4)),
      ) ?? "asistente") as TeamRole;
      const m: TeamMember = {
        ...emptyMember(),
        firstName: titulo(nombre),
        lastName: titulo(apellido),
        role: r,
        email: email.toLowerCase(),
        phone: tel,
        permissions: permsFor(r),
      };
      nuevos.push(m);
      const base = legajoDe(m, {});
      nuevosLegajos.push({
        ...base,
        numero: `L-${String(Object.keys(legajos).length + nuevos.length).padStart(4, "0")}`,
        puesto: puesto || base.puesto,
        ingreso: /^\d{4}-\d{2}-\d{2}$/.test(ingreso) ? ingreso : diaISO(),
        basico: Number(basico) || base.basico,
      });
      n++;
    }
    if (!n) return ctx.onToast("No encontré filas válidas. Usá la plantilla.");
    agregarAEquipo(nuevos);
    setRRHH("legajos", (p) => ({
      ...p,
      ...Object.fromEntries(nuevosLegajos.map((l) => [l.miembroId, l])),
    }));
    auditar(ctx.usuario, "Importación", `${n} personas importadas desde ${f.name}`);
    ctx.onToast(`${n} personas importadas y sumadas a Equipo`);
  };

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Users}
        titulo="Personas y legajos"
        descripcion="Son los mismos integrantes de Equipo: acá se completa su legajo, contrato y sueldo."
      >
        <button type="button" className={BTN_SECUNDARIO} onClick={() => archivo.current?.click()}>
          <Upload className="size-4" />
          Importar
        </button>
        <input
          ref={archivo}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          aria-label="Importar personas desde CSV"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importar(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() =>
            descargarCSV(`personal-${diaISO()}.csv`, [
              [
                "Legajo",
                "Nombre",
                "Apellido",
                "Rol",
                "Puesto",
                "Sucursal",
                "DNI",
                "CUIL",
                "Ingreso",
                "Modalidad",
                "Básico",
                "Email",
                "Teléfono",
              ],
              ...lista.map(({ m, l }) => [
                l.numero,
                m.firstName,
                m.lastName,
                ROL_LABEL[m.role],
                l.puesto,
                l.sucursal,
                l.dni,
                l.cuil,
                fecha(l.ingreso),
                l.modalidad,
                l.basico,
                m.email,
                m.phone,
              ]),
            ])
          }
        >
          <Download className="size-4" />
          Exportar
        </button>
        <button type="button" className={BTN_PRIMARIO} onClick={() => setAlta(true)}>
          <UserPlus className="size-4" />
          Alta de persona
        </button>
      </Encabezado>

      <div className="card-grad space-y-2.5 p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_190px_190px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, puesto, DNI o correo"
              className={`${INPUT} pl-9`}
            />
          </div>
          <Sel
            value={rol}
            onChange={setRol}
            etiqueta="Rol"
            opciones={[
              { value: "", label: "Todos los roles" },
              ...ROLES.map((r) => ({ value: r, label: ROL_LABEL[r] })),
            ]}
          />
          <Sel
            value={suc}
            onChange={setSuc}
            etiqueta="Sucursal"
            opciones={[
              { value: "", label: "Todas las sucursales" },
              ...ctx.sucursales.map((s) => ({ value: s, label: s })),
            ]}
          />
          <div className="flex gap-1 rounded-full bg-white/80 p-1 ring-1 ring-primary/10">
            <button
              type="button"
              aria-label="Ver tarjetas"
              className={CHIP(vista === "tarjetas")}
              onClick={() => setVista("tarjetas")}
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Ver organigrama"
              className={CHIP(vista === "organigrama")}
              onClick={() => setVista("organigrama")}
            >
              <Network className="size-3.5" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={CHIP(estado === "activos")}
            onClick={() => setEstado("activos")}
          >
            Activos ({conLegajo.filter((x) => !deBaja(x)).length})
          </button>
          <button
            type="button"
            className={CHIP(estado === "bajas")}
            onClick={() => setEstado("bajas")}
          >
            Bajas ({conLegajo.filter(deBaja).length})
          </button>
          <button
            type="button"
            className="ml-auto text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
            onClick={() =>
              descargarCSV("plantilla-personal.csv", [
                [
                  "Nombre",
                  "Apellido",
                  "Rol",
                  "Email",
                  "Teléfono",
                  "Puesto",
                  "Ingreso (aaaa-mm-dd)",
                  "Básico",
                ],
                [
                  "Ana",
                  "Pérez",
                  "Asistente",
                  "ana.perez@clinica.com",
                  "+54 11 5555-0000",
                  "Asistente dental",
                  diaISO(),
                  "850000",
                ],
              ])
            }
          >
            Descargar plantilla para importar
          </button>
        </div>
      </div>

      {vista === "organigrama" ? (
        <Organigrama ctx={ctx} />
      ) : lista.length === 0 ? (
        <Vacio icon={Users} texto="No hay personas con esos filtros." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lista.map(({ m, l }) => {
            const s = saldoVacaciones(m.id, l.ingreso, ausencias);
            const hoy = diaISO();
            const ausente = ausencias.find(
              (a) => a.miembroId === m.id && a.desde <= hoy && a.hasta >= hoy,
            );
            const docsVencidos = documentos.filter(
              (d) => d.miembroId === m.id && d.vence && d.vence < hoy,
            ).length;
            const finCt = l.finContrato ? diasEntre(hoy, l.finContrato) : null;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => ctx.abrirPersona(m.id)}
                  className="card-grad flex h-full w-full flex-col p-4 text-left transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3">
                    <Avatar m={m} tam="size-11" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{nombreDe(m)}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {l.puesto} · {l.sucursal}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Pill clase="bg-primary/10 text-primary">{ROL_LABEL[m.role]}</Pill>
                        {l.baja ? (
                          <Pill clase="bg-rose-100 text-rose-700">Baja {fecha(l.baja.fecha)}</Pill>
                        ) : ausente ? (
                          <Pill clase="bg-amber-100 text-amber-700">{ausente.tipo}</Pill>
                        ) : m.status === "pendiente" ? (
                          <Pill clase="bg-sky-100 text-sky-700">Invitación pendiente</Pill>
                        ) : (
                          <Pill clase="bg-emerald-100 text-emerald-700">Activo</Pill>
                        )}
                        {legajoIncompleto(l) && (
                          <Pill clase="bg-muted text-muted-foreground">Legajo incompleto</Pill>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {l.numero}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {[
                      ["Antigüedad", `${antiguedad(l.ingreso)} a`],
                      ["Vacaciones", `${s.disponibles} d`],
                      ["Jornada", `${l.jornada} h`],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-white/80 py-2 ring-1 ring-primary/10">
                        <p className="text-sm font-bold">{v}</p>
                        <p className="text-[10px] text-muted-foreground">{k}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                    <span>
                      {paisDe(l.pais).bandera} {l.modalidad}
                    </span>
                    {finCt !== null && finCt <= 30 && (
                      <Pill
                        clase={
                          finCt < 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                        }
                      >
                        Contrato {finCt < 0 ? "vencido" : `vence en ${finCt} d`}
                      </Pill>
                    )}
                    {docsVencidos > 0 && (
                      <Pill clase="bg-rose-100 text-rose-700">{docsVencidos} doc. vencido</Pill>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {alta && (
        <Modal titulo="Alta de persona" onClose={() => setAlta(false)} ancho="max-w-2xl">
          <AltaForm
            ctx={ctx}
            onCancel={() => setAlta(false)}
            onListo={(m, id) => {
              setAlta(false);
              ctx.onToast(m);
              ctx.abrirPersona(id);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

/** Suma integrantes a Equipo (fuera del hook, para importaciones) y les crea acceso al portal. */
function agregarAEquipo(nuevos: TeamMember[]) {
  const eq = storeEquipo.leer();
  storeEquipo.poner({ ...eq, miembros: [...eq.miembros, ...nuevos] });
  for (const m of nuevos) asegurarAcceso(m.id);
}

function Organigrama({ ctx }: { ctx: Ctx }) {
  const { miembros } = useEquipo();
  const { legajos } = storeRRHH.usar();
  const activos = miembros.filter((m) => m.status !== "inactivo" && !legajos[m.id]?.baja);
  const por = (d: Departamento) => activos.filter((m) => legajoDe(m, legajos).departamento === d);
  const Nodo = ({ m, chico = false }: { m: TeamMember; chico?: boolean }) => (
    <button
      type="button"
      onClick={() => ctx.abrirPersona(m.id)}
      className={`flex w-full items-center gap-2 rounded-2xl bg-white/90 text-left ring-1 ring-primary/15 transition-colors hover:ring-primary/40 ${chico ? "p-2" : "p-2.5"}`}
    >
      <Avatar m={m} tam={chico ? "size-8" : "size-9"} />
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold">{nombreDe(m)}</span>
        <span className="block truncate text-[10px] text-muted-foreground">
          {legajoDe(m, legajos).puesto}
        </span>
      </span>
    </button>
  );
  const direccion = [...por("Dirección"), ...por("Administración")];
  const clinicos = por("Clínico");
  const odontologos = clinicos.filter((m) => m.role === "odontologo");
  const asistentes = clinicos.filter((m) => m.role !== "odontologo");
  return (
    <div className="card-grad p-5">
      <div className="mx-auto max-w-xs">
        <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
          Dirección y administración
        </p>
        <div className="space-y-1.5">
          {direccion.map((m) => (
            <Nodo key={m.id} m={m} />
          ))}
        </div>
      </div>
      <div className="mx-auto h-6 w-px bg-primary/25" />
      <div className="mx-auto h-px w-2/3 bg-primary/25" />
      <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-3">
        <div className="rounded-3xl bg-primary/[0.04] p-3 ring-1 ring-primary/10 md:col-span-2">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            <Briefcase className="size-3.5" /> Área clínica · {clinicos.length}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {odontologos.map((o) => {
              const suyos = asistentes.filter(
                (a) => a.assistantOf?.includes(o.id) || o.assistants?.includes(a.id),
              );
              return (
                <div key={o.id} className="space-y-1.5">
                  <Nodo m={o} />
                  {suyos.map((a) => (
                    <div key={a.id} className="ml-5 border-l-2 border-primary/15 pl-2">
                      <Nodo m={a} chico />
                    </div>
                  ))}
                </div>
              );
            })}
            {asistentes
              .filter(
                (a) =>
                  !odontologos.some(
                    (o) => a.assistantOf?.includes(o.id) || o.assistants?.includes(a.id),
                  ),
              )
              .map((a) => (
                <Nodo key={a.id} m={a} chico />
              ))}
          </div>
        </div>
        <div className="rounded-3xl bg-primary/[0.04] p-3 ring-1 ring-primary/10">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            <Building2 className="size-3.5" /> Recepción · {por("Recepción").length}
          </p>
          <div className="space-y-1.5">
            {por("Recepción").map((m) => (
              <Nodo key={m.id} m={m} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Alta ───────────── */

function AltaForm({
  ctx,
  onCancel,
  onListo,
}: {
  ctx: Ctx;
  onCancel: () => void;
  onListo: (m: string, id: string) => void;
}) {
  const { plan } = useCloudEsther();
  const { setMiembros } = useEquipo();
  const { legajos, flujos } = storeRRHH.usar();
  const [f, setF] = useState({
    nombre: "",
    apellido: "",
    rol: "asistente" as TeamRole,
    email: "",
    telefono: "",
    puesto: "",
    sucursal: ctx.sucursales[0] ?? "",
    ingreso: diaISO(),
    pais: "AR" as PaisId,
    contratoId: "ar-dep",
    esquema: "Mensual" as EsquemaPago,
    valorHora: "",
    comisionPct: "",
    finContrato: "",
    basico: "",
    jornada: "40",
    dni: "",
  });
  const [error, setError] = useState("");
  const set = (c: Partial<typeof f>) => setF((p) => ({ ...p, ...c }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.nombre.trim() || !f.apellido.trim()) return setError("Completá nombre y apellido.");
        if (!/^\S+@\S+\.\S+$/.test(f.email.trim()))
          return setError("Cargá un correo válido: lo usa para entrar al portal del equipo.");
        const errC = validarContrato(f);
        if (errC) return setError(errC);
        if (!dentroDelLimite(plan, "usuarios", usuariosInternos(storeEquipo.leer().miembros)))
          return setError(MENSAJE_LIMITE.usuarios);
        const contrato = contratoDe(f.contratoId, f.pais);
        const m: TeamMember = {
          ...emptyMember(),
          firstName: titulo(f.nombre),
          lastName: titulo(f.apellido),
          role: f.rol,
          email: f.email.trim().toLowerCase(),
          phone: f.telefono.trim(),
          office:
            f.rol === "secretaria"
              ? "Recepción"
              : f.rol === "administrador"
                ? "Administración"
                : "",
          status: "activo",
          permissions: permsFor(f.rol),
        };
        const base = legajoDe(m, {});
        const numero = `L-${String(Object.keys(legajos).length + 1).padStart(4, "0")}`;
        setMiembros((p) => [...p, m]);
        setRRHH("legajos", (p) => ({
          ...p,
          [m.id]: {
            ...base,
            numero,
            puesto: f.puesto.trim() ? titulo(f.puesto) : base.puesto,
            sucursal: f.sucursal,
            ingreso: f.ingreso,
            ...datosContrato(f, base.basico),
            dni: f.dni.trim(),
            obraSocial: "",
            convenio:
              contrato.clase === "independiente"
                ? "Sin convenio (factura honorarios)"
                : "Según país",
            historial: [
              { fecha: f.ingreso, texto: `Ingreso como ${f.puesto.trim() || base.puesto}` },
            ],
          },
        }));
        const flujoAlta = flujos.find((x) => x.id === "f2");
        let extra = "";
        if (flujoAlta?.activo) {
          const acc = asegurarAcceso(m.id);
          setRRHH("flujos", (p) =>
            p.map((x) => (x.id === "f2" ? { ...x, ejecuciones: x.ejecuciones + 1 } : x)),
          );
          extra = ` · código del portal: ${acc.codigo}`;
        }
        auditar(ctx.usuario, "Alta", `${nombreDe(m)} (${numero}) como ${ROL_LABEL[m.role]}`);
        onListo(`${nombreDe(m)} dado de alta en Equipo y RRHH${extra}`, m.id);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nombre *">
          <input
            autoFocus
            value={f.nombre}
            onChange={(e) => set({ nombre: e.target.value })}
            className={INPUT}
            placeholder="Ej: Ana"
          />
        </Field>
        <Field label="Apellido *">
          <input
            value={f.apellido}
            onChange={(e) => set({ apellido: e.target.value })}
            className={INPUT}
            placeholder="Ej: Pérez"
          />
        </Field>
        <Field label="Correo laboral *">
          <input
            type="email"
            value={f.email}
            onChange={(e) => set({ email: e.target.value })}
            className={INPUT}
            placeholder="nombre@clinica.com"
          />
        </Field>
        <Field label="Teléfono">
          <input
            value={f.telefono}
            onChange={(e) => set({ telefono: e.target.value })}
            className={INPUT}
            placeholder="+54 11 …"
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Rol en el sistema">
          <Sel
            value={f.rol}
            onChange={(v) => set({ rol: v })}
            opciones={ROLES.map((r) => ({ value: r, label: ROL_LABEL[r] }))}
          />
        </Field>
        <Field label="Puesto">
          <input
            value={f.puesto}
            onChange={(e) => set({ puesto: e.target.value })}
            className={INPUT}
            placeholder="Ej: Asistente dental"
          />
        </Field>
        <Field label="Sucursal">
          <Sel
            value={f.sucursal}
            onChange={(v) => set({ sucursal: v })}
            opciones={ctx.sucursales}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Ingreso">
          <input
            type="date"
            value={f.ingreso}
            onChange={(e) => set({ ingreso: e.target.value })}
            className={INPUT}
          />
        </Field>
      </div>
      <ContratoCampos v={f} set={set} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="DNI">
          <input
            value={f.dni}
            onChange={(e) => set({ dni: e.target.value })}
            className={INPUT}
            placeholder="Opcional"
          />
        </Field>
      </div>
      <p className="rounded-xl bg-primary/[0.05] px-3 py-2 text-[11px] text-muted-foreground">
        Se crea en <b className="text-foreground">Equipo</b> con los permisos de su rol, se abre su
        legajo y (si la automatización está activa) recibe su código para el portal del equipo.
      </p>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta="Dar de alta" onCancel={onCancel} icon={UserPlus} />
    </form>
  );
}

/* ───────────── Ficha / legajo ───────────── */

type PestanaFicha = "datos" | "contrato" | "documentos" | "historial" | "desarrollo";

export function FichaPersona({ id, ctx, onClose }: { id: string; ctx: Ctx; onClose: () => void }) {
  const { miembros, ausencias, actualizarMiembro } = useEquipo();
  const { legajos, documentos, capacitaciones, evaluaciones } = storeRRHH.usar();
  const [tab, setTab] = useState<PestanaFicha>("datos");
  const [editar, setEditar] = useState(false);
  const [baja, setBaja] = useState(false);
  const m = miembros.find((x) => x.id === id);
  if (!m) return null;
  const l = legajoDe(m, legajos);
  const s = saldoVacaciones(m.id, l.ingreso, ausencias);
  const docs = documentos.filter((d) => d.miembroId === id);
  const evals = evaluaciones.filter((e) => e.miembroId === id);
  const cursos = capacitaciones.filter((c) => c.asignados.some((a) => a.miembroId === id));
  const aus = ausencias
    .filter((a) => a.miembroId === id)
    .sort((a, b) => b.desde.localeCompare(a.desde));
  const guardarLegajo = (cambios: Partial<Legajo>, texto?: string) =>
    setRRHH("legajos", (p) => ({
      ...p,
      [id]: {
        ...l,
        ...cambios,
        historial: texto ? [...l.historial, { fecha: diaISO(), texto }] : l.historial,
      },
    }));

  const TABS: [PestanaFicha, string][] = [
    ["datos", "Datos personales"],
    ["contrato", "Contrato y sueldo"],
    ["documentos", `Documentos (${docs.length})`],
    ["historial", "Historial"],
    ["desarrollo", "Desarrollo"],
  ];

  return (
    <Modal titulo={nombreDe(m)} onClose={onClose} ancho="max-w-3xl">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-gradient-to-r from-primary/[0.08] via-fuchsia-500/[0.05] to-transparent p-3">
        <Avatar m={m} tam="size-14" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {l.puesto} · <span className="text-muted-foreground">{l.sucursal}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            Legajo {l.numero} · {ROL_LABEL[m.role]} · ingresó el {fecha(l.ingreso)} (
            {antiguedad(l.ingreso)} años)
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Pill clase={l.baja ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}>
              {l.baja ? `Baja: ${l.baja.motivo}` : "Activo"}
            </Pill>
            <Pill clase="bg-primary/10 text-primary">{s.disponibles} días de vacaciones</Pill>
            {legajoIncompleto(l) && (
              <Pill clase="bg-amber-100 text-amber-700">Legajo incompleto</Pill>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          {m.phone && (
            <a
              href={`https://wa.me/${m.phone.replace(/[^\d]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className={BTN_ICONO}
            >
              <MessageCircle className="size-3.5" />
            </a>
          )}
          {m.phone && (
            <a
              href={`tel:${m.phone.replace(/[^\d+]/g, "")}`}
              aria-label="Llamar"
              className={BTN_ICONO}
            >
              <Phone className="size-3.5" />
            </a>
          )}
          <a href={`mailto:${m.email}`} aria-label="Correo" className={BTN_ICONO}>
            <Mail className="size-3.5" />
          </a>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1 rounded-2xl bg-primary/[0.04] p-1">
        {TABS.map(([k, t]) => (
          <button key={k} type="button" className={CHIP(tab === k)} onClick={() => setTab(k)}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {tab === "datos" && (
          <Grilla
            filas={[
              ["DNI", l.dni],
              ["CUIL", l.cuil],
              ["Nacimiento", fecha(l.nacimiento)],
              ["Correo", m.email],
              ["Teléfono", m.phone],
              ["Dirección", l.direccion],
              ["Contacto de emergencia", l.emergencia],
              ["Obra social", l.obraSocial],
              ["CBU", l.cbu],
            ]}
          />
        )}
        {tab === "contrato" && (
          <Grilla
            filas={[
              [
                "País",
                `${paisDe(l.pais).bandera} ${paisDe(l.pais).nombre} (${paisDe(l.pais).moneda})`,
              ],
              ["Tipo de contrato", l.modalidad],
              [
                "Forma de pago",
                l.esquema +
                  (l.esquema === "Por hora"
                    ? ` · ${formatoMoneda(l.valorHora, paisDe(l.pais).moneda)}/h`
                    : "") +
                  (l.comisionPct ? ` · ${l.comisionPct}% producción` : ""),
              ],
              ["Fin de contrato", l.finContrato ? fecha(l.finContrato) : "Tiempo indeterminado"],
              ["Convenio", l.convenio],
              ["Departamento", l.departamento],
              ["Jornada", `${l.jornada} h semanales`],
              [
                contratoDe(l.contratoId, l.pais).clase === "independiente"
                  ? "Honorario mensual"
                  : "Sueldo básico",
                l.esquema === "Por hora" || l.esquema === "Por comisión"
                  ? "Variable"
                  : formatoMoneda(l.basico, paisDe(l.pais).moneda),
              ],
              [
                "Horario",
                m.schedule
                  .filter((d) => d.active)
                  .map((d) => `${d.day.slice(0, 3)} ${d.start}-${d.end}`)
                  .slice(0, 3)
                  .join(" · ") + (m.schedule.filter((d) => d.active).length > 3 ? " …" : ""),
              ],
              [
                "Comisiones",
                m.commissions?.length
                  ? m.commissions.map((c) => `${c.service} ${c.percentage}%`).join(", ")
                  : "—",
              ],
              ["Vacaciones", `${s.total} días al año · usados ${s.usados}`],
            ]}
          />
        )}
        {tab === "documentos" && (
          <div className="space-y-1.5">
            {docs.length === 0 && (
              <p className="text-xs text-muted-foreground">Sin documentos cargados.</p>
            )}
            {docs.map((d) => {
              const dv = d.vence ? diasEntre(diaISO(), d.vence) : null;
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-primary/10"
                >
                  <FileText className="size-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.tipo}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {d.archivo} · subido {fecha(d.subido)}
                    </p>
                  </div>
                  {dv !== null && (
                    <Pill
                      clase={
                        dv < 0
                          ? "bg-rose-100 text-rose-700"
                          : dv <= 30
                            ? "bg-amber-100 text-amber-700"
                            : "bg-muted text-muted-foreground"
                      }
                    >
                      {dv < 0 ? "Vencido" : `Vence ${fecha(d.vence)}`}
                    </Pill>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              className={BTN_SECUNDARIO}
              onClick={() => {
                onClose();
                ctx.ir("documentos");
              }}
            >
              <Plus className="size-4" />
              Cargar documento
            </button>
          </div>
        )}
        {tab === "historial" && (
          <ol className="relative space-y-2 border-l-2 border-primary/15 pl-4">
            {[
              ...l.historial.map((h) => ({ f: h.fecha, t: h.texto, i: Briefcase })),
              ...aus.map((a) => ({
                f: a.desde,
                t: `${a.tipo} del ${fecha(a.desde)} al ${fecha(a.hasta)}${a.nota ? ` · ${a.nota}` : ""}`,
                i: CalendarDays,
              })),
              ...evals
                .filter((e) => e.estado === "Cerrada")
                .map((e) => ({
                  f: e.fecha,
                  t: `Evaluación ${e.ciclo}: ${(Object.values(e.puntajes).reduce((a, b) => a + b, 0) / 5).toFixed(1)}/5`,
                  i: Star,
                })),
              ...(l.baja ? [{ f: l.baja.fecha, t: `Baja: ${l.baja.motivo}`, i: UserMinus }] : []),
            ]
              .sort((a, b) => b.f.localeCompare(a.f))
              .map((h, n) => (
                <li key={n} className="relative">
                  <span className="absolute -left-[25px] top-0.5 grid size-4 place-items-center rounded-full bg-primary text-white">
                    <h.i className="size-2.5" />
                  </span>
                  <p className="text-xs font-medium">{h.t}</p>
                  <p className="text-[10px] text-muted-foreground">{fecha(h.f)}</p>
                </li>
              ))}
          </ol>
        )}
        {tab === "desarrollo" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-primary/10">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <GraduationCap className="size-3.5 text-primary" /> Capacitaciones
              </p>
              <ul className="mt-2 space-y-1">
                {cursos.length === 0 && (
                  <li className="text-[11px] text-muted-foreground">Sin cursos asignados.</li>
                )}
                {cursos.map((c) => {
                  const a = c.asignados.find((x) => x.miembroId === id)!;
                  return (
                    <li key={c.id} className="flex justify-between gap-2 text-[11px]">
                      <span className="truncate">{c.titulo}</span>
                      <Pill
                        clase={
                          a.estado === "Completada"
                            ? "bg-emerald-100 text-emerald-700"
                            : a.estado === "En curso"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-amber-100 text-amber-700"
                        }
                      >
                        {a.estado}
                      </Pill>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-primary/10">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <Star className="size-3.5 text-primary" /> Evaluaciones
              </p>
              <ul className="mt-2 space-y-1.5">
                {evals.length === 0 && (
                  <li className="text-[11px] text-muted-foreground">Sin evaluaciones.</li>
                )}
                {evals.map((e) => (
                  <li key={e.id} className="text-[11px]">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{e.ciclo}</span>
                      <b className="text-primary">
                        {(
                          Object.values(e.puntajes).reduce((a, b) => a + b, 0) / COMPETENCIAS.length
                        ).toFixed(1)}
                        /5
                      </b>
                    </div>
                    {e.fortalezas && (
                      <p className="truncate text-muted-foreground">{e.fortalezas}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-primary/10 pt-3">
        <button type="button" className={BTN_PRIMARIO} onClick={() => setEditar(true)}>
          <Pencil className="size-4" />
          Editar legajo
        </button>
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() => ctx.preguntar(`¿Cómo está ${m.firstName}?`)}
        >
          <Sparkles className="size-4" />
          Preguntar a Esther
        </button>
        {l.baja || m.status === "inactivo" ? (
          <button
            type="button"
            className={`${BTN_SECUNDARIO} ml-auto`}
            onClick={() => {
              guardarLegajo({ baja: null }, "Reincorporación");
              actualizarMiembro(id, (x) => ({ ...x, status: "activo" }));
              auditar(ctx.usuario, "Reincorporación", nombreDe(m));
              ctx.onToast(`${nombreDe(m)} reincorporado`);
            }}
          >
            <RotateCcw className="size-4" />
            Reincorporar
          </button>
        ) : (
          <button
            type="button"
            className={`${BTN_SECUNDARIO} ml-auto`}
            onClick={() => setBaja(true)}
          >
            <UserMinus className="size-4" />
            Dar de baja
          </button>
        )}
      </div>

      {editar && (
        <Modal
          titulo={`Legajo de ${nombreDe(m)}`}
          onClose={() => setEditar(false)}
          ancho="max-w-2xl"
        >
          <LegajoForm
            m={m}
            l={l}
            ctx={ctx}
            onCancel={() => setEditar(false)}
            onGuardar={(cambios, contacto, texto) => {
              guardarLegajo(cambios, texto);
              actualizarMiembro(id, (x) => ({ ...x, ...contacto }));
              auditar(
                ctx.usuario,
                "Legajo",
                `Actualizó el legajo de ${nombreDe(m)}${texto ? ` (${texto})` : ""}`,
              );
              setEditar(false);
              ctx.onToast("Legajo actualizado");
            }}
          />
        </Modal>
      )}
      {baja && (
        <Modal titulo={`Dar de baja a ${nombreDe(m)}`} onClose={() => setBaja(false)}>
          <BajaForm
            onCancel={() => setBaja(false)}
            onConfirmar={(f, motivo) => {
              guardarLegajo({ baja: { fecha: f, motivo } }, `Baja: ${motivo}`);
              actualizarMiembro(id, (x) => ({ ...x, status: "inactivo" }));
              auditar(ctx.usuario, "Baja", `${nombreDe(m)}: ${motivo}`);
              setBaja(false);
              ctx.onToast(
                `${nombreDe(m)} dado de baja: ya no aparece en Agenda ni puede entrar al portal`,
              );
            }}
          />
        </Modal>
      )}
    </Modal>
  );
}

function Grilla({ filas }: { filas: [string, string][] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {filas.map(([k, v]) => (
        <div key={k} className="rounded-xl bg-primary/[0.045] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {k}
          </p>
          <p className={`mt-0.5 truncate text-sm font-medium ${v ? "" : "text-muted-foreground"}`}>
            {v || "Sin cargar"}
          </p>
        </div>
      ))}
    </div>
  );
}

function LegajoForm({
  m,
  l,
  ctx,
  onCancel,
  onGuardar,
}: {
  m: TeamMember;
  l: Legajo;
  ctx: Ctx;
  onCancel: () => void;
  onGuardar: (c: Partial<Legajo>, contacto: Partial<TeamMember>, texto: string) => void;
}) {
  const [f, setF] = useState({
    ...l,
    basico: String(l.basico),
    jornada: String(l.jornada),
    valorHora: String(l.valorHora),
    comisionPct: String(l.comisionPct),
    email: m.email,
    phone: m.phone,
  });
  const set = (c: Partial<typeof f>) => setF((p) => ({ ...p, ...c }));
  const [error, setError] = useState("");
  const campo = (
    label: string,
    k:
      | "dni"
      | "cuil"
      | "direccion"
      | "emergencia"
      | "obraSocial"
      | "cbu"
      | "convenio"
      | "puesto"
      | "numero"
      | "email"
      | "phone",
    ph = "",
  ) => (
    <Field label={label}>
      <input
        value={f[k]}
        onChange={(e) => set({ [k]: e.target.value } as Partial<typeof f>)}
        className={INPUT}
        placeholder={ph}
      />
    </Field>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (f.cuil && !/^\d{2}-?\d{8}-?\d$/.test(f.cuil.trim()))
          return setError("El CUIL tiene que tener 11 números (ej. 20-12345678-9).");
        const errC = validarContrato(f);
        if (errC) return setError(errC);
        if (!dentroDelLimite(plan, "usuarios", usuariosInternos(storeEquipo.leer().miembros)))
          return setError(MENSAJE_LIMITE.usuarios);
        const dc = datosContrato(f, l.basico);
        const basico = dc.basico;
        const cambios: string[] = [];
        if (basico !== l.basico)
          cambios.push(
            `Sueldo ${formatoMoneda(l.basico, paisDe(l.pais).moneda)} → ${formatoMoneda(basico, paisDe(f.pais).moneda)}`,
          );
        if (f.puesto !== l.puesto) cambios.push(`Puesto: ${f.puesto}`);
        if (dc.contratoId !== l.contratoId)
          cambios.push(`Contrato: ${paisDe(dc.pais).nombre} · ${dc.modalidad}`);
        if (dc.esquema !== l.esquema) cambios.push(`Pago: ${dc.esquema}`);
        if (f.sucursal !== l.sucursal) cambios.push(`Traslado a ${f.sucursal}`);
        onGuardar(
          {
            numero: f.numero === "Sin número" ? l.numero : f.numero,
            dni: f.dni.trim(),
            cuil: f.cuil.trim(),
            nacimiento: f.nacimiento,
            direccion: f.direccion.trim(),
            emergencia: f.emergencia.trim(),
            obraSocial: f.obraSocial.trim(),
            cbu: f.cbu.trim(),
            puesto: f.puesto.trim(),
            departamento: f.departamento,
            sucursal: f.sucursal,
            ingreso: f.ingreso,
            ...dc,
            convenio: f.convenio.trim(),
          },
          { email: f.email.trim().toLowerCase(), phone: f.phone.trim() },
          cambios.join(" · "),
        );
      }}
      className="space-y-3"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
        Datos personales
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {campo("N.º de legajo", "numero", "L-0009")}
        {campo("DNI", "dni", "30.000.000")}
        {campo("CUIL", "cuil", "20-30000000-5")}
        <Field label="Nacimiento">
          <input
            type="date"
            value={f.nacimiento}
            onChange={(e) => set({ nacimiento: e.target.value })}
            className={INPUT}
          />
        </Field>
        {campo("Correo", "email")}
        {campo("Teléfono", "phone")}
        {campo("Dirección", "direccion", "Calle y número, ciudad")}
        {campo("Contacto de emergencia", "emergencia", "Nombre · teléfono")}
        {campo("Obra social", "obraSocial")}
      </div>
      {campo("CBU / alias para el sueldo", "cbu", "22 dígitos o alias")}
      <p className="pt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
        Puesto y contrato
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {campo("Puesto", "puesto")}
        <Field label="Departamento">
          <Sel
            value={f.departamento}
            onChange={(v) => set({ departamento: v })}
            opciones={DEPARTAMENTOS}
          />
        </Field>
        <Field label="Sucursal">
          <Sel
            value={f.sucursal}
            onChange={(v) => set({ sucursal: v })}
            opciones={ctx.sucursales}
          />
        </Field>
        <Field label="Ingreso">
          <input
            type="date"
            value={f.ingreso}
            onChange={(e) => set({ ingreso: e.target.value })}
            className={INPUT}
          />
        </Field>
        {campo("Convenio", "convenio")}
      </div>
      <ContratoCampos v={f} set={set} />
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta="Guardar legajo" onCancel={onCancel} />
    </form>
  );
}

const MOTIVOS_BAJA = [
  "Renuncia",
  "Despido con causa",
  "Despido sin causa",
  "Fin de contrato",
  "Mutuo acuerdo",
  "Jubilación",
];

function BajaForm({
  onCancel,
  onConfirmar,
}: {
  onCancel: () => void;
  onConfirmar: (fecha: string, motivo: string) => void;
}) {
  const [f, setF] = useState(diaISO());
  const [motivo, setMotivo] = useState(MOTIVOS_BAJA[0]!);
  const [detalle, setDetalle] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onConfirmar(f, detalle.trim() ? `${motivo} (${detalle.trim()})` : motivo);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Fecha de baja">
          <input type="date" value={f} onChange={(e) => setF(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Motivo">
          <Sel value={motivo} onChange={setMotivo} opciones={MOTIVOS_BAJA} />
        </Field>
      </div>
      <Field label="Detalle (opcional)">
        <input value={detalle} onChange={(e) => setDetalle(e.target.value)} className={INPUT} />
      </Field>
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200">
        Queda inactivo en Equipo (no aparece en la Agenda ni puede entrar al portal). El legajo y su
        historial se conservan.
      </p>
      <Acciones etiqueta="Confirmar baja" onCancel={onCancel} icon={UserMinus} />
    </form>
  );
}

/* ───────────── País, contrato y forma de pago ───────────── */

type DatosContratoForm = {
  pais: PaisId;
  contratoId: string;
  esquema: EsquemaPago;
  basico: string;
  valorHora: string;
  comisionPct: string;
  jornada: string;
  finContrato: string;
};

function validarContrato(f: DatosContratoForm): string {
  const k = contratoDe(f.contratoId, f.pais);
  if (k.plazoFijo && !f.finContrato) return "Este contrato tiene plazo: indicá la fecha de fin.";
  if (f.esquema === "Por hora" && !(Number(f.valorHora) > 0)) return "Indicá el valor de la hora.";
  if ((f.esquema === "Por comisión" || f.esquema === "Mixto") && !(Number(f.comisionPct) > 0))
    return "Indicá el porcentaje de comisión sobre la producción.";
  return "";
}

function datosContrato(f: DatosContratoForm, basicoActual: number) {
  const k = contratoDe(f.contratoId, f.pais);
  return {
    pais: f.pais,
    contratoId: k.id,
    modalidad: k.nombre,
    esquema: f.esquema,
    basico:
      f.esquema === "Por hora" || f.esquema === "Por comisión"
        ? 0
        : Number(f.basico) || basicoActual,
    valorHora: Number(f.valorHora) || 0,
    comisionPct: Number(f.comisionPct) || 0,
    jornada: Number(f.jornada) || 40,
    finContrato: k.plazoFijo ? f.finContrato : "",
  };
}

function ContratoCampos({
  v,
  set,
}: {
  v: DatosContratoForm;
  set: (c: Partial<DatosContratoForm>) => void;
}) {
  const pais = paisDe(v.pais);
  const k = contratoDe(v.contratoId, v.pais);
  const num = (label: string, key: "basico" | "valorHora" | "comisionPct" | "jornada", ph = "") => (
    <Field label={label}>
      <input
        type="number"
        min={0}
        step="any"
        value={v[key]}
        onChange={(e) => set({ [key]: e.target.value })}
        className={INPUT}
        placeholder={ph}
        aria-label={label}
      />
    </Field>
  );
  return (
    <div className="space-y-3 rounded-2xl bg-primary/[0.04] p-3 ring-1 ring-primary/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
        Contratación y pago
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="País">
          <Sel
            value={v.pais}
            etiqueta="País"
            onChange={(p) => {
              const np = paisDe(p);
              set({ pais: np.id, contratoId: np.contratos[0]!.id });
            }}
            opciones={PAISES.map((p) => ({
              value: p.id,
              label: `${p.bandera} ${p.nombre} · ${p.moneda}`,
            }))}
          />
        </Field>
        <Field label="Tipo de contrato">
          <Sel
            value={k.id}
            etiqueta="Tipo de contrato"
            onChange={(c) => set({ contratoId: c })}
            opciones={pais.contratos.map((c) => ({ value: c.id, label: c.nombre }))}
          />
        </Field>
        <Field label="Forma de pago">
          <Sel
            value={v.esquema}
            etiqueta="Forma de pago"
            onChange={(e) => set({ esquema: e })}
            opciones={ESQUEMAS}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(v.esquema === "Mensual" || v.esquema === "Mixto") &&
          num(
            `${k.clase === "independiente" ? "Honorario" : "Sueldo"} mensual (${pais.moneda})`,
            "basico",
            "Monto",
          )}
        {v.esquema === "Por hora" && num(`Valor hora (${pais.moneda})`, "valorHora", "Por hora")}
        {(v.esquema === "Por comisión" || v.esquema === "Mixto") &&
          num("% sobre producción", "comisionPct", "Ej: 20")}
        {num("Horas semanales", "jornada")}
        {k.plazoFijo && (
          <Field label="Fin de contrato *">
            <input
              type="date"
              value={v.finContrato}
              onChange={(e) => set({ finContrato: e.target.value })}
              className={INPUT}
              aria-label="Fin de contrato"
            />
          </Field>
        )}
      </div>
      <p className="text-[11px] leading-5 text-muted-foreground">
        <b className="text-foreground">
          {k.clase === "dependencia" ? "Relación de dependencia" : "Independiente (factura)"}
        </b>{" "}
        · {k.detalle}
        {k.requiereFactura
          ? " Para pagarle hay que registrar su factura o cuenta de cobro."
          : ""}{" "}
        Cuenta para el pago: {pais.cuenta}.
      </p>
    </div>
  );
}
