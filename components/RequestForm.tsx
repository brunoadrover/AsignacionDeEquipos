import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from './Button';
import { EquipmentRequest, RequestStatus, UnidadOperativa, Categoria } from '../types';

interface RequestFormProps {
  onSubmit: (req: any) => void;
  uos: UnidadOperativa[];
  categories: Categoria[];
}

export const RequestForm: React.FC<RequestFormProps> = ({ onSubmit, uos, categories }) => {
  const [formData, setFormData] = useState({
    uo_id: '',
    categoria_id: '',
    description: '',
    capacity: '',
    quantity: 1,
    needDate: '',
    comments: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRequestData = {
      requestDate: new Date().toISOString().split('T')[0],
      ...formData
    };
    onSubmit(newRequestData);
    setFormData({ uo_id: '', categoria_id: '', description: '', capacity: '', quantity: 1, needDate: '', comments: '' });
  };

  const inputClasses = "w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm bg-white text-slate-900 placeholder:text-slate-400";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex items-center gap-2 mb-4 text-slate-800">
        <PlusCircle className="text-blue-600" />
        <h2 className="text-lg font-bold">Nueva Solicitud de Equipo</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Unidad Operativa (UO)</label>
          <select required className={inputClasses} value={formData.uo_id} onChange={(e) => setFormData({...formData, uo_id: e.target.value})}>
            <option value="" disabled>Seleccione UO...</option>
            {uos.map((uo) => <option key={uo.id} value={uo.id}>{uo.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
          <select required className={inputClasses} value={formData.categoria_id} onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}>
            <option value="" disabled>Seleccione Categoría...</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
          <input required type="text" placeholder="Ej: Camioneta 4x4" className={inputClasses} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Capacidad / Esp.</label>
          <input type="text" placeholder="Ej: Doble Cabina / 20T" className={inputClasses} value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: e.target.value})} />
        </div>

        <div className="grid grid-cols-2 gap-2">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
                <input required type="number" min="1" className={inputClasses} value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})} />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Necesidad</label>
                <input required type="date" className={inputClasses} value={formData.needDate} onChange={(e) => setFormData({...formData, needDate: e.target.value})} />
            </div>
        </div>

        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Comentarios</label>
          <input type="text" placeholder="Detalles adicionales..." className={inputClasses} value={formData.comments} onChange={(e) => setFormData({...formData, comments: e.target.value})} />
        </div>

        <div className="lg:col-span-4 flex justify-end">
          <Button type="submit">Agregar Solicitud</Button>
        </div>
      </form>
    </div>
  );
};