/* eslint-disable @typescript-eslint/prefer-as-const */
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Toaster, toast } from 'react-hot-toast';

interface Asistencia {
  id: string;
  nombre: string;
  fecha: string;
  hora_entrada: string;
  hora_salida: string | null;
}

export default function ReporteAsistencias() {
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Función para ajustar la fecha a la zona horaria de México
  const ajustarFechaMexico = (fechaISO: string) => {
    const fecha = new Date(fechaISO + 'T12:00:00Z'); // Mediodía UTC
    const offsetMexico = fecha.getTimezoneOffset() + (fecha.getTimezoneOffset() > 0 ? 360 : 300);
    fecha.setMinutes(fecha.getMinutes() + offsetMexico);
    return fecha;
  };

  // Formatear fecha en formato dd/MM/yyyy para México
  const formatFechaMexico = (fechaISO: string) => {
    const fecha = ajustarFechaMexico(fechaISO);
    return format(fecha, 'dd/MM/yyyy');
  };

  // Formatear fecha larga para Méxi

  const buscarAsistencias = async () => {
    if (!fechaInicio || !fechaFin) {
      toast.error('Debes seleccionar ambas fechas');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('asistencia')
        .select('*')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha', { ascending: true })
        .order('hora_entrada', { ascending: true });

      if (error) throw error;

      setAsistencias(data || []);
      toast.success(`${data?.length || 0} asistencias encontradas`);
    } catch (error) {
      toast.error('Error al cargar las asistencias');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const generarReportePDF = () => {
    if (asistencias.length === 0) {
      toast.error('No hay datos para generar el reporte');
      return;
    }
  
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });
  
    // Configuración del documento
    doc.setFont('helvetica');
    
    // Título del reporte
    doc.setFontSize(16);
    doc.text('REPORTE DE ASISTENCIAS', 105, 20, { align: 'center' });
    
    // Subtítulo con rango de fechas
    doc.setFontSize(12);
    doc.text(
      `Del ${formatFechaMexico(fechaInicio)} al ${formatFechaMexico(fechaFin)}`,
      105,
      30,
      { align: 'center' }
    );
  
    // Estadísticas resumidas
    doc.setFontSize(10);
    doc.text(`Total de registros: ${asistencias.length}`, 20, 40);
    
    // Configuración común para las tablas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableConfig: any = { // Usamos 'any' temporalmente para evitar el error de tipos
      startY: 45,
      head: [['Nombre', 'Fecha', 'Entrada', 'Salida']],
      body: asistencias.map(asistencia => [
        asistencia.nombre,
        formatFechaMexico(asistencia.fecha),
        asistencia.hora_entrada,
        asistencia.hora_salida || '-'
      ]),
      headStyles: {
        fillColor: [59, 130, 246], // Azul
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2,
        valign: 'middle'
      },
      margin: { top: 45 },
      columnStyles: {
        0: { cellWidth: 50 }, // Nombre
        1: { cellWidth: 25 }, // Fecha
        2: { cellWidth: 25 }, // Hora Entrada
        3: { cellWidth: 25 }  // Hora Salida
      },
      styles: {
        overflow: 'linebreak' as 'linebreak', // Solución específica para el error
        halign: 'center'
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didDrawPage: (data: any) => {
        // Pie de página en cada página
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(
          `Página ${data.pageNumber}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      }
    };
  
    // Generar la tabla
    autoTable(doc, tableConfig);
  
    // Pie de documento
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Generado el ${formatFechaMexico(new Date().toISOString().split('T')[0])}`,
      105,
      doc.internal.pageSize.height - 20,
      { align: 'center' }
    );
  
    // Guardar el PDF
    doc.save(`Reporte_Asistencias_${formatFechaMexico(fechaInicio)}_a_${formatFechaMexico(fechaFin)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Reporte de Asistencias</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={buscarAsistencias}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Buscando...' : 'Buscar Asistencias'}
          </button>

          <button
            onClick={generarReportePDF}
            disabled={asistencias.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generar PDF
          </button>
        </div>

        {asistencias.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Vista Previa ({asistencias.length} registros)
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Entrada</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Salida</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {asistencias.map((asistencia) => (
                    <tr key={asistencia.id}>
                      <td className="px-4 py-2">{asistencia.nombre}</td>
                      <td className="px-4 py-2">{formatFechaMexico(asistencia.fecha)}</td>
                      <td className="px-4 py-2">{asistencia.hora_entrada}</td>
                      <td className="px-4 py-2">{asistencia.hora_salida || '-'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          asistencia.hora_salida 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {asistencia.hora_salida ? 'Completa' : 'Incompleta'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}