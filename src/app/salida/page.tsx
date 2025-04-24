'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

type Registro = {
    id: string;
    nombre: string;
    hora_entrada: string;
    hora_salida: string | null;
    device_id: string | null; // Asegúrate que tu tabla tiene esta columna
};

type MensajeEstado = {
    texto: string;
    tipo: 'exito' | 'error';
};

export default function RegistroSalida() {
    const [registros, setRegistros] = useState<Registro[]>([]);
    const [mensaje, setMensaje] = useState<MensajeEstado>({ texto: '', tipo: 'exito' });
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [fechaActual, setFechaActual] = useState('');
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Generar fingerprint del dispositivo
        const getFingerprint = async () => {
            const fp = await FingerprintJS.load();
            const { visitorId } = await fp.get();
            setDeviceId(visitorId);
        };
        getFingerprint();

        const hoy = new Date().toISOString().split('T')[0];
        setFechaActual(hoy);
        cargarRegistros(hoy);
    }, []);

    const cargarRegistros = async (fecha: string) => {
        try {
            const { data, error } = await supabase
                .from('asistencia')
                .select('id, nombre, hora_entrada, hora_salida, device_id')
                .eq('fecha', fecha)
                .order('hora_entrada', { ascending: true });

            if (error) throw error;

            setRegistros(data || []);
        } catch (error) {
            console.error('Error cargando registros:', error);
            setMensaje({
                texto: 'Error al cargar los registros',
                tipo: 'error'
            });
        }
    };

    const registrarSalida = async (id: string) => {
        if (!deviceId) {
            setMensaje({
                texto: 'No se pudo identificar el dispositivo',
                tipo: 'error'
            });
            return;
        }

        setLoadingId(id);
        setMensaje({ texto: '', tipo: 'exito' });

        try {
            // Verificar si ya hay registro de salida desde este dispositivo
            const { data: registrosHoy, error: queryError } = await supabase
                .from('asistencia')
                .select('id')
                .eq('fecha', fechaActual)
                .eq('device_id', deviceId)
                .not('hora_salida', 'is', null);

            if (queryError) throw queryError;
            if (registrosHoy && registrosHoy.length > 0) {
                throw new Error('Ya registraste una salida hoy desde este dispositivo');
            }

            const hora_salida = new Date().toTimeString().split(' ')[0].substring(0, 5);

            const { error } = await supabase
                .from('asistencia')
                .update({ 
                    hora_salida,
                    device_id: deviceId // Actualizar con el ID del dispositivo
                })
                .eq('id', id);

            if (error) throw error;

            router.push('/saludo');
            cargarRegistros(fechaActual);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            setMensaje({
                texto: `❌ ${errorMessage}`,
                tipo: 'error'
            });
        } finally {
            setLoadingId(null);
        }
    };

    const formatearFecha = (fecha: string) => {
        // Crear la fecha como local (sin Z)
        const fechaLocal = new Date(`${fecha}T00:00:00`);
    
        return fechaLocal.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'America/Mexico_City'
        });
    };
    

    return (
        // Dentro del return, reemplaza o ajusta las clases en las secciones clave:

        <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-green-600 px-4 sm:px-6 py-4">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Registro de Salida</h1>
                    <p className="text-green-100 mt-1 text-sm sm:text-base">
                        {fechaActual ? formatearFecha(fechaActual) : 'Cargando fecha...'}
                    </p>
                </div>

                <div className="p-4 sm:p-6">
                    {/* Mensaje */}
                    {mensaje.texto && (
                        <div className={`mb-4 p-3 rounded-lg text-sm ${mensaje.tipo === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                            {mensaje.texto}
                        </div>
                    )}

                    {/* Tabla en versión responsive */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 hidden sm:table-header-group">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Nombre</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Hora Entrada</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Hora Salida</th>
                                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {registros.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-4 text-center text-gray-500">
                                            No hay registros de entrada para hoy
                                        </td>
                                    </tr>
                                ) : (
                                    registros.map((registro) => (
                                        <tr key={registro.id} className="block sm:table-row border-b sm:border-none">
                                            <td className="px-4 py-2 sm:py-4 block sm:table-cell font-medium text-gray-900">
                                                <span className="sm:hidden font-semibold">Nombre: </span>{registro.nombre}
                                            </td>
                                            <td className="px-4 py-2 sm:py-4 block sm:table-cell text-gray-500">
                                                <span className="sm:hidden font-semibold">Entrada: </span>{registro.hora_entrada}
                                            </td>
                                            <td className="px-4 py-2 sm:py-4 block sm:table-cell text-gray-500">
                                                <span className="sm:hidden font-semibold">Salida: </span>{registro.hora_salida || 'Pendiente'}
                                            </td>
                                            <td className="px-4 py-2 sm:py-4 block sm:table-cell">
                                                <button
                                                    onClick={() => registrarSalida(registro.id)}
                                                    disabled={!!registro.hora_salida || loadingId !== null}
                                                    className={`w-full sm:w-auto mt-2 sm:mt-0 px-3 py-2 rounded-md text-sm font-medium text-center ${registro.hora_salida
                                                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                            : loadingId === registro.id
                                                                ? 'bg-green-300 text-white cursor-not-allowed'
                                                                : 'bg-green-600 text-white hover:bg-green-700'
                                                        }`}
                                                >
                                                    {registro.hora_salida
                                                        ? 'Registrado'
                                                        : loadingId === registro.id
                                                            ? 'Registrando...'
                                                            : 'Registrar Salida'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Instrucciones */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="bg-green-50 p-4 rounded-lg text-sm">
                            <h3 className="font-medium text-green-800">Instrucciones</h3>
                            <ul className="mt-2 text-green-700 space-y-1">
                                <li>• Haz clic en Registrar Salida para actualizar la hora de salida</li>
                                <li>• Solo se puede registrar salida una vez por persona</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
}