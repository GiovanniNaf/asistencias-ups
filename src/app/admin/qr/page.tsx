'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { adminFetch } from '@/lib/admin-client';
import { Logo, Separador } from '@/components/Marca';

export default function PosterQR() {
  const [qr, setQr] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch<{ token: string | null }>('/api/admin/qr')
      .then(({ token }) => {
        const url = `${window.location.origin}/registro${token ? `?k=${encodeURIComponent(token)}` : ''}`;
        setLink(url);
        return QRCode.toDataURL(url, {
          width: 900,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#1f3a1e', light: '#ffffff' },
        });
      })
      .then(setQr)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <style>{`@page { size: letter; margin: 0; }`}</style>

      <div className="no-imprimir mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-wide">Póster QR</h1>
          <p className="text-sm text-verde/70">Imprímelo en tamaño carta y pégalo en la entrada.</p>
          {link && (
            <p className="mt-1 break-all text-sm">
              Link del QR: <code className="rounded bg-white px-1.5 py-0.5">{link}</code>
            </p>
          )}
        </div>
        <button
          onClick={() => window.print()}
          disabled={!qr}
          className="rounded-xl bg-verde px-5 py-2.5 font-bold text-mostaza disabled:opacity-50"
        >
          Imprimir
        </button>
      </div>

      {error && <p className="font-semibold text-chile">{error}</p>}

      {/* Hoja carta: 8.5 × 11 in */}
      <article className="mx-auto flex aspect-[8.5/11] w-full max-w-[8.5in] flex-col items-center overflow-hidden rounded-3xl border-[10px] border-mostaza bg-crema px-[6%] py-[5%] text-center shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <Logo tamano={150} />
        <h2 className="mt-5 font-display text-[clamp(1.5rem,5vw,3rem)] uppercase leading-none tracking-wide">
          Registra tu asistencia
        </h2>
        <p className="mt-2 font-manuscrita text-[clamp(1.1rem,3vw,1.9rem)] text-hoja">Al llegar y al salir de tu turno</p>

        <div className="my-[4%] rounded-3xl bg-white p-4 shadow-md ring-4 ring-verde">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="Código QR de registro" className="size-[min(52vw,4.2in)]" />
          ) : (
            <div className="flex size-[min(52vw,4.2in)] items-center justify-center text-verde/50">Generando…</div>
          )}
        </div>

        <ol className="grid w-full grid-cols-3 gap-3 text-[clamp(0.7rem,1.8vw,1rem)] font-semibold">
          {['Escanea con la cámara', 'Elige tu nombre y pon tu PIN', 'Toca “Registrar asistencia”'].map((paso, i) => (
            <li key={paso} className="flex flex-col items-center gap-1">
              <span className="flex size-[2em] items-center justify-center rounded-full bg-verde font-display text-mostaza">
                {i + 1}
              </span>
              {paso}
            </li>
          ))}
        </ol>

        <div className="mt-auto w-full pt-4">
          <Separador />
          <p className="mt-3 text-[clamp(0.65rem,1.6vw,0.9rem)] text-verde/80">
            📍 Activa tu ubicación: solo puedes registrarte dentro del restaurante y desde tu propio teléfono.
          </p>
        </div>
      </article>
    </div>
  );
}
