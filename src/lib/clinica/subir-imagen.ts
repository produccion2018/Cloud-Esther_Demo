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
