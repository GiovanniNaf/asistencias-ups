'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { Logo, Tarjeta } from '@/components/Marca';

const SECCIONES = [
  { href: '/admin', texto: 'Empleados' },
  { href: '/admin/reporte', texto: 'Reporte' },
  { href: '/admin/qr', texto: 'Póster QR' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined);
  const ruta = usePathname();

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = getSupabase().auth.onAuthStateChange((_evento, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (sesion === undefined) return <main className="fondo-bordado min-h-dvh" />;
  if (!sesion) return <Login />;

  return (
    <div className="fondo-bordado min-h-dvh">
      <header className="no-imprimir border-b-4 border-mostaza bg-verde text-crema">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
          <Logo tamano={44} />
          <span className="font-display uppercase tracking-wider text-mostaza">Admin</span>
          <nav className="flex flex-1 flex-wrap gap-1">
            {SECCIONES.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={`rounded-full px-4 py-1.5 font-semibold transition ${
                  ruta === s.href ? 'bg-mostaza text-verde' : 'hover:bg-crema/10'
                }`}
              >
                {s.texto}
              </Link>
            ))}
          </nav>
          <span className="hidden text-sm opacity-70 sm:inline">{sesion.user.email}</span>
          <button onClick={() => getSupabase().auth.signOut()} className="text-sm font-semibold underline underline-offset-2">
            Salir
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) setError('Correo o contraseña incorrectos.');
    setCargando(false);
  };

  return (
    <main className="fondo-bordado flex min-h-dvh items-center justify-center p-4">
      <Tarjeta className="w-full max-w-sm p-8">
        <div className="flex justify-center">
          <Logo tamano={100} />
        </div>
        <h1 className="mt-4 text-center font-display text-xl uppercase tracking-wider">Administración</h1>
        <form onSubmit={entrar} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo"
            autoComplete="email"
            className="w-full rounded-xl border-2 border-crema-oscuro bg-white px-4 py-3 outline-none focus:border-mostaza"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            autoComplete="current-password"
            className="w-full rounded-xl border-2 border-crema-oscuro bg-white px-4 py-3 outline-none focus:border-mostaza"
          />
          {error && <p className="font-semibold text-chile">{error}</p>}
          <button
            disabled={cargando}
            className="w-full rounded-xl bg-verde py-3 font-display uppercase tracking-wider text-mostaza disabled:opacity-50"
          >
            {cargando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </Tarjeta>
    </main>
  );
}
