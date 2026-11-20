'use client';
import { useCallback, useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { adminFetch } from '@/lib/admin-client';
import { Tarjeta } from '@/components/Marca';

type Empleado = {
  id: string;
  nombre: string;
  activo: boolean;
  tieneDispositivo: boolean;
  pinVisible: boolean;
  bloqueado_hasta: string | null;
};

const SEGUNDOS_PIN_VISIBLE = 15;

const PIN_VALIDO = /^\d{4,6}$/;
const campo = 'rounded-xl border-2 border-crema-oscuro bg-white px-4 py-2.5 outline-none focus:border-mostaza';

export default function AdminEmpleados() {
  const [empleados, setEmpleados] = useState<Empleado[] | null>(null);
  const [nombre, setNombre] = useState('');
  const [pin, setPin] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [pines, setPines] = useState<Record<string, string>>({});

  const ocultarPin = (id: string) =>
    setPines((actual) => {
      const resto = { ...actual };
      delete resto[id];
      return resto;
    });

  const verPin = async (emp: Empleado) => {
    if (pines[emp.id]) return ocultarPin(emp.id);
    try {
      const { pin } = await adminFetch<{ pin: string }>(`/api/admin/empleados/${emp.id}/pin`);
      setPines((actual) => ({ ...actual, [emp.id]: pin }));
      // Se oculta solo para que no quede a la vista en la pantalla
      setTimeout(() => ocultarPin(emp.id), SEGUNDOS_PIN_VISIBLE * 1000);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const cargar = useCallback(async () => {
    try {
      const { empleados } = await adminFetch<{ empleados: Empleado[] }>('/api/admin/empleados');
      setEmpleados(empleados);
    } catch (e) {
      toast.error((e as Error).message);
      setEmpleados([]);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PIN_VALIDO.test(pin)) return toast.error('El PIN debe tener de 4 a 6 dígitos.');
    setGuardando(true);
    try {
      await adminFetch('/api/admin/empleados', { method: 'POST', body: JSON.stringify({ nombre, pin }) });
      toast.success(`${nombre.trim()} agregado. Comparte su PIN en persona.`);
      setNombre('');
      setPin('');
      cargar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const actualizar = async (emp: Empleado, cambios: object, exito: string) => {
    try {
      await adminFetch(`/api/admin/empleados/${emp.id}`, { method: 'PATCH', body: JSON.stringify(cambios) });
      toast.success(exito);
      cargar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const cambiarPin = (emp: Empleado) => {
    const nuevo = window.prompt(`Nuevo PIN para ${emp.nombre} (4 a 6 dígitos):`);
    if (nuevo === null) return;
    if (!PIN_VALIDO.test(nuevo)) return toast.error('El PIN debe tener de 4 a 6 dígitos.');
    actualizar(emp, { pin: nuevo }, 'PIN actualizado y desbloqueado.');
  };

  const liberar = (emp: Empleado) => {
    if (!window.confirm(`¿Liberar el teléfono de ${emp.nombre}? Podrá vincular uno nuevo en su próximo registro.`)) return;
    actualizar(emp, { liberarDispositivo: true }, 'Teléfono liberado.');
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <h1 className="font-display text-2xl uppercase tracking-wide">Empleados</h1>

      <Tarjeta className="p-5">
        <h2 className="mb-3 font-bold">Agregar empleado</h2>
        <form onSubmit={agregar} className="flex flex-col gap-3 sm:flex-row">
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre completo"
            className={`${campo} flex-1`}
          />
          <input
            required
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="PIN (4-6 dígitos)"
            inputMode="numeric"
            className={`${campo} sm:w-44`}
          />
          <button
            disabled={guardando}
            className="rounded-xl bg-verde px-6 py-2.5 font-bold text-mostaza disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Agregar'}
          </button>
        </form>
      </Tarjeta>

      <Tarjeta className="overflow-hidden">
        {empleados === null ? (
          <p className="p-5 text-verde/60">Cargando…</p>
        ) : empleados.length === 0 ? (
          <p className="p-5 text-verde/60">Aún no hay empleados.</p>
        ) : (
          <ul className="divide-y-2 divide-crema-oscuro">
            {empleados.map((emp) => {
              const bloqueado = emp.bloqueado_hasta && new Date(emp.bloqueado_hasta) > new Date();
              return (
                <li key={emp.id} className={`flex flex-wrap items-center gap-3 px-5 py-4 ${emp.activo ? '' : 'opacity-50'}`}>
                  <div className="min-w-48 flex-1">
                    <p className="flex flex-wrap items-center gap-3 text-lg font-bold">
                      {emp.nombre}
                      {pines[emp.id] && (
                        <span className="rounded-lg bg-verde px-3 py-0.5 font-display text-base tracking-[0.3em] text-mostaza">
                          {pines[emp.id]}
                        </span>
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold">
                      <Etiqueta color={emp.activo ? 'hoja' : 'gris'}>{emp.activo ? 'Activo' : 'Inactivo'}</Etiqueta>
                      <Etiqueta color={emp.tieneDispositivo ? 'hoja' : 'mostaza'}>
                        {emp.tieneDispositivo ? '📱 Teléfono vinculado' : 'Sin teléfono vinculado'}
                      </Etiqueta>
                      {bloqueado && <Etiqueta color="chile">🔒 Bloqueado por PIN</Etiqueta>}
                      {!emp.pinVisible && <Etiqueta color="gris">PIN anterior: cámbialo para poder verlo</Etiqueta>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {emp.pinVisible && (
                      <Accion onClick={() => verPin(emp)}>{pines[emp.id] ? 'Ocultar PIN' : 'Ver PIN'}</Accion>
                    )}
                    <Accion onClick={() => cambiarPin(emp)}>Cambiar PIN</Accion>
                    {emp.tieneDispositivo && <Accion onClick={() => liberar(emp)}>Liberar teléfono</Accion>}
                    <Accion
                      onClick={() =>
                        actualizar(emp, { activo: !emp.activo }, emp.activo ? 'Empleado desactivado.' : 'Empleado activado.')
                      }
                    >
                      {emp.activo ? 'Desactivar' : 'Activar'}
                    </Accion>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}

function Etiqueta({ color, children }: { color: 'hoja' | 'mostaza' | 'chile' | 'gris'; children: React.ReactNode }) {
  const clases = {
    hoja: 'bg-hoja/15 text-hoja',
    mostaza: 'bg-mostaza/25 text-verde',
    chile: 'bg-chile/15 text-chile',
    gris: 'bg-verde/10 text-verde/70',
  };
  return <span className={`rounded-full px-2.5 py-0.5 ${clases[color]}`}>{children}</span>;
}

function Accion({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border-2 border-verde/20 bg-white px-3 py-1.5 font-semibold hover:border-mostaza"
    >
      {children}
    </button>
  );
}
