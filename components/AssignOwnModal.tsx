import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2, Search, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { EquipmentRequest, OwnDetails } from '../types';
import { supabase } from '../lib/supabase';

interface AssignOwnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (detailsList: OwnDetails[]) => void;
  request: EquipmentRequest | null;
}

export const AssignOwnModal: React.FC<AssignOwnModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  request 
}) => {
  const [assignedItems, setAssignedItems] = useState<OwnDetails[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [formData, setFormData] = useState<OwnDetails>({
    internalId: '',
    brand: '',
    model: '',
    hours: 0,
    availabilityDate: '',
    equipo_id: ''
  });

  useEffect(() => {
    if (isOpen) {
        setAssignedItems([]);
        setFormData({
            internalId: '',
            brand: '',
            model: '',
            hours: 0,
            availabilityDate: '',
            equipo_id: ''
        });
    }
  }, [isOpen, request]);

  // Real-time lookup logic
  useEffect(() => {
    const lookupEquipment = async () => {
        if (formData.internalId.length < 2) return;
        
        setIsSearching(true);
        const { data, error } = await supabase
            .from('equipos')
            .select('*')
            .eq('nro_interno', formData.internalId)
            .single();
        
        if (data && !error) {
            setFormData(prev => ({
                ...prev,
                brand: data.marca || '',
                model: data.modelo || '',
                hours: Number(data.horas_arrastre) || 0,
                equipo_id: data.id
            }));
        }
        setIsSearching(false);
    };

    const timeoutId = setTimeout(lookupEquipment, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.internalId]);

  if (!isOpen || !request) return null;

  const remainingQty = request.quantity - assignedItems.length;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (remainingQty <= 0) return;

    setAssignedItems([...assignedItems, formData]);
    
    setFormData({
      internalId: '',
      brand: '',
      model: '',
      hours: 0,
      availabilityDate: formData.availabilityDate,
      equipo_id: ''
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...assignedItems];
    newItems.splice(index, 1);
    setAssignedItems(newItems);
  };

  const handleFinalize = () => {
    onConfirm(assignedItems);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl animate-in fade-in zoom-in duration-200 my-8">
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
                Asignar Equipos Propios
            </h3>
            <p className="text-sm text-slate-500">
                Solicitud original: {request.quantity} unidades
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
          <div>
             <p className="text-sm text-blue-800 font-medium">{request.description}</p>
             <p className="text-xs text-blue-600">UO: {request.uo_nombre}</p>
          </div>
          <div className="text-right">
              <span className="text-xs font-bold uppercase text-blue-600 block">Pendientes de cargar</span>
              <span className="text-2xl font-bold text-blue-800">{remainingQty}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <div className="space-y-4">
                <h4 className="font-medium text-slate-700 border-b pb-2">
                    {remainingQty > 0 ? `Datos del Equipo (${assignedItems.length + 1}/${request.quantity})` : 'Carga Completa'}
                </h4>
                
                {remainingQty > 0 ? (
                <form onSubmit={handleAddItem} className="space-y-3">
                    <div className="relative">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Nº Interno</label>
                        <div className="relative">
                            <input
                            required
                            type="text"
                            placeholder="Ingrese N° de Interno..."
                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm bg-white text-slate-900 pr-10"
                            value={formData.internalId}
                            onChange={(e) => setFormData({...formData, internalId: e.target.value})}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                {isSearching ? <Loader2 size={16} className="text-blue-500 animate-spin" /> : <Search size={16} className="text-slate-400" />}
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Marca</label>
                        <input
                            readOnly
                            type="text"
                            className="w-full rounded-md border-slate-300 shadow-sm border p-2 text-sm bg-slate-50 text-slate-600"
                            value={formData.brand}
                            placeholder="Autocompletado..."
                        />
                        </div>
                        <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Modelo</label>
                        <input
                            readOnly
                            type="text"
                            className="w-full rounded-md border-slate-300 shadow-sm border p-2 text-sm bg-slate-50 text-slate-600"
                            value={formData.model}
                            placeholder="Autocompletado..."
                        />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Hs Arrastre</label>
                        <input
                            readOnly
                            type="number"
                            className="w-full rounded-md border-slate-300 shadow-sm border p-2 text-sm bg-slate-50 text-slate-600"
                            value={formData.hours}
                        />
                        </div>
                        <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Disponibilidad</label>
                        <input
                            required
                            type="date"
                            className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm bg-white text-slate-900"
                            value={formData.availabilityDate}
                            onChange={(e) => setFormData({...formData, availabilityDate: e.target.value})}
                        />
                        </div>
                    </div>

                    <Button type="submit" size="sm" className="w-full mt-2" variant="secondary" disabled={!formData.equipo_id}>
                        <Plus size={16} className="mr-2" /> Agregar a la lista
                    </Button>
                    {!formData.equipo_id && formData.internalId.length > 2 && !isSearching && (
                        <p className="text-[10px] text-red-500 text-center font-medium">Equipo no encontrado en la base de datos.</p>
                    )}
                </form>
                ) : (
                    <div className="bg-emerald-50 text-emerald-800 p-4 rounded-md flex items-center gap-3">
                        <CheckCircle2 size={24} />
                        <p className="text-sm">Se han cubierto todas las unidades solicitadas.</p>
                    </div>
                )}
            </div>

            <div className="bg-slate-50 rounded-lg border border-slate-200 flex flex-col h-full max-h-[400px]">
                <div className="p-3 border-b border-slate-200 bg-slate-100">
                    <h4 className="font-medium text-slate-700 text-sm">Equipos Asignados ({assignedItems.length})</h4>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {assignedItems.length === 0 ? (
                        <p className="text-center text-slate-400 text-xs py-8">No hay equipos cargados aún</p>
                    ) : (
                        assignedItems.map((item, idx) => (
                            <div key={idx} className="bg-white p-3 rounded border border-slate-200 shadow-sm relative group">
                                <button 
                                    onClick={() => handleRemoveItem(idx)}
                                    className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-sm text-slate-800">#{item.internalId}</span>
                                    <span className="text-xs bg-emerald-100 text-emerald-800 px-1.5 rounded">{item.availabilityDate}</span>
                                </div>
                                <div className="text-xs text-slate-600">
                                    {item.brand} {item.model}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-slate-50 rounded-b-lg">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button 
                type="button" 
                variant="success" 
                disabled={assignedItems.length === 0}
                onClick={handleFinalize}
            >
                Confirmar Asignación ({assignedItems.length})
            </Button>
        </div>
      </div>
    </div>
  );
};