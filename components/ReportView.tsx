import React, { useMemo, useState } from 'react';
import { EquipmentRequest, RequestStatus, Categoria, UnidadOperativa } from '../types';
import { FileDown, MapPin, Undo2, CheckCircle, Archive, AlertTriangle, Pencil, Trash2, X, Save, Search, Filter, ClipboardCheck, Key, ShoppingCart, Calendar } from 'lucide-react';
import { Button } from './Button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportViewProps {
  requests: EquipmentRequest[];
  status: RequestStatus;
  title: string;
  categories?: Categoria[];
  uos?: UnidadOperativa[];
  hideHeader?: boolean;
  compact?: boolean;
  globalFilters?: {
      searchTerm: string;
      categoryFilter: string;
      uoFilter: string;
  };
  onReturnToPending?: (id: string) => void;
  onMarkCompleted?: (id: string) => void;
  onUpdateRequest?: (id: string, updates: Partial<EquipmentRequest>) => void;
  onDeleteRequest?: (id: string) => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ 
  requests, 
  status, 
  title, 
  categories = [],
  uos = [],
  hideHeader = false,
  compact = false,
  globalFilters,
  onReturnToPending,
  onMarkCompleted,
  onUpdateRequest,
  onDeleteRequest
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<EquipmentRequest>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [localSearch, setLocalSearch] = useState('');
  const [localCategory, setLocalCategory] = useState('');
  const [localUo, setLocalUo] = useState('');

  const searchTerm = globalFilters ? globalFilters.searchTerm : localSearch;
  const categoryFilter = globalFilters ? globalFilters.categoryFilter : localCategory;
  const uoFilter = globalFilters ? globalFilters.uoFilter : localUo;

  const groupedData = useMemo(() => {
    const filtered = requests.filter(r => {
      if (r.status !== status) return false;
      
      const matchesSearch = 
        searchTerm === '' || 
        r.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.ownDetails?.internalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.uo_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === '' || r.categoria_id === categoryFilter;
      const matchesUO = uoFilter === '' || r.uo_id === uoFilter;

      return matchesSearch && matchesCategory && matchesUO;
    });

    return filtered.reduce((groups, req) => {
      const uo = req.uo_nombre || 'Sin Unidad Operativa';
      if (!groups[uo]) groups[uo] = [];
      groups[uo].push(req);
      return groups;
    }, {} as Record<string, EquipmentRequest[]>);
  }, [requests, status, searchTerm, categoryFilter, uoFilter]);

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
      else if (isRent) head = [['Descripción', 'Capacidad', 'Cantidad', 'Fecha Nec.', 'Plazo', 'Comentarios']];
      else if (isBuy) head = [['Descripción', 'Proveedor', 'Fecha Entrega', 'Cant', 'Fecha Nec.', 'Comentarios']];
      else if (isCompleted) head = [['Descripción', 'Origen', 'Detalle', 'Cant', 'Fecha Cierre']];
      else head = [['Descripción', 'Capacidad', 'Cantidad', 'Fecha Nec.', 'Solicitud', 'Comentarios']];
      
      const body = items.map(req => {
        if (isOwn && req.ownDetails) return [req.description, req.quantity.toString(), req.needDate, req.ownDetails.internalId, req.ownDetails.brand, req.ownDetails.model, req.ownDetails.availabilityDate];
        else if (isRent) return [req.description, req.capacity, req.quantity.toString(), req.needDate, `${req.rentalDuration} meses`, req.comments];
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

  const inputClasses = "w-full border rounded p-1 text-xs bg-white text-slate-900 border-slate-300 focus:ring-1 focus:ring-blue-500 focus:outline-none";

  const statusColors = {
      [RequestStatus.OWN]: "bg-emerald-50/50 border-emerald-200 text-emerald-900",
      [RequestStatus.BUY]: "bg-red-50/50 border-red-200 text-red-900",
      [RequestStatus.RENT]: "bg-amber-50/50 border-amber-200 text-amber-900",
      [RequestStatus.COMPLETED]: "bg-slate-100 border-slate-200 text-slate-900"
  };

  return (
    <div className={`space-y-4 animate-in fade-in duration-500`}>
      {!hideHeader && (
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
            <p className="text-slate-500 text-sm mt-1">Gestión agrupada por Unidad Operativa</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-48">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <select className="pl-9 pr-4 py-2 border rounded-md text-sm w-full bg-white text-slate-900 border-slate-300 appearance-none" value={localUo} onChange={(e) => setLocalUo(e.target.value)}>
                    <option value="">Todas las UO</option>
                    {uos.map(uo => <option key={uo.id} value={uo.id}>{uo.nombre}</option>)}
                </select>
            </div>
            <div className="relative w-full sm:w-48">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <select className="pl-9 pr-4 py-2 border rounded-md text-sm w-full bg-white text-slate-900 border-slate-300 appearance-none" value={localCategory} onChange={(e) => setLocalCategory(e.target.value)}>
                    <option value="">Todas las Categorías</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
            </div>
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Buscar..." className="pl-10 pr-4 py-2 border rounded-md text-sm w-full bg-white text-slate-900 border-slate-300" value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} />
            </div>
            <Button onClick={handleExportPDF} variant="outline" size="md" className="flex items-center gap-2 whitespace-nowrap w-full sm:w-auto"><FileDown size={18} /> Exportar PDF</Button>
            </div>
        </div>
      )}

      <div className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden`}>
        {hideHeader && (
          <div className={`p-4 border-b flex items-center justify-between ${statusColors[status] || 'bg-slate-50'}`}>
            <h3 className="text-md font-bold flex items-center gap-2 uppercase tracking-wide">
                {status === RequestStatus.OWN && <Key size={18} className="text-emerald-600" />}
                {status === RequestStatus.BUY && <ShoppingCart size={18} className="text-red-600" />}
                {status === RequestStatus.RENT && <Calendar size={18} className="text-amber-600" />}
                {title}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold border border-current opacity-70">
                {Object.values(groupedData).flat().length} ítems
            </span>
          </div>
        )}

        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Archive size={40} className="mb-2 opacity-10" />
            <p className="text-sm">Sin registros que coincidan con los filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-3">UO / Descripción</th>
                  <th className="px-6 py-3">{status === RequestStatus.COMPLETED ? 'Gestión' : 'Detalle'}</th>
                  <th className="px-6 py-3">Cant.</th>
                  <th className="px-6 py-3">F. Nec.</th>
                  {status === RequestStatus.OWN && <><th className="px-6 py-3 bg-emerald-50 text-emerald-700">Interno</th><th className="px-6 py-3 bg-emerald-50 text-emerald-700">Marca/Modelo</th><th className="px-6 py-3 bg-emerald-50 text-emerald-700">Disp.</th></>}
                  {status === RequestStatus.RENT && <><th className="px-6 py-3 bg-amber-50 text-amber-700">Plazo</th><th className="px-6 py-3">Comentarios</th></>}
                  {status === RequestStatus.BUY && <th className="px-6 py-3">Comentarios</th>}
                  {status === RequestStatus.COMPLETED && <th className="px-6 py-3">Detalle Cierre</th>}
                  {status !== RequestStatus.COMPLETED && <th className="px-6 py-3 text-center">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {(Object.entries(groupedData) as [string, EquipmentRequest[]][]).map(([uo, items]) => (
                    <React.Fragment key={uo}>
                        {items.map((req, idx) => {
                            const isEditing = editingId === req.id;
                            const isDeleting = deletingId === req.id;
                            return (
                                <tr key={req.id} className={`border-b hover:bg-slate-50 transition-colors ${isEditing ? 'bg-emerald-50/30' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{uo}</div>
                                        <div className="font-medium text-slate-900">{req.description}</div>
                                        <div className="text-[10px] text-slate-400 font-normal uppercase">{req.categoria_nombre}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {status === RequestStatus.COMPLETED ? (
                                        <span className={`text-[10px] p-1 rounded font-bold uppercase ${
                                            req.fulfillmentType === RequestStatus.OWN ? 'bg-emerald-100 text-emerald-800' :
                                            req.fulfillmentType === RequestStatus.RENT ? 'bg-amber-100 text-amber-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {req.fulfillmentType === RequestStatus.OWN ? 'Propio' : (req.fulfillmentType === RequestStatus.RENT ? 'Alquiler' : 'Compra')}
                                        </span>
                                        ) : req.capacity}
                                    </td>
                                    <td className="px-6 py-4 font-semibold">{isEditing ? <input type="number" className={inputClasses + " w-16"} value={editValues.quantity} onChange={e => setEditValues({...editValues, quantity: parseInt(e.target.value)})}/> : req.quantity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{isEditing ? <input type="date" className={inputClasses} value={editValues.needDate} onChange={e => setEditValues({...editValues, needDate: e.target.value})}/> : req.needDate}</td>
                                    
                                    {status === RequestStatus.OWN && <>
                                        <td className="px-6 py-4 font-mono text-emerald-700 font-bold">{req.ownDetails?.internalId}</td>
                                        <td className="px-6 py-4 text-xs font-medium">{req.ownDetails?.brand} {req.ownDetails?.model}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{isEditing ? <input type="date" className={inputClasses} value={editValues.ownDetails?.availabilityDate} onChange={e => setEditValues({...editValues, ownDetails: {...editValues.ownDetails!, availabilityDate: e.target.value}})}/> : req.ownDetails?.availabilityDate}</td>
                                    </>}

                                    {status === RequestStatus.RENT && <>
                                        <td className="px-6 py-4 font-bold text-amber-800">{isEditing ? <input type="number" className={inputClasses + " w-16"} value={editValues.rentalDuration} onChange={e => setEditValues({...editValues, rentalDuration: parseInt(e.target.value)})}/> : `${req.rentalDuration} m`}</td>
                                        <td className="px-6 py-4">{isEditing ? <textarea className={inputClasses} value={editValues.comments} onChange={e => setEditValues({...editValues, comments: e.target.value})}/> : <span className="text-slate-600 text-[10px] italic">{req.comments || '-'}</span>}</td>
                                    </>}

                                    {status === RequestStatus.BUY && <td className="px-6 py-4">{isEditing ? <textarea className={inputClasses} value={editValues.comments} onChange={e => setEditValues({...editValues, comments: e.target.value})}/> : <span className="text-slate-600 text-[10px] italic">{req.comments || '-'}</span>}</td>}
                                    
                                    {status === RequestStatus.COMPLETED && (
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-slate-600">
                                            {req.ownDetails ? `Interno: #${req.ownDetails.internalId}` : (req.buyDetails ? `Prov: ${req.buyDetails.vendor}` : (req.comments || 'Cierre de gestión'))}
                                            </div>
                                        </td>
                                    )}

                                    {status !== RequestStatus.COMPLETED && (
                                        <td className="px-6 py-4">
                                        {isDeleting ? (
                                            <div className="flex flex-col items-center gap-1">
                                            <span className="text-[10px] font-bold text-red-600 uppercase">¿Revertir?</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => confirmReturn(req.id)} className="bg-red-600 text-white p-1 rounded-md"><CheckCircle size={14} /></button>
                                                <button onClick={() => setDeletingId(null)} className="bg-slate-200 text-slate-600 p-1 rounded-md"><X size={14} /></button>
                                            </div>
                                            </div>
                                        ) : isEditing ? (
                                            <div className="flex justify-center gap-2">
                                            <button onClick={() => saveEditing(req.id)} className="text-emerald-600 p-1 hover:bg-emerald-100 rounded-full" title="Guardar"><Save size={18} /></button>
                                            <button onClick={cancelEditing} className="text-slate-400 p-1 hover:bg-slate-200 rounded-full" title="Cancelar"><X size={18} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-center gap-0.5">
                                            <button onClick={() => startEditing(req)} className="text-slate-400 hover:text-emerald-600 p-1 hover:bg-emerald-50 rounded-full" title="Editar"><Pencil size={18} /></button>
                                            <button 
                                                onClick={() => onMarkCompleted?.(req.id)} 
                                                className="text-emerald-500 hover:text-emerald-700 p-1 hover:bg-emerald-50 rounded-full transition-all" 
                                                title="Marcar COMPLETADO"
                                            >
                                                <ClipboardCheck size={20} />
                                            </button>
                                            <button onClick={() => setDeletingId(req.id)} className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-full" title="Borrar y volver a Pendiente"><Trash2 size={18} /></button>
                                            <button onClick={() => onReturnToPending?.(req.id)} className="text-slate-400 hover:text-amber-600 p-1 hover:bg-amber-50 rounded-full" title="Devolver a pendientes"><Undo2 size={18} /></button>
                                            </div>
                                        )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};