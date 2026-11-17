import { useTerminologia } from "@/lib/cloud-esther/terminologia";

/* Componente reutilizable: muestra «<término> <número>» con el término del documento según el
   país de la clínica, para que los listados y fichas digan «Cédula 123», «RUT 123», «DNI 123»…
   sin hardcodear «DNI». Para solo la etiqueta de un campo, usar useTerminologia().doc directo. */

function formatearDoc(d: string): string {
  const soloDigitos = d.replace(/\D/g, "");
  // Con puntos de miles si parece numérico (DNI/Cédula); si tiene letras (RUT, NIE), tal cual.
  return soloDigitos.length === d.length && soloDigitos.length >= 4
    ? soloDigitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    : d;
}

export function DocPaciente({ documento, sinFormato = false }: { documento: string; sinFormato?: boolean }) {
  const term = useTerminologia();
  if (!documento) return null;
  return (
    <>
      {term.doc} {sinFormato ? documento : formatearDoc(documento)}
    </>
  );
}
