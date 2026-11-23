import { pedirAClinica } from "./api";

/* Ubicación: src/lib/clinica/subir-imagen.ts
   Sube UNA imagen a Cloudinary de forma segura: primero le pide la firma al backend (con la
   sesión de la clínica), y después sube el archivo DIRECTO a Cloudinary con esa firma. El
   secreto nunca pasa por el navegador. Devuelve la URL (secure_url) para guardar en el módulo. */

type FirmaImagen = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};

/** URL PERSISTENTE para una imagen (que sobrevive a recargar la página):
 *  - Clínica real → la sube a Cloudinary y devuelve su URL.
 *  - Demo o si Cloudinary falla → la convierte a data URL (base64), que también persiste.
 *  Nunca usar URL.createObjectURL para guardar: esa URL (blob:) se rompe al recargar. */
export async function urlPersistenteImagen(archivo: File, slug: string | null): Promise<string> {
  if (slug) {
    try {
      return await subirImagenClinica(slug, archivo);
    } catch {
      /* cae a data URL */
    }
  }
  return await new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : "");
    fr.onerror = () => resolve("");
    fr.readAsDataURL(archivo);
  });
}

export async function subirImagenClinica(slug: string, file: File): Promise<string> {
  const f = await pedirAClinica<FirmaImagen>(slug, "POST", "/imagenes/firma");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", f.apiKey);
  fd.append("timestamp", String(f.timestamp));
  fd.append("signature", f.signature);
  fd.append("folder", f.folder);

  const r = await fetch(`https://api.cloudinary.com/v1_1/${f.cloudName}/image/upload`, {
    method: "POST",
    body: fd,
  });
  if (!r.ok) throw new Error("No se pudo subir la imagen.");
  const data = (await r.json()) as { secure_url: string };
  return data.secure_url;
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

/** FOTO DE UN PACIENTE. En la clínica real va a Cloudinary y en el listado queda solo su dirección
 *  (así 15.000 pacientes siguen entrando en el plan). Si Cloudinary no está disponible, NO se
 *  guarda la foto adentro del listado (devuelve null). En el demo queda achicada en el navegador. */
export async function fotoPaciente(archivo: File, slug: string | null): Promise<string | null> {
  const chica = await achicarFoto(archivo, 400);
  if (slug) {
    try {
      return await subirImagenClinica(slug, chica);
    } catch {
      return null;
    }
  }
  const mini = await achicarFoto(archivo, 160);
  return await new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : "");
    fr.onerror = () => resolve("");
    fr.readAsDataURL(mini);
  });
}
