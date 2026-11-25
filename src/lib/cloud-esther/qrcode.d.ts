// Tipos mínimos del paquete «qrcode» (no trae los suyos): solo lo que usa la app.
declare module "qrcode" {
  type Opciones = { errorCorrectionLevel?: "L" | "M" | "Q" | "H"; margin?: number; width?: number };
  const QRCode: {
    create(texto: string, opciones?: Opciones): { modules: { size: number; get(x: number, y: number): number | boolean } };
    toDataURL(texto: string, opciones?: Opciones): Promise<string>;
  };
  export default QRCode;
}
