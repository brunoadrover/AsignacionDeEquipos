
import React, { useMemo, useState } from 'react';
import { EquipmentRequest, RequestStatus } from '../types';
import { FileDown, MapPin, Undo2, CheckCircle, Archive, AlertTriangle, Pencil, Trash2, X, Save } from 'lucide-react';
import { Button } from './Button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportViewProps {
  requests: EquipmentRequest[];
  status: RequestStatus;
  title: string;
  onReturnToPending?: (id: string) => void;
  onMarkCompleted?: (id: string) => void;
  onUpdateRequest?: (id: string, updates: Partial<EquipmentRequest>) => void;
  onDeleteRequest?: (id: string) => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ 
  requests, 
  status, 
  title, 
  onReturnToPending,
  onMarkCompleted,
  onUpdateRequest,
  onDeleteRequest
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<EquipmentRequest>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const groupedData = useMemo(() => {
    const filtered = requests.filter(r => r.status === status);
    return filtered.reduce((groups, req) => {
      // Fix: Use uo_nombre instead of non-existent uo property
      const uo = req.uo_nombre || 'Sin Unidad Operativa';
      if (!groups[uo]) groups[uo] = [];
      groups[uo].push(req);
      return groups;
    }, {} as Record<string, EquipmentRequest[]>);
  }, [requests, status]);

  const hasData = Object.keys(groupedData).length > 0;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString().replace(/\//g, '-');
    doc.setFontSize(18);
    doc.text(`Reporte: ${title}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 14, 28);
    let yPos = 35;
    (Object.entries(groupedData) as [string, EquipmentRequest[]][]).forEach(([uo, items]) => {
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text(`Unidad Operativa: ${uo}`, 14, yPos);
      yPos += 5;
      const isOwn = status === RequestStatus.OWN;
      const isRent = status === RequestStatus.RENT;
      const isBuy = status === RequestStatus.BUY;
      const isCompleted = status === RequestStatus.COMPLETED;
      let head: string[][] = [];
      if (isOwn) head = [['Descripción', 'Cant', 'Fecha Nec.', 'Interno', 'Marca', 'Modelo', 'Disp.']];
      else if (isRent) head = [['Descripción', 'Capacidad', 'Cantidad', 'Fecha Nec.', 'Plazo (Meses)', 'Comentarios']];
      else if (isBuy) head = [['Descripción', 'Proveedor', 'Fecha Entrega', 'Cant', 'Fecha Nec.', 'Comentarios / Alertas']];
      else if (isCompleted) head = [['Descripción', 'Origen', 'Detalle', 'Cant', 'Fecha Cierre']];
      else head = [['Descripción', 'Capacidad', 'Cantidad', 'Fecha Nec.', 'Solicitud', 'Comentarios']];
      const body = items.map(req => {
        if (isOwn && req.ownDetails) return [req.description, req.quantity.toString(), req.needDate, req.ownDetails.internalId, req.ownDetails.brand, req.ownDetails.model, req.ownDetails.availabilityDate];
        else if (isRent) return [req.description, req.capacity, req.quantity.toString(), req.needDate, req.rentalDuration ? `${req.rentalDuration} meses` : '-', req.comments];
        else if (isBuy) return [req.description, req.buyDetails?.vendor || '-', req.buyDetails?.deliveryDate || '-', req.quantity.toString(), req.needDate, req.comments || ''];
        else if (isCompleted) {
            let origin = req.fulfillmentType === RequestStatus.OWN ? 'Propio' : (req.fulfillmentType === RequestStatus.RENT ? 'Alquiler' : 'Compra');
            let details = req.ownDetails ? `Int: ${req.ownDetails.internalId}` : (req.buyDetails ? `Prov: ${req.buyDetails.vendor}` : req.comments);
            return [req.description, origin, details, req.quantity.toString(), new Date().toLocaleDateString()];
        }
        return [req.description, req.capacity, req.quantity.toString(), req.needDate, req.requestDate, req.comments];
      });
      autoTable(doc, { startY: yPos, head: head, body: body, theme: 'striped', headStyles: { fillColor: isOwn ? [27, 77, 62] : (isBuy ? [220, 38, 38] : (isCompleted ? [71, 85, 105] : [217, 119, 6])) }, styles: { fontSize: 9 } });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    });
    
    doc.save(`Reporte_${title.replace(/\s+/g, '_')}_${dateStr}.pdf`);
  };

  const startEditing = (req: EquipmentRequest) => { setEditingId(req.id); setEditValues({ ...req }); };
  const cancelEditing = () => { setEditingId(null); setEditValues({}); };
  const saveEditing = (id: string) => { onUpdateRequest?.(id, editValues); setEditingId(null); };
  const confirmReturn = (id: string) => { onDeleteRequest?.(id); setDeletingId(null); };

  // Improved high-contrast input classes
  const inputClasses = "w-full border rounded p-1 text-xs bg-white text-slate-900 border-slate-300 focus:ring-1 focus:ring-blue-500 focus:outline-none";

  if (!hasData) return (<div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-lg shadow-sm border border-slate-200"><Archive size={48} className="mb-2 opacity-20" /><p className="text-lg font-medium">No hay equipos en la lista "{title}"</p></div>);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div><h2 className="text-2xl font-bold text-slate-800">{title}</h2><p className="text-slate-500 text-sm mt-1">Agrupado por Unidad Operativa</p></div>
        <Button onClick={handleExportPDF} variant="outline" className="flex items-center gap-2"><FileDown size={18} /> Exportar PDF</Button>
      </div>

      <div className="space-y-8">
        {(Object.entries(groupedData) as [string, EquipmentRequest[]][]).map(([uo, items]) => (
          <div key={uo} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center gap-2"><MapPin size={18} className="text-slate-500" /><h3 className="font-semibold text-slate-700">{uo}</h3><span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{items.length} ítems</span></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-3">Descripción</th>
                    <th className="px-6 py-3">{status === RequestStatus.COMPLETED ? 'Gestión' : 'Capacidad'}</th>
                    <th className="px-6 py-3">Cant.</th>
                    <th className="px-6 py-3">Fecha Nec.</th>
                    {status === RequestStatus.OWN && <><th className="px-6 py-3 bg-emerald-50 text-emerald-700">Interno</th><th className="px-6 py-3 bg-emerald-50 text-emerald-700">Marca/Modelo</th><th className="px-6 py-3 bg-emerald-50 text-emerald-700">Disp.</th></>}
                    {status === RequestStatus.RENT && <><th className="px-6 py-3 bg-amber-50 text-amber-700">Plazo (Meses)</th><th className="px-6 py-3">Comentarios</th></>}
                    {status === RequestStatus.BUY && <th className="px-6 py-3">Comentarios / Alertas</th>}
                    {status === RequestStatus.COMPLETED && <th className="px-6 py-3">Detalle Cierre</th>}
                    {status !== RequestStatus.COMPLETED && <th className="px-6 py-3 text-center w-40">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((req) => {
                    const isEditing = editingId === req.id;
                    const isDeleting = deletingId === req.id;
                    return (
                      <tr key={req.id} className={`border-b hover:bg-slate-50 transition-colors ${isEditing ? 'bg-emerald-50/30' : ''}`}>
                        {/* Fix: Use categoria_nombre instead of non-existent category property */}
                        <td className="px-6 py-4 font-medium text-slate-900">{req.description}<div className="text-xs text-slate-400 font-normal">{req.categoria_nombre}</div></td>
                        <td className="px-6 py-4">{status === RequestStatus.COMPLETED ? <span className="text-xs bg-slate-100 p-1 rounded font-semibold text-slate-700">{req.fulfillmentType}</span> : req.capacity}</td>
                        <td className="px-6 py-4">{isEditing ? <input type="number" className={inputClasses + " w-16"} value={editValues.quantity} onChange={e => setEditValues({...editValues, quantity: parseInt(e.target.value)})}/> : req.quantity}</td>
                        <td className="px-6 py-4">{isEditing ? <input type="date" className={inputClasses} value={editValues.needDate} onChange={e => setEditValues({...editValues, needDate: e.target.value})}/> : req.needDate}</td>
                        
                        {status === RequestStatus.OWN && <>
                          <td className="px-6 py-4 font-mono text-emerald-700 font-bold">{req.ownDetails?.internalId}</td>
                          <td className="px-6 py-4 text-xs font-medium">{req.ownDetails?.brand} {req.ownDetails?.model}</td>
                          <td className="px-6 py-4">{isEditing ? <input type="date" className={inputClasses} value={editValues.ownDetails?.availabilityDate} onChange={e => setEditValues({...editValues, ownDetails: {...editValues.ownDetails!, availabilityDate: e.target.value}})}/> : req.ownDetails?.availabilityDate}</td>
                        </>}

                        {status === RequestStatus.RENT && <>
                          <td className="px-6 py-4">{isEditing ? <input type="number" className={inputClasses + " w-16 font-bold"} value={editValues.rentalDuration} onChange={e => setEditValues({...editValues, rentalDuration: parseInt(e.target.value)})}/> : <span className="font-bold text-amber-800">{req.rentalDuration}</span>}</td>
                          <td className="px-6 py-4">{isEditing ? <textarea className={inputClasses} value={editValues.comments} onChange={e => setEditValues({...editValues, comments: e.target.value})}/> : <span className="text-slate-600 text-xs italic">{req.comments || '-'}</span>}</td>
                        </>}

                        {status === RequestStatus.BUY && <td className="px-6 py-4">{isEditing ? <textarea className={inputClasses} value={editValues.comments} onChange={e => setEditValues({...editValues, comments: e.target.value})}/> : <span className="text-slate-600 text-xs italic">{req.comments || '-'}</span>}</td>}

                        {status !== RequestStatus.COMPLETED && (
                          <td className="px-6 py-4">
                            {isDeleting ? (
                              <div className="flex flex-col items-center gap-1 animate-in zoom-in">
                                <span className="text-[10px] font-bold text-red-600 uppercase">¿A Pendiente?</span>
                                <div className="flex gap-2">
                                  <button onClick={() => confirmReturn(req.id)} className="bg-red-600 text-white p-1 rounded-md hover:bg-red-700 transition-colors"><CheckCircle size={14} /></button>
                                  <button onClick={() => setDeletingId(null)} className="bg-slate-200 text-slate-600 p-1 rounded-md hover:bg-slate-300 transition-colors"><X size={14} /></button>
                                </div>
                              </div>
                            ) : isEditing ? (
                              <div className="flex justify-center gap-2">
                                <button onClick={() => saveEditing(req.id)} className="text-emerald-600 p-1.5 hover:bg-emerald-100 rounded-full transition-colors" title="Guardar"><Save size={18} /></button>
                                <button onClick={cancelEditing} className="text-slate-400 p-1.5 hover:bg-slate-200 rounded-full transition-colors" title="Cancelar"><X size={18} /></button>
                              </div>
                            ) : (
                              <div className="flex justify-center gap-1">
                                <button onClick={() => startEditing(req)} className="text-slate-400 hover:text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-full transition-colors" title="Editar"><Pencil size={18} /></button>
                                <button onClick={() => onMarkCompleted?.(req.id)} className="text-slate-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-full transition-colors" title="Cumplido"><CheckCircle size={18} /></button>
                                <button onClick={() => setDeletingId(req.id)} className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-full transition-colors" title="Revertir a Pendiente"><Trash2 size={18} /></button>
                                <button onClick={() => onReturnToPending?.(req.id)} className="text-slate-400 hover:text-amber-600 p-1.5 hover:bg-amber-50 rounded-full transition-colors" title="Devolver"><Undo2 size={18} /></button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
