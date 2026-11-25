import { toast } from "sonner";

import { pedirAClinica } from "./api";
import { SLUG_DEMO } from "./demo-admin";
import { clinicaReal } from "./modo-clinica";
import { demoConDatosEnServidor, pedirFirmaDemo } from "@/lib/cloud-esther/demo-servidor";

/* Ubicación: src/lib/clinica/subir-imagen.ts

   ARCHIVOS (fotos, radiografías, PDFs, audios, logos, firmas) → SIEMPRE A CLOUDINARY.
   Nunca se guardan adentro de la base de datos: en los datos queda solo la dirección (URL).
   1. Se le pide la firma al servidor (con la sesión de la clínica o del demo).
   2. El navegador sube el archivo DIRECTO a Cloudinary con esa firma (el secreto nunca sale
      del servidor). Cada clínica / demo tiene su propia carpeta.
   Si Cloudinary no está disponible, NO se guarda el archivo (se avisa): así la base no se llena.
   Solo el demo sin servidor (todo en este navegador) lo guarda en el navegador. */

type Firma = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};

export const ERROR_SUBIDA =
  "No se pudo subir el archivo a la nube. Revisá tu internet y probá de nuevo; si sigue, avisale a Cloud Esther.";

async function subirConFirma(f: Firma, archivo: Blob, nombre?: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", archivo, nombre ?? (archivo instanceof File ? archivo.name : "archivo"));
  fd.append("api_key", f.apiKey);
  fd.append("timestamp", String(f.timestamp));
  fd.append("signature", f.signature);
  fd.append("folder", f.folder);
  // «auto»: imágenes, PDFs y audios con la misma firma
  const r = await fetch(`https://api.cloudinary.com/v1_1/${f.cloudName}/auto/upload`, { method: "POST", body: fd });
  if (!r.ok) throw new Error(ERROR_SUBIDA);
  const data = (await r.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error(ERROR_SUBIDA);
  return data.secure_url;
}

const slugReal = (slug?: string | null) => {
  const s = slug ?? clinicaReal()?.slug ?? null;
  return s && s !== SLUG_DEMO ? s : null;
};

/** ¿Los archivos van a Cloudinary? (clínica real o demo con servidor). Si no, quedan en el navegador. */
export const archivosEnLaNube = (slug?: string | null) => Boolean(slugReal(slug)) || demoConDatosEnServidor();

/** Sube un archivo a Cloudinary y devuelve su dirección. Demo sin servidor: data URL (en el navegador). */
export async function guardarArchivo(archivo: Blob, opciones: { slug?: string | null | undefined; nombre?: string | undefined } = {}): Promise<string> {
  const slug = slugReal(opciones.slug);
  if (slug) {
    const f = await pedirAClinica<Firma>(slug, "POST", "/imagenes/firma").catch(() => {
      throw new Error(ERROR_SUBIDA);
    });
    return subirConFirma(f, archivo, opciones.nombre);
  }
  if (demoConDatosEnServidor()) {
    let f: Firma;
    try {
      f = await pedirFirmaDemo<Firma>();
    } catch (e) {
      // Demo mientras Cloudinary todavía no está configurado: para no romper la prueba, la imagen
      // queda chica (y los PDF/audios livianos). Con Cloudinary configurado, va siempre allá.
      if ((e as { status?: number }).status === 503) return archivoChicoDemo(archivo);
      throw new Error(ERROR_SUBIDA);
    }
    return subirConFirma(f, archivo, opciones.nombre);
  }
  return blobADataUrl(archivo);
}

/** Igual que guardarArchivo, pero avisa el error en pantalla (y lo vuelve a lanzar). */
export async function urlPersistenteImagen(archivo: Blob, slug?: string | null): Promise<string> {
  try {
    return await guardarArchivo(archivo, { slug });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : ERROR_SUBIDA);
    throw e;
  }
}

/** Para lo que ya está como data URL (ej. una imagen achicada en el navegador). */
export async function guardarDataUrl(dataUrl: string, opciones: { slug?: string | null | undefined; nombre?: string | undefined } = {}): Promise<string> {
  if (!archivosEnLaNube(opciones.slug)) return dataUrl;
  const blob = await (await fetch(dataUrl)).blob();
  return guardarArchivo(blob, opciones);
}

async function archivoChicoDemo(archivo: Blob): Promise<string> {
  if (archivo.type.startsWith("image/")) {
    const f = archivo instanceof File ? archivo : new File([archivo], "imagen", { type: archivo.type });
    return blobADataUrl(await achicarFoto(f, 900));
  }
  if (archivo.size > 1_500_000) throw new Error("En el demo, los archivos de más de 1,5 MB no se pueden guardar todavía.");
  return blobADataUrl(archivo);
}

export function blobADataUrl(archivo: Blob): Promise<string> {
  return new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : "");
    fr.onerror = () => resolve("");
    fr.readAsDataURL(archivo);
  });
}

export async function subirImagenClinica(slug: string, file: File): Promise<string> {
  return guardarArchivo(file, { slug });
}

/** Achica una foto (lado mayor ≤ `lado` px, JPEG). Una foto del celular de 3 MB queda en ~40 KB. */
export async function achicarFoto(archivo: File, lado = 400): Promise<File> {
  if (typeof document === "undefined" || !archivo.type.startsWith("image/")) return archivo;
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * escala));
    canvas.height = Math.max(1, Math.round(bitmap.height * escala));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
    return blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : archivo;
  } catch {
    return archivo;
  }
}

/** FOTO DE UN PACIENTE: va a Cloudinary y en el listado queda solo su dirección. Si Cloudinary
 *  no está disponible devuelve null (la foto no se guarda adentro de los datos). En el demo sin
 *  servidor queda achicada en el navegador. */
export async function fotoPaciente(archivo: File, slug: string | null): Promise<string | null> {
  const chica = await achicarFoto(archivo, 400);
  if (archivosEnLaNube(slug)) {
    try {
      return await guardarArchivo(chica, { slug });
    } catch {
      return null;
    }
  }
  return blobADataUrl(await achicarFoto(archivo, 160));
}
