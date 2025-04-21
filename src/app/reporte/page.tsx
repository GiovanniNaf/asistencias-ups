
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
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
      orientation: 'portrait', // Cambiado a horizontal para mejor espacio
      unit: 'mm',
      format: 'letter'
    });
  
    // Configuración del documento
    doc.setFont('helvetica');
    
    // Título del reporte
    doc.setFontSize(16);
    doc.text('REPORTE DE ASISTENCIAS', 100, 20, { align: 'center' }); // Centrado en landscape
    
    // Subtítulo con rango de fechas
    doc.setFontSize(12);
    doc.text(
      `Del ${formatFechaMexico(fechaInicio)} al ${formatFechaMexico(fechaFin)}`,
      100,
      30,
      { align: 'center' }
    );
  
    const tableConfig: UserOptions = {
      startY: 40,
      head: [['Nombre', 'Fecha', 'Hora Entrada', 'Hora Salida', 'Firma']],
      body: asistencias.map(asistencia => [
        asistencia.nombre,
        formatFechaMexico(asistencia.fecha),
        asistencia.hora_entrada,
        asistencia.hora_salida || '-',
        { content: '', styles: { cellWidth: 40 } }
      ]),
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        valign: 'middle',
        minCellHeight: 15
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 40 }
      },
      styles: {
        overflow: 'linebreak',
        halign: 'center'
      },
      margin: { left: 10, right: 10 }, // Márgenes para centrado y buen uso de espacio
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didDrawCell: (data: any) => {
        if (data.column.index === 4 && data.row.index >= 0) {
          const cell = data.cell;
          doc.setDrawColor(150);
          doc.setLineWidth(0.3);
          doc.line(
            cell.x + 5,
            cell.y + cell.height - 5,
            cell.x + cell.width - 5,
            cell.y + cell.height - 5
          );
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didDrawPage: (data: any) => {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(
          `Página ${data.pageNumber} de ${data.pageCount}`,
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
      148,
      doc.internal.pageSize.height - 20,
      { align: 'center' }
    );
  
    // Guardar el PDF
    doc.output('dataurlnewwindow');
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