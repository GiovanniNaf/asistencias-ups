'use client';
import { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Toaster, toast } from 'react-hot-toast';
import { adminFetch } from '@/lib/admin-client';
import { Tarjeta } from '@/components/Marca';

interface Asistencia {
  id: string;
  nombre: string;
  fecha: string;
  hora_entrada: string;
  hora_salida: string | null;
  distancia_m: number | null;
  distancia_salida_m: number | null;
}

const MOSTAZA: [number, number, number] = [232, 178, 58];
const VERDE: [number, number, number] = [31, 58, 30];
const CREMA: [number, number, number] = [247, 241, 227];

// 'YYYY-MM-DD' → 'dd/MM/yyyy' sin pasar por Date (evita corrimientos de zona horaria)
const formatoFecha = (iso: string) => iso.split('-').reverse().join('/');

const hoyMexico = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());

async function cargarLogo(): Promise<string | null> {
  try {
    const blob = await (await fetch('/tempenchile-logo.jpg')).blob();
    return await new Promise((resolve) => {
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result as string);
      lector.onerror = () => resolve(null);
      lector.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function ReporteAsistencias() {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const buscarAsistencias = async () => {
    if (!fechaInicio || !fechaFin) return toast.error('Debes seleccionar ambas fechas');
    if (fechaInicio > fechaFin) return toast.error('La fecha de inicio es posterior a la de fin');

    setIsLoading(true);
    try {
      const { asistencias } = await adminFetch<{ asistencias: Asistencia[] }>(
        `/api/admin/asistencia?desde=${fechaInicio}&hasta=${fechaFin}`,
      );
      setAsistencias(asistencias);
      toast.success(`${asistencias.length} asistencias encontradas`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const generarReportePDF = async () => {
    if (asistencias.length === 0) return toast.error('No hay datos para generar el reporte');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const ancho = doc.internal.pageSize.getWidth();
    const alto = doc.internal.pageSize.getHeight();
    const logo = await cargarLogo();

    // Encabezado con franja mostaza y logo
    doc.setFillColor(...MOSTAZA);
    doc.rect(0, 0, ancho, 32, 'F');
    if (logo) doc.addImage(logo, 'JPEG', 10, 4, 24, 24);
    doc.setTextColor(...VERDE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('REPORTE DE ASISTENCIAS', ancho / 2, 15, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Tempenchile Restaurante · Del ${formatoFecha(fechaInicio)} al ${formatoFecha(fechaFin)}`, ancho / 2, 23, {
      align: 'center',
    });

    autoTable(doc, {
      startY: 40,
      head: [['Nombre', 'Fecha', 'Hora Entrada', 'Hora Salida', 'Firma']],
      body: asistencias.map((a) => [a.nombre, formatoFecha(a.fecha), a.hora_entrada, a.hora_salida || '-', '']),
      headStyles: { fillColor: VERDE, textColor: MOSTAZA, fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: CREMA },
      bodyStyles: { fontSize: 8, cellPadding: 3, valign: 'middle', minCellHeight: 15, textColor: VERDE },
      columnStyles: {
        0: { cellWidth: 55, halign: 'left' },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 50 },
      },
      styles: { overflow: 'linebreak', halign: 'center' },
      margin: { left: 10, right: 10, bottom: 20 },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const c = data.cell;
          doc.setDrawColor(150);
          doc.setLineWidth(0.3);
          doc.line(c.x + 5, c.y + c.height - 5, c.x + c.width - 5, c.y + c.height - 5);
        }
      },
    });

    // Pie en todas las páginas
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Página ${i} de ${total}`, 10, alto - 10);
      doc.text(`Generado el ${formatoFecha(hoyMexico())}`, ancho - 10, alto - 10, { align: 'right' });
    }

    doc.output('dataurlnewwindow');
  };

  const campo = 'w-full rounded-xl border-2 border-crema-oscuro bg-white px-4 py-2.5 outline-none focus:border-mostaza';

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <h1 className="font-display text-2xl uppercase tracking-wide">Reporte de asistencias</h1>

      <Tarjeta className="p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Fecha de inicio</span>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={campo} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Fecha de fin</span>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className={campo} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={buscarAsistencias}
            disabled={isLoading}
            className="rounded-xl bg-verde px-5 py-2.5 font-bold text-mostaza disabled:opacity-50"
          >
            {isLoading ? 'Buscando…' : 'Buscar asistencias'}
          </button>
          <button
            onClick={generarReportePDF}
            disabled={asistencias.length === 0}
            className="rounded-xl bg-mostaza px-5 py-2.5 font-bold text-verde disabled:opacity-50"
          >
            Generar PDF
          </button>
        </div>
      </Tarjeta>

      {asistencias.length > 0 && (
        <Tarjeta className="overflow-hidden">
          <h2 className="px-5 pt-4 font-bold">Vista previa ({asistencias.length} registros)</h2>
          <div className="overflow-x-auto p-2">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-verde/60">
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Entrada</th>
                  <th className="px-3 py-2">Salida</th>
                  <th className="px-3 py-2">Distancia</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-crema-oscuro">
                {asistencias.map((a) => (
                  <tr key={a.id}>
                    <td className="px-3 py-2 font-semibold">{a.nombre}</td>
                    <td className="px-3 py-2">{formatoFecha(a.fecha)}</td>
                    <td className="px-3 py-2 tabular-nums">{a.hora_entrada}</td>
                    <td className="px-3 py-2 tabular-nums">{a.hora_salida || '-'}</td>
                    <td className="px-3 py-2 text-verde/70 tabular-nums">
                      {a.distancia_m != null ? `${a.distancia_m} m` : '-'}
                      {a.distancia_salida_m != null && ` / ${a.distancia_salida_m} m`}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          a.hora_salida ? 'bg-hoja/15 text-hoja' : 'bg-chile/15 text-chile'
                        }`}
                      >
                        {a.hora_salida ? 'Completa' : 'Incompleta'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tarjeta>
      )}
    </div>
  );
}
