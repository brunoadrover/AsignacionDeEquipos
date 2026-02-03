import React, { useMemo } from 'react';
import { BuyDetails, EquipmentRequest, RequestStatus } from '../types';
import { FileDown, MapPin, Undo2, CheckCircle, Archive, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportViewProps {
  requests: EquipmentRequest[];
  status: RequestStatus;
  title: string;
  onReturnToPending?: (id: string) => void;
  onMarkCompleted?: (id: string) => void;
  onUpdateBuyDetails?: (id: string, details: Partial<BuyDetails>) => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ 
  requests, 
  status, 
  title, 
  onReturnToPending,
  onMarkCompleted,
  onUpdateBuyDetails
}) => {
  
  // Filter and Group Data
  const groupedData = useMemo(() => {
    const filtered = requests.filter(r => r.status === status);
    
    // Group by UO
    return filtered.reduce((groups, req) => {
      const uo = req.uo;
      if (!groups[uo]) {
        groups[uo] = [];
      }
      groups[uo].push(req);
      return groups;
    }, {} as Record<string, EquipmentRequest[]>);
  }, [requests, status]);

  const hasData = Object.keys(groupedData).length > 0;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text(`Reporte: ${title}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 14, 28);

    let yPos = 35;

    Object.entries(groupedData).forEach(([uo, items]) => {
      const requestItems = items as EquipmentRequest[];
      // Section Title (UO)
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text(`Unidad Operativa: ${uo}`, 14, yPos);
      yPos += 5;

      // Define columns based on status
      const isOwn = status === RequestStatus.OWN;
      const isRent = status === RequestStatus.RENT;
      const isBuy = status === RequestStatus.BUY;
      const isCompleted = status === RequestStatus.COMPLETED;
      
      let head: string[][] = [];
      
      if (isOwn) {
        head = [['Descripción', 'Cant', 'Fecha Nec.', 'Interno', 'Marca', 'Modelo', 'Disp.']];
      } else if (isRent) {
        head = [['Descripción', 'Capacidad', 'Cantidad', 'Fecha Nec.', 'Plazo (Meses)', 'Comentarios']];
      } else if (isBuy) {
        head = [['Descripción', 'Proveedor', 'Fecha Entrega', 'Cant', 'Fecha Nec.', 'Comentarios / Alertas']];
      } else if (isCompleted) {
        head = [['Descripción', 'Origen', 'Detalle', 'Cant', 'Fecha Cierre']];
      } else {
        head = [['Descripción', 'Capacidad', 'Cantidad', 'Fecha Nec.', 'Solicitud', 'Comentarios']];
      }

      const body = requestItems.map(req => {
        if (isOwn && req.ownDetails) {
            return [
                req.description,
                req.quantity.toString(),
                req.needDate,
                req.ownDetails.internalId,
                req.ownDetails.brand,
                req.ownDetails.model,
                req.ownDetails.availabilityDate
            ];
        } else if (isRent) {
             return [
                req.description,
                req.capacity,
                req.quantity.toString(),
                req.needDate,
                req.rentalDuration ? `${req.rentalDuration} meses` : '-',
                req.comments
            ];
        } else if (isBuy) {
            const buy = req.buyDetails || { vendor: '-', deliveryDate: '-' };
            let commentsField = req.comments || '';

            // Check for late delivery warning logic
            if (buy.deliveryDate && buy.deliveryDate > req.needDate) {
                 const alertMsg = "ALERTA: Entrega posterior a necesidad. Negociar fecha o alquiler temp.";
                 commentsField = commentsField ? `${commentsField}\n\n[${alertMsg}]` : `[${alertMsg}]`;
            }

            return [
               req.description,
               buy.vendor || '-',
               buy.deliveryDate || '-',
               req.quantity.toString(),
               req.needDate,
               commentsField
           ];
        } else if (isCompleted) {
            let origin = 'Compra';
            if (req.fulfillmentType === RequestStatus.OWN) origin = 'Propio';
            if (req.fulfillmentType === RequestStatus.RENT) origin = 'Alquiler';
            
            let details = req.comments;
            if (req.fulfillmentType === RequestStatus.OWN && req.ownDetails) details = `Int: ${req.ownDetails.internalId}`;
            if (req.fulfillmentType === RequestStatus.BUY && req.buyDetails) details = `Prov: ${req.buyDetails.vendor}`;
            
            return [
                req.description,
                origin,
                details,
                req.quantity.toString(),
                new Date().toLocaleDateString() // Simplification for PDF
            ];
        } else {
            return [
                req.description,
                req.capacity,
                req.quantity.toString(),
                req.needDate,
                req.requestDate,
                req.comments
            ];
        }
      });

      autoTable(doc, {
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { 
            fillColor: isOwn ? [5, 150, 105] : 
                       (status === RequestStatus.BUY ? [220, 38, 38] : 
                       (isCompleted ? [71, 85, 105] : [217, 119, 6])) 
        },
        styles: { fontSize: 9 },
        margin: { bottom: 10 }
      });

      // Update Y position for next group
      // @ts-ignore - autoTable adds lastAutoTable to the doc object
      yPos = doc.lastAutoTable.finalY + 15;
    });

    doc.save(`Reporte_${title.replace(/\s+/g, '_')}.pdf`);
  };

  const getOriginLabel = (type?: RequestStatus) => {
    switch (type) {
        case RequestStatus.OWN: return <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">Propio</span>;
        case RequestStatus.RENT: return <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">Alquiler</span>;
        case RequestStatus.BUY: return <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded border border-red-200">Compra</span>;
        default: return <span className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">Desconocido</span>;
    }
  };

  if (!hasData) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-lg shadow-sm border border-slate-200">
            <Archive size={48} className="mb-2 opacity-20" />
            <p className="text-lg font-medium">No hay equipos en la lista "{title}"</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
          <p className="text-slate-500 text-sm mt-1">
             Agrupado por Unidad Operativa
          </p>
        </div>
        <Button onClick={handleExportPDF} variant="outline" className="flex items-center gap-2">
          <FileDown size={18} />
          Exportar PDF
        </Button>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedData).map(([uo, items]) => {
          const requestItems = items as EquipmentRequest[];
          return (
            <div key={uo} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center gap-2">
                <MapPin size={18} className="text-slate-500" />
                <h3 className="font-semibold text-slate-700">{uo}</h3>
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                  {requestItems.length} ítems
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                    <tr>
                      <th className="px-6 py-3">Descripción</th>
                      
                      {status === RequestStatus.BUY && (
                          <>
                             <th className="px-6 py-3 bg-red-50 text-red-700">Proveedor</th>
                             <th className="px-6 py-3 bg-red-50 text-red-700">Fecha Entrega</th>
                          </>
                      )}

                      {status === RequestStatus.COMPLETED && (
                          <th className="px-6 py-3">Gestión</th>
                      )}
                      {status !== RequestStatus.COMPLETED && (
                          <th className="px-6 py-3">Capacidad</th>
                      )}
                      <th className="px-6 py-3">Cant.</th>
                      <th className="px-6 py-3">Fecha Nec.</th>
                      
                      {/* Dynamic Columns based on status */}
                      {status === RequestStatus.OWN ? (
                          <>
                            <th className="px-6 py-3 bg-emerald-50 text-emerald-700">Interno</th>
                            <th className="px-6 py-3 bg-emerald-50 text-emerald-700">Marca/Modelo</th>
                            <th className="px-6 py-3 bg-emerald-50 text-emerald-700">Hs</th>
                            <th className="px-6 py-3 bg-emerald-50 text-emerald-700">Disp.</th>
                          </>
                      ) : status === RequestStatus.RENT ? (
                          <>
                             <th className="px-6 py-3 bg-amber-50 text-amber-700">Plazo (Meses)</th>
                             <th className="px-6 py-3">Comentarios</th>
                          </>
                      ) : status === RequestStatus.BUY ? (
                          // For Buy we already added inputs above, remaining is comments/alerts
                           <th className="px-6 py-3">Comentarios / Alertas</th>
                      ) : status === RequestStatus.COMPLETED ? (
                          <th className="px-6 py-3">Detalle Cierre</th>
                      ) : (
                          <th className="px-6 py-3">Comentarios</th>
                      )}
                      
                      {status !== RequestStatus.COMPLETED && (
                        <th className="px-6 py-3 text-center w-32">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {requestItems.map((req) => {
                      // Logic for Buy Delivery Date Warning
                      const isBuy = status === RequestStatus.BUY;
                      const buyDetails = req.buyDetails || { vendor: '', deliveryDate: '' };
                      const showLateWarning = isBuy && buyDetails.deliveryDate && buyDetails.deliveryDate > req.needDate;

                      return (
                      <tr key={req.id} className="border-b hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">
                            {req.description}
                            <div className="text-xs text-slate-400 font-normal">{req.category}</div>
                        </td>
                        
                        {isBuy && (
                            <>
                                <td className="px-6 py-4">
                                    <input 
                                        type="text" 
                                        placeholder="Ingrese proveedor..."
                                        className="w-full text-xs border-b border-slate-300 focus:border-red-500 focus:outline-none bg-transparent"
                                        value={buyDetails.vendor}
                                        onChange={(e) => onUpdateBuyDetails?.(req.id, { vendor: e.target.value })}
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <input 
                                        type="date"
                                        className="w-full text-xs border-b border-slate-300 focus:border-red-500 focus:outline-none bg-transparent"
                                        value={buyDetails.deliveryDate}
                                        onChange={(e) => onUpdateBuyDetails?.(req.id, { deliveryDate: e.target.value })}
                                    />
                                </td>
                            </>
                        )}

                        {status === RequestStatus.COMPLETED && (
                          <td className="px-6 py-4">
                              {getOriginLabel(req.fulfillmentType)}
                          </td>
                        )}

                        {status !== RequestStatus.COMPLETED && (
                            <td className="px-6 py-4">{req.capacity}</td>
                        )}
                        
                        <td className="px-6 py-4">{req.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{req.needDate}</td>
                        
                        {status === RequestStatus.OWN && req.ownDetails ? (
                            <>
                              <td className="px-6 py-4 font-mono text-emerald-700">{req.ownDetails.internalId}</td>
                              <td className="px-6 py-4">{req.ownDetails.brand} {req.ownDetails.model}</td>
                              <td className="px-6 py-4">{req.ownDetails.hours}</td>
                              <td className="px-6 py-4">{req.ownDetails.availabilityDate}</td>
                            </>
                        ) : status === RequestStatus.RENT ? (
                            <>
                                <td className="px-6 py-4 font-semibold text-amber-700">{req.rentalDuration}</td>
                                <td className="px-6 py-4 max-w-xs truncate" title={req.comments}>{req.comments}</td>
                            </>
                        ) : status === RequestStatus.BUY ? (
                            <td className="px-6 py-4">
                                <div className="text-xs text-slate-600 mb-1 max-w-xs truncate">{req.comments || '-'}</div>
                                {showLateWarning && (
                                    <div className="flex items-start gap-2 bg-orange-50 text-orange-800 p-2 rounded border border-orange-200 text-xs mt-2 max-w-xs">
                                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                        <span>Al ser la fecha de entrega superior a la de necesidad, negociar con obra nueva fecha de necesidad o contemplar alquiler por la diferencia de plazos</span>
                                    </div>
                                )}
                            </td>
                        ) : status === RequestStatus.COMPLETED ? (
                             <td className="px-6 py-4 text-slate-500 text-xs">
                                {req.ownDetails ? `Interno: ${req.ownDetails.internalId}` : 
                                 req.buyDetails?.vendor ? `Prov: ${req.buyDetails.vendor}` :
                                 req.comments || '-'}
                             </td>
                        ) : (
                            <td className="px-6 py-4 max-w-xs truncate" title={req.comments}>{req.comments}</td>
                        )}
                        
                        {status !== RequestStatus.COMPLETED && (
                            <td className="px-6 py-4 text-center">
                                <div className="flex justify-center gap-1">
                                    {onMarkCompleted && (
                                        <button 
                                            onClick={() => onMarkCompleted(req.id)}
                                            className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 p-2 rounded-full transition-all"
                                            title="Marcar como Cumplido"
                                        >
                                            <CheckCircle size={18} />
                                        </button>
                                    )}
                                    {onReturnToPending && (
                                        <button 
                                            onClick={() => onReturnToPending(req.id)}
                                            className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-all"
                                            title="Devolver a Solicitudes"
                                        >
                                            <Undo2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        )}
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};