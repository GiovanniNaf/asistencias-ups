import { Logo, Separador, Tarjeta } from '@/components/Marca';

export default function Inicio() {
  return (
    <main className="fondo-bordado flex min-h-dvh items-center justify-center p-6">
      <Tarjeta className="w-full max-w-sm p-8 text-center">
        <div className="flex justify-center">
          <Logo tamano={140} />
        </div>
        <h1 className="mt-6 font-display text-2xl uppercase tracking-wide">Registro de asistencia</h1>
        <div className="my-4">
          <Separador />
        </div>
        <p className="text-lg">Escanea el código QR que está en la entrada del restaurante para registrar tu llegada o tu salida.</p>
        <p className="mt-4 font-manuscrita text-xl text-hoja">¡Que tengas un excelente turno!</p>
      </Tarjeta>
    </main>
  );
}
