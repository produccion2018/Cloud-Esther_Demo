import { useCloudEsther } from "@/lib/cloud-esther/data";
import { storeModulosExtra } from "@/lib/cloud-esther/modulos-extra-store";

/** n8n solo con Enterprise o con el módulo adicional de Automatizaciones. */
export function useConN8n() {
  const { plan } = useCloudEsther();
  const extras = storeModulosExtra.usar();
  return plan === "grupo" || extras.activos.some((m) => m.id === "automatizaciones");
}
