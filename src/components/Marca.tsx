import Image from 'next/image';

/** Encabezado con el logo: el círculo mostaza del logo como marco. */
export function Logo({ tamano = 112 }: { tamano?: number }) {
  return (
    <Image
      src="/tempenchile-logo.jpg"
      alt="Tempenchile Restaurante"
      width={tamano}
      height={tamano}
      priority
      className="rounded-full shadow-md ring-4 ring-mostaza/40"
    />
  );
}

/** Tarjeta crema con borde mostaza, como el aro del logo. */
export function Tarjeta({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border-4 border-mostaza bg-crema shadow-xl shadow-verde/10 ${className}`}>
      {children}
    </div>
  );
}

/** Separador con los tres puntos del logo. */
export function Separador() {
  return (
    <div className="flex items-center gap-2 text-mostaza" aria-hidden>
      <span className="h-0.5 flex-1 bg-mostaza/60" />
      <span className="size-1.5 rounded-full bg-mostaza" />
      <span className="size-2 rounded-full bg-mostaza" />
      <span className="size-1.5 rounded-full bg-mostaza" />
      <span className="h-0.5 flex-1 bg-mostaza/60" />
    </div>
  );
}
