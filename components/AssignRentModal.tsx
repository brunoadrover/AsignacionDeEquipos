import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { EquipmentRequest } from '../types';

interface AssignRentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (durations: number[]) => void;
  request: EquipmentRequest | null;
}

export const AssignRentModal: React.FC<AssignRentModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  request 
}) => {
  const [durations, setDurations] = useState<number[]>([]);
  const [currentDuration, setCurrentDuration] = useState<number | ''>('');

  // When modal opens, reset.
  useEffect(() => {
    if (isOpen) {
        setDurations([]);
        setCurrentDuration('');
    }
  }, [isOpen, request]);

  // Auto-fill logic: When currentDuration is empty, try to fill it with the previous value (if exists)
  useEffect(() => {
    if (isOpen && currentDuration === '' && durations.length > 0) {
        // Take the last entered duration as default for the next one
        setCurrentDuration(durations[durations.length - 1]);
    }
  }, [durations, isOpen, currentDuration]);

  if (!isOpen || !request) return null;

  const remainingQty = request.quantity - durations.length;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentDuration && Number(currentDuration) > 0 && remainingQty > 0) {
        setDurations([...durations, Number(currentDuration)]);
        // We do NOT clear currentDuration here immediately if we want to support rapid entry,
        // but typically forms clear. 
        // However, the requirement says "taking by default the data loaded in the first equipment".
        // So we leave it as is, or set it to the value just entered to act as the new default.
        // Let's keep the value in the input for the next iteration.
    }
  };

  const handleRemove = (index: number) => {
    const newDurations = [...durations];
    newDurations.splice(index, 1);
    setDurations(newDurations);
  };

  const handleFinalize = () => {
    onConfirm(durations);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
                Confirmar Alquiler
            </h3>
             <p className="text-sm text-slate-500">
                Solicitud original: {request.quantity} unidades
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
           <div className="max-w-[70%]">
             <p className="text-sm text-amber-800 font-medium truncate">{request.description}</p>
          </div>
          <div className="text-right">
              <span className="text-xs font-bold uppercase text-amber-600 block">Pendientes</span>
              <span className="text-xl font-bold text-amber-800">{remainingQty}</span>
          </div>
        </div>

        <div className="p-4 space-y-4">
           
           {/* Input Area */}
           {remainingQty > 0 ? (
               <form onSubmit={handleAdd} className="flex gap-2 items-end bg-slate-50 p-3 rounded-md border border-slate-200">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                            Plazo (Meses) para ítem {durations.length + 1}
                        </label>
                        <input
                        required
                        autoFocus
                        type="number"
                        min="1"
                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 border p-2 text-sm bg-white text-slate-900"
                        value={currentDuration}
                        onChange={(e) => setCurrentDuration(Number(e.target.value))}
                        placeholder="Ej: 3"
                        />
                    </div>
                    <Button type="submit" variant="secondary" className="mb-[1px]">
                        <Plus size={18} />
                    </Button>
               </form>
           ) : (
                <div className="bg-green-50 text-green-800 p-3 rounded-md flex items-center gap-2 text-sm">
                    <CheckCircle2 size={18} /> Todos los ítems definidos.
                </div>
           )}

           {/* List of defined durations */}
           <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-md">
                <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-xs text-slate-500 uppercase sticky top-0">
                        <tr>
                            <th className="px-3 py-2 text-left">Ítem</th>
                            <th className="px-3 py-2 text-center">Plazo</th>
                            <th className="px-3 py-2"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {durations.length === 0 ? (
                            <tr><td colSpan={3} className="text-center py-4 text-slate-400 text-xs">Sin cargar</td></tr>
                        ) : (
                            durations.map((d, i) => (
                                <tr key={i} className="bg-white">
                                    <td className="px-3 py-2 text-slate-600">#{i + 1}</td>
                                    <td className="px-3 py-2 text-center font-medium">{d} Meses</td>
                                    <td className="px-3 py-2 text-right">
                                        <button onClick={() => handleRemove(i)} className="text-slate-300 hover:text-red-500">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
           </div>

        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-slate-50">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button 
                type="button" 
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={durations.length === 0}
                onClick={handleFinalize}
            >
                Confirmar ({durations.length})
            </Button>
        </div>
      </div>
    </div>
  );
};