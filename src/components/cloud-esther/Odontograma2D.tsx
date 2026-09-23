import { useState, useSyncExternalStore } from "react";
import { Eraser, RotateCcw, Trash2, Activity } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Odontograma 2D - Cloud Esther
   Notación FDI
   Representación anatómica de dientes:
   incisivos, caninos, premolares y molares.
   ───────────────────────────────────────────────────────────── */

/* ───────────── Tipos ───────────── */

export type Superficie = "V" | "L" | "M" | "D" | "O";

export type HallazgoSuperficie =
  | "caries"
  | "obturacion"
  | "sellante"
  | "fractura";

export type HallazgoPieza =
  | "corona"
  | "endodoncia"
  | "implante"
  | "extraccion"
  | "ausente";

type HerramientaId =
  | HallazgoSuperficie
  | HallazgoPieza
  | "borrar";

export type Denticion =
  | "permanente"
  | "temporal";

export type EstadoDiente = {
  sup: Partial<
    Record<Superficie, HallazgoSuperficie>
  >;
  entero?: HallazgoPieza;
};

export type Odontograma =
  Record<number, EstadoDiente>;

type Herramienta = {
  id: HerramientaId;
  label: string;
  tipo: "superficie" | "pieza" | "borrar";
  color: string;
};

/* ───────────── Herramientas ───────────── */

const HERRAMIENTAS: Herramienta[] = [
  {
    id: "caries",
    label: "Caries",
    tipo: "superficie",
    color: "#ef4444",
  },
  {
    id: "obturacion",
    label: "Obturación",
    tipo: "superficie",
    color: "#3b82f6",
  },
  {
    id: "sellante",
    label: "Sellante",
    tipo: "superficie",
    color: "#10b981",
  },
  {
    id: "fractura",
    label: "Fractura",
    tipo: "superficie",
    color: "#f97316",
  },
  {
    id: "corona",
    label: "Corona",
    tipo: "pieza",
    color: "#d97706",
  },
  {
    id: "endodoncia",
    label: "Endodoncia",
    tipo: "pieza",
    color: "#a855f7",
  },
  {
    id: "implante",
    label: "Implante",
    tipo: "pieza",
    color: "#0d9488",
  },
  {
    id: "extraccion",
    label: "Extracción indicada",
    tipo: "pieza",
    color: "#dc2626",
  },
  {
    id: "ausente",
    label: "Ausente",
    tipo: "pieza",
    color: "#6b7280",
  },
  {
    id: "borrar",
    label: "Borrar",
    tipo: "borrar",
    color: "#6b7280",
  },
];

const COLOR = Object.fromEntries(
  HERRAMIENTAS.map((h) => [
    h.id,
    h.color,
  ]),
) as Record<
  HerramientaId,
  string
>;

const ETIQUETA = Object.fromEntries(
  HERRAMIENTAS.map((h) => [
    h.id,
    h.label,
  ]),
) as Record<
  HerramientaId,
  string
>;

/* ───────────── Store por paciente ───────────── */

let odontogramasActuales: Record<
  number,
  Odontograma
> = {};

const oyentes = new Set<() => void>();

const suscribir = (f: () => void) => {
  oyentes.add(f);

  return () => {
    oyentes.delete(f);
  };
};

const leer = () =>
  odontogramasActuales;

const VACIO: Odontograma = {};

export function useOdontogramas() {
  const todos =
    useSyncExternalStore(
      suscribir,
      leer,
      leer,
    );

  const de = (
    id: number,
  ): Odontograma =>
    todos[id] ?? VACIO;

  const cambiar = (
    id: number,
    fn: (
      prev: Odontograma,
    ) => Odontograma,
  ) => {
    odontogramasActuales = {
      ...odontogramasActuales,
      [id]: fn(
        odontogramasActuales[
          id
        ] ?? VACIO,
      ),
    };

    oyentes.forEach((f) => f());
  };

  return {
    de,
    cambiar,
  };
}

/* ───────────── Notación FDI ───────────── */

const FILAS: Record<
  Denticion,
  {
    superior: [
      number[],
      number[],
    ];
    inferior: [
      number[],
      number[],
    ];
  }
> = {
  permanente: {
    superior: [
      [
        18, 17, 16, 15,
        14, 13, 12, 11,
      ],
      [
        21, 22, 23, 24,
        25, 26, 27, 28,
      ],
    ],
    inferior: [
      [
        48, 47, 46, 45,
        44, 43, 42, 41,
      ],
      [
        31, 32, 33, 34,
        35, 36, 37, 38,
      ],
    ],
  },

  temporal: {
    superior: [
      [55, 54, 53, 52, 51],
      [61, 62, 63, 64, 65],
    ],
    inferior: [
      [85, 84, 83, 82, 81],
      [71, 72, 73, 74, 75],
    ],
  },
};

const cuadrante = (n: number) =>
  Math.floor(n / 10);

const esSuperior = (n: number) =>
  [1, 2, 5, 6].includes(
    cuadrante(n),
  );

const mesialADerecha = (n: number) =>
  [1, 4, 5, 8].includes(
    cuadrante(n),
  );

const esAnterior = (n: number) =>
  n % 10 <= 3;

function caraPorLado(
  n: number,
): Record<
  "arriba" |
    "abajo" |
    "izquierda" |
    "derecha",
  Superficie
> {
  const superior =
    esSuperior(n);

  const mesialDerecha =
    mesialADerecha(n);

  return {
    arriba: superior
      ? "V"
      : "L",
    abajo: superior
      ? "L"
      : "V",
    izquierda: mesialDerecha
      ? "D"
      : "M",
    derecha: mesialDerecha
      ? "M"
      : "D",
  };
}

function nombreSuperficie(
  n: number,
  s: Superficie,
) {
  switch (s) {
    case "V":
      return "Vestibular";

    case "L":
      return esSuperior(n)
        ? "Palatina"
        : "Lingual";

    case "M":
      return "Mesial";

    case "D":
      return "Distal";

    case "O":
      return esAnterior(n)
        ? "Incisal"
        : "Oclusal";
  }
}

/* ───────────── Tipo anatómico ───────────── */

type TipoDiente =
  | "incisivo"
  | "canino"
  | "premolar"
  | "molar";

function tipoDiente(
  n: number,
): TipoDiente {
  const posicion = n % 10;

  if (posicion <= 2)
    return "incisivo";

  if (posicion === 3)
    return "canino";

  if (
    posicion === 4 ||
    posicion === 5
  )
    return "premolar";

  return "molar";
}

/* ───────────── Geometría dental ───────────── */

const W = 42;
const H = 48;

/*
  IMPORTANTE:
  Estos paths son las SILUETAS REALES de las piezas.
  No se utilizan cuadrados ni cajas para representar
  los dientes.
*/

function siluetaDiente(
  tipo: TipoDiente,
  superior: boolean,
) {
  if (
    tipo === "incisivo"
  ) {
    return superior
      ? `
        M 10 5
        C 14 2, 28 2, 32 5
        C 35 8, 34 13, 33 18
        L 31 37
        C 29 42, 13 42, 11 37
        L 9 18
        C 8 13, 7 8, 10 5
        Z
      `
      : `
        M 10 43
        C 14 46, 28 46, 32 43
        C 35 40, 34 35, 33 30
        L 31 11
        C 29 6, 13 6, 11 11
        L 9 30
        C 8 35, 7 40, 10 43
        Z
      `;
  }

  if (
    tipo === "canino"
  ) {
    return superior
      ? `
        M 9 6
        C 14 3, 28 3, 33 6
        C 35 10, 33 15, 31 20
        L 27 38
        C 25 43, 17 43, 15 38
        L 11 20
        C 9 15, 7 10, 9 6
        Z
      `
      : `
        M 9 42
        C 14 45, 28 45, 33 42
        C 35 38, 33 33, 31 28
        L 27 10
        C 25 5, 17 5, 15 10
        L 11 28
        C 9 33, 7 38, 9 42
        Z
      `;
  }

  if (
    tipo === "premolar"
  ) {
    return superior
      ? `
        M 7 12
        C 8 7, 13 4, 18 6
        C 20 7, 22 7, 24 6
        C 29 4, 34 7, 35 12
        C 37 20, 35 32, 31 38
        C 27 43, 15 43, 11 38
        C 7 32, 5 20, 7 12
        Z
      `
      : `
        M 7 36
        C 8 41, 13 44, 18 42
        C 20 41, 22 41, 24 42
        C 29 44, 34 41, 35 36
        C 37 28, 35 16, 31 10
        C 27 5, 15 5, 11 10
        C 7 16, 5 28, 7 36
        Z
      `;
  }

  /* MOLAR */
  return superior
    ? `
      M 6 11
      C 9 5, 15 4, 19 7
      C 21 8, 22 8, 24 7
      C 29 4, 35 6, 37 12
      C 40 20, 38 31, 34 38
      C 30 44, 12 44, 8 38
      C 4 31, 3 19, 6 11
      Z
    `
    : `
      M 6 37
      C 9 43, 15 44, 19 41
      C 21 40, 22 40, 24 41
      C 29 44, 35 42, 37 36
      C 40 28, 38 17, 34 10
      C 30 4, 12 4, 8 10
      C 4 17, 3 29, 6 37
      Z
    `;
}

/* ───────────── Diente anatómico ───────────── */

function Diente({
  n,
  x,
  y,
  estado,
  onClick,
}: {
  n: number;
  x: number;
  y: number;
  estado?: EstadoDiente;
  onClick: (
    n: number,
    s: Superficie,
  ) => void;
}) {
  const tipo =
    tipoDiente(n);

  const superior =
    esSuperior(n);

  const lados =
    caraPorLado(n);

  const entero =
    estado?.entero;

  const cx = W / 2;

  /*
    Zonas internas del diente.
    No son cuadrados: siguen la anatomía
    de cada pieza.
  */

  const zonas = [
    {
      s: lados.arriba,
      d:
        tipo === "molar"
          ? superior
            ? "M8 12 Q12 6 18 9 L21 16 L24 9 Q30 6 34 12 L31 21 Q21 17 11 21 Z"
            : "M8 36 Q12 42 18 39 L21 32 L24 39 Q30 42 34 36 L31 27 Q21 31 11 27 Z"
          : superior
            ? "M10 7 Q20 3 32 7 L29 18 Q21 14 13 18 Z"
            : "M10 41 Q20 45 32 41 L29 30 Q21 34 13 30 Z",
    },

    {
      s: lados.abajo,
      d:
        tipo === "molar"
          ? superior
            ? "M8 37 Q12 43 18 40 L21 33 L24 40 Q30 43 34 37 L31 28 Q21 32 11 28 Z"
            : "M8 11 Q12 5 18 8 L21 15 L24 8 Q30 5 34 11 L31 20 Q21 16 11 20 Z"
          : superior
            ? "M10 41 Q20 45 32 41 L29 30 Q21 34 13 30 Z"
            : "M10 7 Q20 3 32 7 L29 18 Q21 14 13 18 Z",
    },

    {
      s: lados.izquierda,
      d:
        superior
          ? "M10 7 Q6 10 7 18 L11 37 Q13 40 18 40 L15 19 Z"
          : "M10 41 Q6 38 7 30 L11 11 Q13 8 18 8 L15 29 Z",
    },

    {
      s: lados.derecha,
      d:
        superior
          ? "M32 7 Q36 10 35 18 L31 37 Q29 40 24 40 L27 19 Z"
          : "M32 41 Q36 38 35 30 L31 11 Q29 8 24 8 L27 29 Z",
    },

    {
      s: "O" as Superficie,
      d:
        tipo === "molar"
          ? superior
            ? `
              M12 18
              Q15 12 20 16
              Q25 12 30 18
              Q33 22 29 28
              Q25 34 20 30
              Q15 34 11 28
              Q8 22 12 18
              Z
            `
            : `
              M12 30
              Q15 36 20 32
              Q25 36 30 30
              Q33 26 29 20
              Q25 14 20 18
              Q15 14 11 20
              Q8 26 12 30
              Z
            `
          : tipo === "premolar"
            ? superior
              ? `
                M13 18
                Q17 12 20 17
                Q23 12 29 18
                Q31 23 27 29
                Q22 34 20 29
                Q17 34 13 29
                Q10 23 13 18
                Z
              `
              : `
                M13 30
                Q17 36 20 31
                Q23 36 29 30
                Q31 25 27 19
                Q22 14 20 19
                Q17 14 13 19
                Q10 25 13 30
                Z
              `
            : superior
              ? "M13 18 Q20 13 29 18 L27 29 Q20 34 14 29 Z"
              : "M13 30 Q20 35 29 30 L27 19 Q20 14 14 19 Z",
    },
  ];

  return (
    <g
      transform={`translate(${x} ${y})`}
    >
      {/* Sombra del diente */}
      <ellipse
        cx={cx}
        cy={superior ? 44 : 4}
        rx={13}
        ry={2}
        fill="currentColor"
        opacity={0.06}
      />

      {/* Silueta blanca del diente */}
      <path
        d={siluetaDiente(
          tipo,
          superior,
        )}
        fill="#ffffff"
        stroke="#9f91c9"
        strokeWidth={1.5}
        strokeLinejoin="round"
        opacity={
          entero === "ausente"
            ? 0.3
            : 1
        }
      />

      {/* Superficies */}
      <g
        opacity={
          entero === "ausente"
            ? 0.3
            : 1
        }
      >
        {zonas.map(
          ({ s, d }) => {
            const hallazgo =
              estado?.sup[s];

            const nombre =
              nombreSuperficie(
                n,
                s,
              );

            return (
              <path
                key={s}
                d={d}
                fill={
                  hallazgo
                    ? COLOR[
                        hallazgo
                      ]
                    : "#ffffff"
                }
                fillOpacity={
                  hallazgo
                    ? 0.92
                    : 0.82
                }
                stroke="#a99bcf"
                strokeWidth={0.8}
                strokeLinejoin="round"
                role="button"
                tabIndex={0}
                aria-label={`Pieza ${n}, ${nombre}${
                  hallazgo
                    ? `: ${ETIQUETA[
                        hallazgo
                      ]}`
                    : ""
                }`}
                className="cursor-pointer outline-none transition-all duration-150 hover:brightness-95 focus-visible:stroke-primary focus-visible:[stroke-width:2.5]"
                onClick={() =>
                  onClick(n, s)
                }
                onKeyDown={(e) => {
                  if (
                    e.key ===
                      "Enter" ||
                    e.key === " "
                  ) {
                    e.preventDefault();
                    onClick(n, s);
                  }
                }}
              >
                <title>
                  {`Pieza ${n} · ${nombre}${
                    hallazgo
                      ? ` · ${ETIQUETA[
                          hallazgo
                        ]}`
                      : ""
                  }`}
                </title>
              </path>
            );
          },
        )}
      </g>

      {/* Contorno final del diente */}
      <path
        d={siluetaDiente(
          tipo,
          superior,
        )}
        fill="none"
        stroke="#8f80bd"
        strokeWidth={1.25}
        strokeLinejoin="round"
        pointerEvents="none"
      />

      {/* Indicadores de pieza completa */}
      <g
        pointerEvents="none"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Ausente */}
        {entero ===
          "ausente" && (
          <>
            <line
              x1={7}
              y1={8}
              x2={W - 7}
              y2={H - 8}
              stroke={
                COLOR.ausente
              }
              strokeWidth={3.5}
            />

            <line
              x1={W - 7}
              y1={8}
              x2={7}
              y2={H - 8}
              stroke={
                COLOR.ausente
              }
              strokeWidth={3.5}
            />
          </>
        )}

        {/* Extracción */}
        {entero ===
          "extraccion" && (
          <>
            <line
              x1={5}
              y1={7}
              x2={W - 5}
              y2={H - 7}
              stroke={
                COLOR.extraccion
              }
              strokeWidth={3}
            />

            <line
              x1={W - 5}
              y1={7}
              x2={5}
              y2={H - 7}
              stroke={
                COLOR.extraccion
              }
              strokeWidth={3}
            />
          </>
        )}

        {/* Corona */}
        {entero === "corona" && (
          <path
            d={siluetaDiente(
              tipo,
              superior,
            )}
            fill="none"
            stroke={
              COLOR.corona
            }
            strokeWidth={3}
          />
        )}

        {/* Endodoncia */}
        {entero ===
          "endodoncia" && (
          <>
            <path
              d={
                superior
                  ? "M21 20 C18 25 18 32 20 39"
                  : "M21 28 C24 23 24 16 22 9"
              }
              stroke={
                COLOR.endodoncia
              }
              strokeWidth={3}
            />

            <circle
              cx={21}
              cy={
                superior
                  ? 39
                  : 9
              }
              r={2}
              fill={
                COLOR.endodoncia
              }
              stroke="none"
            />
          </>
        )}

        {/* Implante */}
        {entero ===
          "implante" && (
          <>
            <path
              d={
                superior
                  ? `
                    M21 24 V43
                    M14 27 H28
                    M15 32 H27
                    M16 37 H26
                    M17 42 H25
                  `
                  : `
                    M21 24 V5
                    M14 21 H28
                    M15 16 H27
                    M16 11 H26
                    M17 6 H25
                  `
              }
              stroke={
                COLOR.implante
              }
              strokeWidth={2.5}
            />
          </>
        )}
      </g>
    </g>
  );
}

/* ───────────── Gráfico completo ───────────── */

const ANCHO = 760;
const ALTO = 205;

const ESPACIO = 45;
const SEPARACION_CENTRAL = 22;

const Y_SUP = 27;
const Y_INF = 119;

function Grafico({
  denticion,
  datos,
  onClick,
}: {
  denticion: Denticion;
  datos: Odontograma;
  onClick: (
    n: number,
    s: Superficie,
  ) => void;
}) {
  const filas =
    FILAS[denticion];

  const fila = (
    par: [
      number[],
      number[],
    ],
    y: number,
    yNumero: number,
  ) => {
    const [izquierda, derecha] =
      par;

    const total =
      izquierda.length +
      derecha.length;

    const ancho =
      total * ESPACIO +
      SEPARACION_CENTRAL;

    const inicio =
      (ANCHO - ancho) / 2;

    const posiciones = [
      ...izquierda.map(
        (n, i) => ({
          n,
          x:
            inicio +
            i * ESPACIO,
        }),
      ),

      ...derecha.map(
        (n, i) => ({
          n,
          x:
            inicio +
            izquierda.length *
              ESPACIO +
            SEPARACION_CENTRAL +
            i * ESPACIO,
        }),
      ),
    ];

    return posiciones.map(
      ({ n, x }) => {
        const tiene =
          !!datos[n];

        return (
          <g key={n}>
            {/* Número FDI */}
            <text
              x={
                x + W / 2
              }
              y={yNumero}
              textAnchor="middle"
              className={`text-[11px] ${
                tiene
                  ? "fill-primary font-bold"
                  : "fill-muted-foreground"
              }`}
            >
              {n}
            </text>

            {/* Diente real */}
            <Diente
              n={n}
              x={x}
              y={y}
              estado={datos[n]}
              onClick={onClick}
            />
          </g>
        );
      },
    );
  };

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className="h-auto w-full select-none"
      role="group"
      aria-label={`Odontograma ${denticion}`}
    >
      {/* Línea media */}
      <line
        x1={ANCHO / 2}
        y1={8}
        x2={ANCHO / 2}
        y2={ALTO - 8}
        stroke="#a99bcf"
        strokeOpacity={0.35}
        strokeDasharray="3 4"
      />

      {/* Separación de arcadas */}
      <line
        x1={10}
        y1={ALTO / 2}
        x2={ANCHO - 10}
        y2={ALTO / 2}
        stroke="#a99bcf"
        strokeOpacity={0.28}
        strokeDasharray="3 4"
      />

      <text
        x={10}
        y={
          ALTO / 2 - 7
        }
        className="fill-muted-foreground text-[10px]"
      >
        Derecha
      </text>

      <text
        x={ANCHO - 10}
        y={
          ALTO / 2 - 7
        }
        textAnchor="end"
        className="fill-muted-foreground text-[10px]"
      >
        Izquierda
      </text>

      {/* Arcada superior */}
      {fila(
        filas.superior,
        Y_SUP,
        18,
      )}

      {/* Arcada inferior */}
      {fila(
        filas.inferior,
        Y_INF,
        Y_INF + H + 15,
      )}
    </svg>
  );
}

/* ───────────── Estilos ───────────── */
/* ITEM: mismo cardStyle violeta + hover que el resto de los módulos
   (Agenda, Pacientes, Clínica, etc.) — antes tenía fondo plano y sin hover */

const ITEM =
  "relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-b from-[oklch(0.96_0.025_292)]/70 to-transparent p-3 shadow-soft transition-all duration-500 hover:-translate-y-1 hover:border-primary hover:shadow-lift";

const BTN_SECUNDARIO =
  "flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2";

const CIRCULO_ICONO =
  "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/15";

/* ───────────── Componentes auxiliares ───────────── */

function Chip({
  color,
  children,
}: {
  color: string;
  children: string;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium">
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{
          background: color,
        }}
      />
      {children}
    </span>
  );
}

function Dato({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: number;
}) {
  return (
    <div className={ITEM}>
      <p className="text-[11px] font-semibold text-muted-foreground">
        {etiqueta}
      </p>

      <p className="mt-0.5 text-lg font-bold">
        {valor}
      </p>
    </div>
  );
}

/* ───────────── Sección principal ───────────── */

export function OdontogramaSec({
  pacienteId,
  onToast,
}: {
  pacienteId: number;
  onToast: (
    msg: string,
  ) => void;
}) {
  const store =
    useOdontogramas();

  const datos =
    store.de(pacienteId);

  const [
    denticion,
    setDenticion,
  ] = useState<Denticion>(
    "permanente",
  );

  const [
    herramienta,
    setHerramienta,
  ] =
    useState<HerramientaId>(
      "caries",
    );

  const actual =
    HERRAMIENTAS.find(
      (h) =>
        h.id === herramienta,
    )!;

  /* ───────────── Aplicar ───────────── */

  const aplicar = (
    n: number,
    s: Superficie,
  ) => {
    store.cambiar(
      pacienteId,
      (prev) => {
        const previo =
          prev[n] ?? {
            sup: {},
          };

        const sup = {
          ...previo.sup,
        };

        let entero =
          previo.entero;

        if (
          actual.tipo ===
          "borrar"
        ) {
          if (sup[s]) {
            delete sup[s];
          } else {
            entero =
              undefined;
          }
        } else if (
          actual.tipo ===
          "pieza"
        ) {
          entero =
            entero === herramienta
              ? undefined
              : (herramienta as HallazgoPieza);
        } else if (
          sup[s] ===
          herramienta
        ) {
          delete sup[s];
        } else {
          sup[s] =
            herramienta as HallazgoSuperficie;
        }

        const siguiente = {
          ...prev,
        };

        if (
          Object.keys(sup)
            .length === 0 &&
          !entero
        ) {
          delete siguiente[n];
        } else {
          siguiente[n] = {
            sup,
            entero,
          };
        }

        return siguiente;
      },
    );
  };

  /* ───────────── Quitar pieza ───────────── */

  const quitarPieza = (
    n: number,
  ) => {
    store.cambiar(
      pacienteId,
      (prev) => {
        const {
          [n]: _quitada,
          ...resto
        } = prev;

        return resto;
      },
    );

    onToast(
      `Pieza ${n}: hallazgos eliminados`,
    );
  };

  /* ───────────── Limpiar ───────────── */

  const limpiar = () => {
    if (
      Object.keys(datos)
        .length === 0
    ) {
      return;
    }

    if (
      !window.confirm(
        "¿Borrar todos los hallazgos del odontograma?",
      )
    ) {
      return;
    }

    store.cambiar(
      pacienteId,
      () => ({}),
    );

    onToast(
      "Odontograma reiniciado",
    );
  };

  /* ───────────── Datos ───────────── */

  const piezas =
    Object.keys(datos)
      .map(Number)
      .sort(
        (a, b) => a - b,
      );

  const superficiesCon = (
    h: HallazgoSuperficie,
  ) =>
    piezas.reduce(
      (acc, n) =>
        acc +
        Object.values(
          datos[n].sup,
        ).filter(
          (v) => v === h,
        ).length,
      0,
    );

  const piezasCon = (
    h: HallazgoPieza,
  ) =>
    piezas.filter(
      (n) =>
        datos[n].entero ===
        h,
    ).length;

  const herramientasSup =
    HERRAMIENTAS.filter(
      (h) =>
        h.tipo ===
        "superficie",
    );

  const herramientasPieza =
    HERRAMIENTAS.filter(
      (h) =>
        h.tipo === "pieza",
    );

  /* ───────────── Botón ───────────── */

  const botonHerramienta = (
    h: Herramienta,
  ) => {
    const activa =
      herramienta === h.id;

    return (
      <button
        key={h.id}
        type="button"
        onClick={() =>
          setHerramienta(
            h.id,
          )
        }
        aria-pressed={activa}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          activa
            ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
            : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
        }`}
      >
        {h.id ===
        "borrar" ? (
          <Eraser className="size-3.5" />
        ) : (
          <span
            aria-hidden
            className="size-2.5 rounded-full ring-2 ring-white/70"
            style={{
              background:
                h.color,
            }}
          />
        )}

        {h.label}
      </button>
    );
  };

  /* ───────────── Render ───────────── */

  return (
    <div className="space-y-3">

      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`${CIRCULO_ICONO} size-10`}
          >
            <Activity className="size-5" />
          </span>

          <div>
            <h4 className="text-lg font-semibold">
              Odontograma 2D
            </h4>

            <p className="text-sm text-muted-foreground">
              Seleccioná un
              hallazgo y tocá
              la superficie
              del diente
              correspondiente.
              Notación FDI.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={limpiar}
          className={
            BTN_SECUNDARIO
          }
        >
          <RotateCcw className="size-4" />
          Limpiar odontograma
        </button>
      </div>

      {/* Dentición */}
      <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-primary/15 bg-primary/5 p-1.5 sm:max-w-sm">
        {(
          [
            "permanente",
            "temporal",
          ] as Denticion[]
        ).map((d) => {
          const activa =
            denticion === d;

          return (
            <button
              key={d}
              type="button"
              onClick={() =>
                setDenticion(d)
              }
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                activa
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
              }`}
            >
              {d ===
              "permanente"
                ? "Dentición permanente"
                : "Dentición temporal"}
            </button>
          );
        })}
      </div>

      {/* Herramientas */}
      <div
        className={`${ITEM} space-y-2.5`}
      >
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
            Sobre una cara
          </p>

          <div className="flex flex-wrap gap-1.5">
            {herramientasSup.map(
              botonHerramienta,
            )}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
            Sobre toda la pieza
          </p>

          <div className="flex flex-wrap gap-1.5">
            {herramientasPieza.map(
              botonHerramienta,
            )}

            {botonHerramienta(
              HERRAMIENTAS.find(
                (h) =>
                  h.id ===
                  "borrar",
              )!,
            )}
          </div>
        </div>
      </div>

      {/* ODONTOGRAMA */}
      <div className="rounded-xl border border-primary/25 bg-card p-3 shadow-sm">
        <Grafico
          denticion={denticion}
          datos={datos}
          onClick={aplicar}
        />

        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          Herramienta activa:{" "}
          <span className="font-semibold text-foreground">
            {actual.label}
          </span>

          {actual.tipo ===
            "pieza" &&
            " · tocá el diente para marcar o desmarcar la pieza"}

          {actual.tipo ===
            "borrar" &&
            " · tocá una superficie para quitar su hallazgo"}
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato
          etiqueta="Piezas con hallazgos"
          valor={
            piezas.length
          }
        />

        <Dato
          etiqueta="Caras con caries"
          valor={superficiesCon(
            "caries",
          )}
        />

        <Dato
          etiqueta="Caras obturadas"
          valor={superficiesCon(
            "obturacion",
          )}
        />

        <Dato
          etiqueta="Piezas ausentes"
          valor={piezasCon(
            "ausente",
          )}
        />
      </div>

      {/* Hallazgos */}
      {piezas.length ===
      0 ? (
        <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-border p-6 text-center">
          <div>
            <Activity className="mx-auto size-8 text-primary/60" />

            <p className="mt-2 text-sm font-semibold">
              Sin hallazgos registrados
            </p>

            <p className="text-sm text-muted-foreground">
              Tocá un diente
              del odontograma
              para comenzar.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {piezas.map(
            (n) => {
              const d =
                datos[n];

              const caras =
                (
                  Object.entries(
                    d.sup,
                  ) as [
                    Superficie,
                    HallazgoSuperficie,
                  ][]
                ).sort(
                  ([a], [b]) =>
                    a.localeCompare(
                      b,
                    ),
                );

              return (
                <li
                  key={n}
                  className={`${ITEM} flex items-center gap-3`}
                >
                  <span className="w-16 shrink-0 text-sm font-bold">
                    Pieza {n}
                  </span>

                  <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                    {d.entero && (
                      <Chip
                        color={
                          COLOR[
                            d.entero
                          ]
                        }
                      >
                        {
                          ETIQUETA[
                            d.entero
                          ]
                        }
                      </Chip>
                    )}

                    {caras.map(
                      ([s, h]) => (
                        <Chip
                          key={s}
                          color={
                            COLOR[h]
                          }
                        >
                          {`${nombreSuperficie(
                            n,
                            s,
                          )}: ${ETIQUETA[
                            h
                          ].toLowerCase()}`}
                        </Chip>
                      ),
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      quitarPieza(
                        n,
                      )
                    }
                    aria-label={`Eliminar hallazgos de la pieza ${n}`}
                    className="grid size-8 shrink-0 place-items-center rounded-full border border-transparent text-muted-foreground transition-all duration-200 hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            },
          )}
        </ul>
      )}
    </div>
  );
}