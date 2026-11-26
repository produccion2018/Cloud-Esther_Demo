import { pedirAClinica } from "./api";
import { SLUG_DEMO } from "./demo-admin";
import { clinicaReal } from "./modo-clinica";
import { crearEnlaceEstudioDemo, crearEnlaceLaboratorioDemo, demoConDatosEnServidor } from "@/lib/cloud-esther/demo-servidor";
import { claveDemoServidor, tenantActual } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/clinica/enlace-estudio.ts
   Enlace para que el PACIENTE suba su estudio (la placa o el PDF del centro radiológico) sin
   iniciar sesión. Lo que sube va directo a Cloudinary y aparece solo en su ficha → Estudios,
   marcado «para revisar». Vence en 14 días y admite hasta 5 archivos.
   Funciona en la clínica real y en el demo con cuenta (sus datos están en el servidor). */

export async function crearEnlaceEstudio(datos: {
  pacienteId: number;
  ordenId: number | null;
  nombre: string;
  tipo: string;
}): Promise<string> {
  const slug = clinicaReal()?.slug;
  let token: string;
  if (slug && slug !== SLUG_DEMO) {
    token = (await pedirAClinica<{ token: string }>(slug, "POST", "/estudios/enlaces", datos)).token;
  } else if (demoConDatosEnServidor()) {
    token = (await crearEnlaceEstudioDemo({ ...datos, clave: claveDemoServidor("registros", tenantActual()) })).token;
  } else {
    throw new Error("Esta opción funciona cuando entrás al demo con tu cuenta (así lo que sube el paciente llega a la ficha).");
  }
  return `${window.location.origin}/subir-estudio/${token}`;
}

/* Enlace para el LABORATORIO: ve sus órdenes (paciente abreviado, archivos) y actualiza el
   estado, la fecha de entrega o deja una nota, sin crearse cuenta. Vence en un año; al crear
   uno nuevo para el mismo laboratorio, el anterior deja de andar. */
export async function crearEnlaceLaboratorio(laboratorio: string): Promise<{ url: string; vence: string }> {
  const slug = clinicaReal()?.slug;
  let r: { token: string; vence: string };
  if (slug && slug !== SLUG_DEMO) {
    r = await pedirAClinica<{ token: string; vence: string }>(slug, "POST", "/laboratorio/enlaces", { laboratorio });
  } else if (demoConDatosEnServidor()) {
    r = await crearEnlaceLaboratorioDemo({ laboratorio, clave: claveDemoServidor("registros", tenantActual()) });
  } else {
    throw new Error("Esta opción funciona cuando entrás al demo con tu cuenta (así lo que marca el laboratorio llega a la clínica).");
  }
  return { url: `${window.location.origin}/laboratorio-enlace/${r.token}`, vence: r.vence };
}
