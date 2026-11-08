import { forwardRef } from "react";
import type { SVGProps } from "react";
import restingUrl from "@/assets/esther-pose-resting.png";

/* Ubicación: src/components/cloud-esther/esther-ai/CaraEsther.tsx
   La carita de Esther como ícono reutilizable. Reemplaza a la estrellita de "IA" en toda la
   app. Es un <svg>, así que se usa igual que cualquier ícono (incluso en menús y mapas de
   íconos): <CaraEsther className="size-4" />. El tamaño lo da la className. La imagen de
   Esther se recorta en círculo mostrando su cara. */

const CLIP = "ce-cara-clip";

export const CaraEsther = forwardRef<
  SVGSVGElement,
  SVGProps<SVGSVGElement> & { size?: number | string }
>(function CaraEsther({ className, size: _size, ...props }, ref) {
  void _size;
  return (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label="Esther"
      {...props}
    >
      <defs>
        <clipPath id={CLIP}>
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <image
        href={restingUrl}
        x={-5.6}
        y={-2.4}
        width={35.2}
        height={105.6}
        preserveAspectRatio="none"
        clipPath={`url(#${CLIP})`}
      />
    </svg>
  );
});
