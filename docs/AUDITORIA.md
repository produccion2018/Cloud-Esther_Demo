# Auditoría de Cloud Esther — octubre 2026

Auditoría completa del frontend de Cloud Esther (rama `claude/cloud-esther-demo-repo-v8cv9d`, la misma que se clona en `C:\Users\mauro\cloud-esther-nuevo`). Método: **auditar → detectar → corregir**, sin rediseñar ni romper lo que ya funcionaba. El backend se hace después: acá queda indicado qué tiene que resolver el servidor.

Referencias: ✅ estaba bien · 🔧 se corrigió · 🧩 preparado para el backend · ⚠️ pendiente / a decidir.

---

## 1. Multi-tenant y multiempresa

| Punto                                                                                                                | Estado | Detalle                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Datos por empresa (pacientes, agenda, historia, facturación, RRHH, inventario, comunicación, documentos, auditoría…) | ✅     | Todos los stores usan `crearStorePorEmpresa` y guardan con la clave de la empresa (`clinicId` de la sesión). Una empresa nunca ve los datos de otra.                        |
| Odontograma 2D y 3D, radiografías, imágenes e historial por pieza                                                    | ✅     | La clave incluye la empresa y el paciente (`odontogramKey(tenant, paciente)`).                                                                                              |
| Sesiones de los portales (paciente y equipo)                                                                         | ✅     | Guardadas por empresa (`claveTenant`).                                                                                                                                      |
| Configuración (apariencia, modo oscuro, menú, auditoría)                                                             | ✅     | Por empresa y sucursal.                                                                                                                                                     |
| Datos de la clínica en Configuración → General                                                                       | 🔧     | **Eran fijos e iguales para todas** («Centro Odontológico Esthetic», «30-12345678-9», «info@cloudesther.com»). Ahora cada clínica carga los suyos y se guardan por empresa. |
| Configuración → Profesionales                                                                                        | 🔧     | Mostraba 3 «Profesional» inventados. Ahora lista el equipo real de la empresa, con buscador.                                                                                |
| Datos globales a propósito                                                                                           | ✅     | Precios/límites de planes y contenido del sitio (los define el dueño de Cloud Esther, no cada clínica).                                                                     |
| Aislamiento real                                                                                                     | 🧩     | Hoy los datos viven en el navegador. El backend tiene que filtrar **cada consulta por `clinicId` del JWT** (nunca por un parámetro que mande el cliente).                   |

## 2. Planes, IA y notas de audio

| Punto                                                    | Estado | Detalle                                                                                                                                                                                                                                    |
| -------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Start y Pro → Odontograma 2D, sin IA ni audio            | 🔧     | Había dos puntos por donde se podía «colar» IA un instante: el plan arrancaba como Plus hasta leer el guardado, y fuera del proveedor del plan se asumía Enterprise. Ahora **ante la duda no hay IA ni audio** (`planListo` + `useConIA`). |
| Plus y Enterprise → Odontograma 3D + IA + notas de audio | ✅     | Nota de voz por pieza en la ficha del diente (3D) y en la historia clínica.                                                                                                                                                                |
| Verificación                                             | ✅     | Recorrido automático de 17 pantallas + carpeta del paciente en Start y en Pro: sin «nota de voz», «grabar», «micrófono», «audio», «transcripción» ni Esther IA.                                                                            |
| Comparativa de planes sin precios                        | ✅     | Los precios los carga el panel/backend.                                                                                                                                                                                                    |

## 3. Roles, permisos y secretaría

| Punto                                             | Estado | Detalle                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portal del equipo con permisos por integrante     | ✅     | Odontólogo, asistente, secretaría y administración ven lo suyo (Equipo → Permisos y accesos).                                                                                                                                                                                           |
| Espacio de trabajo de secretaría / administración | 🔧     | **Nuevo escritorio «Gestión»**, distinto del odontólogo: turnos por confirmar (con WhatsApp), cobros y saldos, presupuestos sin respuesta, planillas para **Excel**, documentos para **Word** (constancia, recibo, presupuesto) y tareas (compartidas con la Agenda). Respeta permisos. |
| Permiso de facturación para recepción             | 🔧     | Ahora viene habilitado por defecto (el dueño lo puede quitar). En navegadores que ya tenían datos guardados hay que habilitarlo a mano en Equipo → Permisos o restablecer los datos de práctica.                                                                                        |
| Rol dentro del panel de la clínica (`/demo`)      | ⚠️     | El panel principal asume dueño/administrador; el resto del equipo trabaja desde `/equipo`. Con el backend, el rol tiene que venir en el JWT y el servidor valida cada acción.                                                                                                           |
| Panel del dueño de Cloud Esther (`/admin`)        | ✅     | Roles Dueño, Socio, Soporte y Secretaría con acceso por sección (`sectionAccess`).                                                                                                                                                                                                      |

## 4. Panel del dueño

| Punto                                     | Estado | Detalle                                                                                                                                                                                                                                                                 |
| ----------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jerarquía del menú                        | ✅     | Resumen + grupos Comercial, Finanzas, Mi empresa, Atención, Control y Configuración.                                                                                                                                                                                    |
| Países seleccionados                      | 🔧 🧩  | Sección en `/admin/paises`: el dueño elige dónde se vende (tocando cada país). La configuración de cada clínica **solo ofrece esos países**. Lista compartida en `src/lib/paises.ts`. Backend: `GET /paises`, `PUT /admin/empresa/paises`.                              |
| Monto inicial + monto mensual por clínica | 🔧 🧩  | En el detalle de cada clínica: «Monto inicial» y «Monto mensual», **vacíos hasta cargarlos** (no se inventan), editables solo por el Dueño, ligados a clínica, empresa (tenant) y plan. También en el reporte de clínicas. Backend: `PATCH /admin/clinicas/:id/montos`. |
| Facturación del SaaS (cobros a clínicas)  | ✅ 🧩  | Usa el monto mensual de la clínica o, si falta, el precio del plan. Estados: al día, falta pagar, mora, suspendida.                                                                                                                                                     |

## 5. Auditoría de accesos

| Dato                              | Clínica                                | Panel del dueño                  |
| --------------------------------- | -------------------------------------- | -------------------------------- |
| Usuario, email, rol               | ✅                                     | ✅                               |
| Empresa (tenant) y clínica        | 🔧 agregado a sesiones y eventos       | — (es la empresa Cloud Esther)   |
| Entrada, salida, última actividad | ✅                                     | ✅                               |
| Duración                          | ✅ (se guarda al cerrar)               | ✅                               |
| Dispositivo, sistema, navegador   | ✅                                     | ✅                               |
| IP                                | 🧩 campo listo, lo completa el backend | 🧩 campo listo                   |
| Acción y módulo usado             | ✅                                     | 🔧 «Secciones usadas» por sesión |

El navegador no puede conocer la IP de forma confiable: la tiene que registrar el servidor en cada pedido.

## 6. Modo oscuro

| Punto                                                                    | Estado | Detalle                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fondos pastel (alertas, etiquetas, banners)                              | 🔧     | Arreglado **en el tema, no pantalla por pantalla**: en oscuro los tonos claros pasan a translúcidos y el texto se aclara en todos los módulos.                                                                                                                |
| Blanco al pasar el mouse (pestañas, menús de la carpeta)                 | 🔧     | Sin `hover:bg-white` en el SaaS.                                                                                                                                                                                                                              |
| Campos de texto que se ponían blancos al escribir (carpeta del paciente) | 🔧     | Corregido.                                                                                                                                                                                                                                                    |
| Brillos blancos sobre botones de color que se veían como puntos oscuros  | 🔧     | La regla de seguridad ahora solo actúa sobre blancos casi opacos.                                                                                                                                                                                             |
| Escaneo automático                                                       | ✅     | 28 pantallas de la clínica, 12 ventanas emergentes (modales) y 16 pantallas del panel: sin cajas claras. Excepciones a propósito: botones blancos sobre el banner violeta del inicio, la vista previa del color del menú y la muestra «Blanco» de apariencia. |
| Portales del equipo y del paciente                                       | ⚠️     | Siempre en modo claro (no tienen interruptor de tema). Se puede sumar si lo querés.                                                                                                                                                                           |

## 7. Responsive y experiencia tipo app

| Punto                  | Estado | Detalle                                                                                                                                                                                                    |
| ---------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sin scroll horizontal  | ✅     | Recorrido en celular (390 px) y tablet (820 px) de todas las pantallas.                                                                                                                                    |
| Navegación con el dedo | ✅     | Barra inferior tipo app en clínica, panel y portal del equipo; menú lateral en hoja.                                                                                                                       |
| Tablas en el celular   | 🔧     | Las tablas anchas (11 pantallas del panel y el monitor del portal) **pasan a tarjetas «etiqueta: valor»** en el celular, sin tocar cada pantalla (`src/lib/tablas-movil.ts`). En tablet y PC se ven igual. |
| Formularios sin zoom   | ✅     | Campos de 16 px en el celular.                                                                                                                                                                             |
| PWA                    | ✅     | Instalable, ícono, pantalla completa, sin conexión básica.                                                                                                                                                 |

## 8. Pendientes para el backend (resumen)

1. Autenticación real (JWT con `clinicId`, rol y permisos) y quitar o proteger `/acceso-prueba` y las credenciales de ejemplo.
2. Todas las consultas filtradas por `clinicId` del token.
3. Endpoints ya marcados con `TODO backend` en el código: países, montos de clínica, auditoría (con IP), facturación, portales.
4. Integración directa con Word/Excel (Microsoft 365 / Google Workspace) si se quiere editar en línea; hoy se descargan archivos que abren con Word y Excel.
5. Transcripción de notas de voz con IA (hoy «pendiente de integración»).
6. Contact Center con IA y automatizaciones n8n (Enterprise).

## 9. Calidad del código

- Verificación de tipos: 167 errores de TypeScript **ya existentes** (opciones estrictas), ninguno nuevo. Conviene limpiarlos antes de conectar el backend.
- Lint sin errores en los archivos tocados.
