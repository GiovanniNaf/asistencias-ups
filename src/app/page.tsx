'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

type MensajeEstado = {
  texto: string;
  tipo: 'exito' | 'error';
};

export default function RegistroAsistencia() {
  const [nombre, setNombre] = useState('');
  const [mensaje, setMensaje] = useState<MensajeEstado>({ texto: '', tipo: 'exito' });
  const [isLoading, setIsLoading] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const router = useRouter();

  // Genera o recupera el ID del dispositivo
  useEffect(() => {
    const getDeviceId = async () => {
      const fp = await FingerprintJS.load();
      const { visitorId } = await fp.get();
      setDeviceId(visitorId);
    };
    getDeviceId();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId) {
      setMensaje({ texto: 'No se pudo identificar el dispositivo', tipo: 'error' });
      return;
    }

    setIsLoading(true);
    setMensaje({ texto: '', tipo: 'exito' });

    if (!nombre.trim()) {
      setMensaje({ texto: 'Por favor ingresa tu nombre', tipo: 'error' });
      setIsLoading(false);
      return;
    }

    try {
      // Verificar si ya hay un registro hoy con este deviceId
      const hoy = new Date().toISOString().split('T')[0];
      const { data: registrosHoy, error: queryError } = await supabase
        .from('asistencia')
        .select('*')
        .eq('fecha', hoy)
        .eq('device_id', deviceId);

      if (queryError) throw queryError;
      if (registrosHoy && registrosHoy.length > 0) {
        throw new Error('Ya registraste asistencia hoy desde este dispositivo');
      }

      // Registrar asistencia
      const ahora = new Date();
      const hora_entrada = ahora.toTimeString().split(' ')[0].substring(0, 5);

      const { data, error } = await supabase
        .from('asistencia')
        .insert([{ 
          nombre: nombre.trim(),
          fecha: hoy,
          hora_entrada,
          hora_salida: null,
          device_id: deviceId // ← Guardamos el ID del dispositivo
        }])
        .select();

      if (error) throw error;

      setMensaje({ 
        texto: `✅ Entrada registrada para ${data[0].nombre} a las ${hora_entrada}`, 
        tipo: 'exito' 
      });
      router.push('/saludo');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setMensaje({ texto: `❌ ${errorMessage}`, tipo: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-blue-600 px-6 py-4">
          <h1 className="text-xl font-bold text-white">Registro de Asistencia</h1>
          <p className="text-blue-100 text-sm mt-1">
            {new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo
              </label>
              <input
                type="text"
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Juan Pérez"
                disabled={isLoading}
              />
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Hora de entrada:</span>
                <span className="font-medium">
                  {new Date().toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                isLoading 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Registrando...' : 'Registrar Entrada'}
            </button>
          </form>

          {mensaje.texto && (
            <div className={`mt-4 p-3 rounded-md text-sm ${
              mensaje.tipo === 'error' 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {mensaje.texto}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Solo se registrará la hora de entrada. No olvides registrar tu salida
              !Excelente dia!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}