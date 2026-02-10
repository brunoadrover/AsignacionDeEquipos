
import React, { useState, useEffect } from 'react';
import { RequestForm } from './components/RequestForm';
import { EquipmentRequest, RequestStatus, ViewMode, OwnDetails, BuyDetails, UnidadOperativa, Categoria } from './types';
import { AssignOwnModal } from './components/AssignOwnModal';
import { AssignRentModal } from './components/AssignRentModal';
import { ReportView } from './components/ReportView';
import { SettingsView } from './components/SettingsView';
import { LoginScreen } from './components/LoginScreen';
import { LayoutDashboard, ShoppingCart, Key, Search, Calendar, Package, Settings, Filter, CheckSquare, LogOut, Pencil, Trash2, X, Save, CheckCircle, Loader2, FileDown } from 'lucide-react';
import { Button } from './components/Button';
import { supabase } from './lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND_GREEN = "bg-[#1B4D3E]"; 

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [appPassword, setAppPassword] = useState('asignacion2026');
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [uos, setUos] = useState<UnidadOperativa[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [view, setView] = useState<ViewMode>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [uoFilter, setUoFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [editingPendingId, setEditingPendingId] = useState<string | null>(null);
  const [editPendingValues, setEditPendingValues] = useState<Partial<EquipmentRequest>>({});
  const [deletingPendingId, setDeletingPendingId] = useState<string | null>(null);

  const [isOwnModalOpen, setIsOwnModalOpen] = useState(false);
  const [selectedRequestForOwn, setSelectedRequestForOwn] = useState<EquipmentRequest | null>(null);
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [selectedRequestForRent, setSelectedRequestForRent] = useState<EquipmentRequest | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
        const { data: config } = await supabase.from('configuracion_sistema').select('*').eq('clave', 'app_password').single();
        if (config) setAppPassword(config.valor);

        const { data: uoData } = await supabase.from('unidades_operativas').select('*').order('nombre');
        if (uoData) setUos(uoData || []);

        const { data: catData } = await supabase.from('categorias').select('*').order('nombre');
        if (catData) setCategories(catData || []);

        await fetchRequests();
    } catch (e) {
        console.error("Error fetching initial data", e);
    } finally {
        setIsLoading(false);
    }
  };

  const fetchRequests = async () => {
    const { data: solicitudes, error } = await supabase
        .from('solicitudes')
        .select(`
            *,
            unidades_operativas (nombre),
            categorias (nombre),
            asignaciones (
              *,
              equipos (*)
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching solicitudes", error);
        return;
    }

    const flattened: EquipmentRequest[] = [];
    
    solicitudes.forEach((sol: any) => {
        const baseRequest = {
            id: sol.id,
            requestDate: sol.fecha_solicitud,
            uo_id: sol.unidad_operativa_id,
            uo_nombre: sol.unidades_operativas?.nombre,
            categoria_id: sol.categoria_id,
            categoria_nombre: sol.categorias?.nombre,
            description: sol.descripcion,
            capacity: sol.capacidad,
            quantity: sol.cantidad_total,
            needDate: sol.fecha_necesidad,
            comments: sol.comentarios,
            status: sol.estado_general as RequestStatus
        };

        if (sol.estado_general === 'PENDING') {
            flattened.push(baseRequest);
        } else {
            // Procesar asignaciones
            sol.asignaciones.forEach((asig: any) => {
                flattened.push({
                    ...baseRequest,
                    id: asig.id, 
                    solicitud_id: sol.id,
                    quantity: asig.cantidad_assigned || asig.cantidad_asignada,
                    status: sol.estado_general === 'COMPLETED' ? RequestStatus.COMPLETED : (asig.tipo_gestion as RequestStatus),
                    rentalDuration: asig.alquiler_meses,
                    ownDetails: asig.equipo_id ? {
                        internalId: asig.equipos?.nro_interno || '',
                        brand: asig.equipos?.marca || '',
                        model: asig.equipos?.modelo || '',
                        hours: Number(asig.equipos?.horas_arrastre) || 0,
                        availabilityDate: asig.disponibilidad_obra || '',
                        equipo_id: asig.equipo_id
                    } : undefined,
                    buyDetails: asig.tipo_gestion === 'BUY' ? {
                        vendor: asig.compra_proveedor,
                        deliveryDate: asig.compra_fecha_entrega
                    } : undefined,
                    fulfillmentType: asig.tipo_gestion as RequestStatus
                });
            });

            const totalAssigned = sol.asignaciones.reduce((acc: number, curr: any) => acc + (curr.cantidad_assigned || curr.cantidad_asignada || 0), 0);
            if (totalAssigned < sol.cantidad_total && sol.estado_general !== 'COMPLETED') {
                flattened.push({
                    ...baseRequest,
                    quantity: sol.cantidad_total - totalAssigned,
                    status: RequestStatus.PENDING
                });
            }
        }
    });

    setRequests(flattened);
  };

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => { setIsAuthenticated(false); setView('DASHBOARD'); };

  const handleAddRequest = async (req: any) => {
    const { error } = await supabase.from('solicitudes').insert({
        fecha_solicitud: req.requestDate,
        unidad_operativa_id: req.uo_id,
        categoria_id: req.categoria_id,
        descripcion: req.description,
        capacidad: req.capacity,
        cantidad_total: req.quantity,
        fecha_necesidad: req.needDate,
        comentarios: req.comments,
        estado_general: 'PENDING'
    });

    if (!error) await fetchRequests();
  };

  const updateStatusSimple = async (id: string, status: RequestStatus) => {
      const req = requests.find(r => r.id === id);
      if (!req) return;

      if (status === RequestStatus.BUY) {
          const { error: asigError } = await supabase.from('asignaciones').insert({
            solicitud_id: req.id,
            tipo_gestion: 'BUY',
            cantidad_asignada: req.quantity,
            fecha_gestion: new Date().toISOString()
          });
          
          if (!asigError) {
              await supabase.from('solicitudes').update({ estado_general: 'PARTIAL' }).eq('id', req.id);
              await fetchRequests();
          }
      }
  };

  const handleUpdateRequest = async (id: string, updates: Partial<EquipmentRequest>) => {
      const req = requests.find(r => r.id === id);
      if (!req) return;
      
      const solicitudId = req.solicitud_id || req.id;

      const { error: solError } = await supabase.from('solicitudes').update({
        descripcion: updates.description,
        capacidad: updates.capacity,
        cantidad_total: updates.quantity,
        fecha_necesidad: updates.needDate,
        comentarios: updates.comments
      }).eq('id', solicitudId);

      if (req.status !== RequestStatus.PENDING && req.id !== solicitudId) {
          const asigUpdates: any = {};
          if (updates.rentalDuration !== undefined) asigUpdates.alquiler_meses = updates.rentalDuration;
          if (updates.ownDetails?.availabilityDate !== undefined) asigUpdates.disponibilidad_obra = updates.ownDetails.availabilityDate;
          
          if (Object.keys(asigUpdates).length > 0) {
              await supabase.from('asignaciones').update(asigUpdates).eq('id', req.id);
          }
      }
      
      if (!solError) await fetchRequests();
  };

  const handleDeleteRequest = async (id: string) => {
      const req = requests.find(r => r.id === id);
      if (!req) return;

      if (req.status === RequestStatus.PENDING) {
          await supabase.from('solicitudes').delete().eq('id', id);
      } else {
          await supabase.from('asignaciones').delete().eq('id', id);
      }
      await fetchRequests();
  };

  const handleMarkAsCompleted = async (id: string) => {
    try {
        const req = requests.find(r => r.id === id);
        if (!req) return;

        const solicitudId = (req as any).solicitud_id || req.id;
        
        const { error } = await supabase
            .from('solicitudes')
            .update({ estado_general: 'COMPLETED' })
            .eq('id', solicitudId);

        if (error) throw error;
        
        await fetchRequests();
    } catch (error) {
        console.error("Error al completar la solicitud:", error);
        alert("Ocurrió un error al intentar marcar la solicitud como completada.");
    }
  };

  const handleRevertCompleted = async (id: string) => {
    try {
        const req = requests.find(r => r.id === id);
        if (!req) return;

        const solicitudId = (req as any).solicitud_id || req.id;
        
        const { error } = await supabase
            .from('solicitudes')
            .update({ estado_general: 'PARTIAL' })
            .eq('id', solicitudId);

        if (error) throw error;
        
        await fetchRequests();
    } catch (error) {
        console.error("Error al revertir la solicitud:", error);
        alert("Ocurrió un error al intentar devolver el registro.");
    }
  };

  const startEditingPending = (req: EquipmentRequest) => {
      setEditingPendingId(req.id);
      setEditPendingValues({ ...req });
  };
  const cancelEditingPending = () => { setEditingPendingId(null); setEditPendingValues({}); };
  const saveEditingPending = (id: string) => {
      handleUpdateRequest(id, editPendingValues);
      setEditingPendingId(null);
  };

  const initiateOwnAssignment = (req: EquipmentRequest) => { setSelectedRequestForOwn(req); setIsOwnModalOpen(true); };
  const confirmOwnAssignment = async (detailsList: OwnDetails[]) => {
    if (!selectedRequestForOwn) return;
    
    const count = detailsList.length;
    const assignments = detailsList.map(detail => ({
        solicitud_id: selectedRequestForOwn.id,
        tipo_gestion: 'OWN',
        equipo_id: detail.equipo_id,
        disponibilidad_obra: detail.availabilityDate,
        cantidad_asignada: 1,
        fecha_gestion: new Date().toISOString()
    }));

    const { error } = await supabase.from('asignaciones').insert(assignments);
    if (!error) {
        await supabase.from('solicitudes').update({ 
            estado_general: count >= selectedRequestForOwn.quantity ? 'COMPLETED' : 'PARTIAL' 
        }).eq('id', selectedRequestForOwn.id);
        await fetchRequests();
    }
    setIsOwnModalOpen(false);
  };

  const initiateRentAssignment = (req: EquipmentRequest) => { setSelectedRequestForRent(req); setIsRentModalOpen(true); };
  const confirmRentAssignment = async (durations: number[]) => {
      if (!selectedRequestForRent) return;
      
      const count = durations.length;
      const assignments = durations.map(duration => ({
          solicitud_id: selectedRequestForRent.id,
          tipo_gestion: 'RENT',
          alquiler_meses: duration,
          cantidad_asignada: 1,
          fecha_gestion: new Date().toISOString()
      }));

      const { error } = await supabase.from('asignaciones').insert(assignments);
      if (!error) {
          await supabase.from('solicitudes').update({ 
              estado_general: count >= selectedRequestForRent.quantity ? 'COMPLETED' : 'PARTIAL' 
          }).eq('id', selectedRequestForRent.id);
          await fetchRequests();
      }
      setIsRentModalOpen(false);
  };

  const handleUpdatePassword = async (newPass: string) => {
      const { error } = await supabase.from('configuracion_sistema').upsert({ clave: 'app_password', valor: newPass });
      if (!error) setAppPassword(newPass);
  };

  const getFilteredRequests = (status: RequestStatus) => {
    return requests.filter(r => {
        const matchesStatus = r.status === status;
        const matchesSearch = searchTerm === '' || 
                             r.uo_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             r.ownDetails?.internalId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === '' || r.categoria_id === categoryFilter;
        const matchesUO = uoFilter === '' || r.uo_id === uoFilter;

        return matchesStatus && matchesSearch && matchesCategory && matchesUO;
    });
  };

  const handleExportFullPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString().replace(/\//g, '-');
    
    doc.setFontSize(22);
    doc.setTextColor(27, 77, 62);
    doc.text("Reporte Unificado de Gestión de Equipos", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Filtros aplicados - UO: ${uos.find(u=>u.id===uoFilter)?.nombre || 'Todas'}, Cat: ${categories.find(c=>c.id===categoryFilter)?.nombre || 'Todas'}`, 14, 28);
    
    let yPos = 35;

    const sections = [
        { title: "SOLICITUDES PENDIENTES", status: RequestStatus.PENDING },
        { title: "EQUIPOS PROPIOS ASIGNADOS", status: RequestStatus.OWN },
        { title: "GESTIÓN DE COMPRA", status: RequestStatus.BUY },
        { title: "EQUIPOS EN ALQUILER", status: RequestStatus.RENT }
    ];

    sections.forEach((section) => {
        const data = getFilteredRequests(section.status);
        if (data.length === 0) return;

        if (yPos > 250) { doc.addPage(); yPos = 20; }
        
        doc.setFontSize(14);
        doc.setTextColor(27, 77, 62);
        doc.text(section.title, 14, yPos);
        yPos += 7;

        const uoGroups = data.reduce((acc, curr) => {
            const uo = curr.uo_nombre || 'Sin UO';
            if (!acc[uo]) acc[uo] = [];
            acc[uo].push(curr);
            return acc;
        }, {} as Record<string, EquipmentRequest[]>);

        (Object.entries(uoGroups) as [string, EquipmentRequest[]][]).forEach(([uo, items]) => {
            if (yPos > 270) { doc.addPage(); yPos = 20; }
            doc.setFontSize(11);
            doc.setTextColor(40);
            doc.text(`Unidad Operativa: ${uo}`, 14, yPos);
            yPos += 3;

            let head: string[][] = [];
            let body: string[][] = [];

            if (section.status === RequestStatus.PENDING) {
                head = [['Descripción', 'Detalle', 'Cant', 'F. Nec.', 'Comentarios']];
                body = items.map(r => [r.description, r.capacity, r.quantity.toString(), r.needDate, r.comments || '']);
            } else if (section.status === RequestStatus.OWN) {
                head = [['Descripción', 'Interno', 'Marca/Modelo', 'Cant', 'F. Disp.']];
                body = items.map(r => [r.description, r.ownDetails?.internalId || '-', `${r.ownDetails?.brand} ${r.ownDetails?.model}`, r.quantity.toString(), r.ownDetails?.availabilityDate || '-']);
            } else if (section.status === RequestStatus.BUY) {
                head = [['Descripción', 'Detalle', 'Cant', 'F. Nec.', 'Comentarios']];
                body = items.map(r => [r.description, r.capacity, r.quantity.toString(), r.needDate, r.comments || '']);
            } else {
                head = [['Descripción', 'Detalle', 'Cant', 'F. Nec.', 'Plazo']];
                body = items.map(r => [r.description, r.capacity, r.quantity.toString(), r.needDate, `${r.rentalDuration} meses`]);
            }

            autoTable(doc, {
                startY: yPos,
                head: head,
                body: body,
                theme: 'striped',
                headStyles: { fillColor: [27, 77, 62] },
                styles: { fontSize: 8 },
                margin: { left: 14 }
            });

            yPos = (doc as any).lastAutoTable.finalY + 12;
        });
        
        yPos += 5;
    });

    doc.save(`Reporte_Unificado_${dateStr}.pdf`);
  };

  const pendingList = getFilteredRequests(RequestStatus.PENDING);

  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} validPassword={appPassword} />;

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><Loader2 className="animate-spin text-emerald-700" size={48} /></div>;

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans text-slate-900">
      <aside className={`w-64 ${BRAND_GREEN} text-white flex-shrink-0 hidden md:flex flex-col`}>
        <div className="p-8 border-b border-white/10 flex flex-col items-center justify-center text-center">
            <h1 className="text-7xl font-bold text-white tracking-tighter leading-none mb-2" style={{ fontFamily: '"Times New Roman", Times, serif' }}>GE<span className="text-6xl italic">y</span>T</h1>
            <h2 className="text-sm font-medium text-white/90 uppercase tracking-wide">Asignación de Equipos</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2 flex flex-col">
          <SidebarItem active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} icon={<LayoutDashboard size={20} />} label="Control de Requerimientos" />
          <div className="pt-6 pb-2 px-3 text-xs font-semibold uppercase text-white/50 tracking-wider">Historial</div>
          <SidebarItem active={view === 'COMPLETED'} onClick={() => setView('COMPLETED')} icon={<CheckSquare size={20} />} label="Completadas" />
          <div className="flex-1"></div>
          <div className="pt-4 border-t border-white/10 mt-2 space-y-2">
            <SidebarItem active={view === 'SETTINGS'} onClick={() => setView('SETTINGS')} icon={<Settings size={20} />} label="Configuración" />
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all text-white/60 hover:bg-[#113026] hover:text-white"><LogOut size={20} /><span className="font-medium">Salir</span></button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto h-screen">
        <div className="p-6 max-w-7xl mx-auto">
          {view === 'DASHBOARD' && (
            <div className="space-y-8 animate-in fade-in duration-300 pb-12">
              
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-800">Panel de Control de Requerimientos</h2>
                  <p className="text-slate-500 text-sm mt-1">Control centralizado de requerimientos y estados</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                   <div className="relative w-full sm:w-44">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <select className="pl-9 pr-4 py-2 border rounded-md text-sm w-full bg-white text-slate-900 border-slate-300 appearance-none" value={uoFilter} onChange={(e) => setUoFilter(e.target.value)}>
                          <option value="">Todas las UO</option>
                          {uos.map(uo => <option key={uo.id} value={uo.id}>{uo.nombre}</option>)}
                      </select>
                   </div>
                   <div className="relative w-full sm:w-44">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <select className="pl-9 pr-4 py-2 border rounded-md text-sm w-full bg-white text-slate-900 border-slate-300 appearance-none" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                          <option value="">Categorías</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                   </div>
                   <div className="relative w-full sm:w-56">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="text" placeholder="Buscar..." className="pl-10 pr-4 py-2 border rounded-md text-sm w-full bg-white text-slate-900 border-slate-300" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                   </div>
                   <Button onClick={handleExportFullPDF} className="flex items-center gap-2 bg-[#1B4D3E] hover:bg-[#113026] w-full sm:w-auto shadow-sm">
                     <FileDown size={18} /> Exportar Reporte
                   </Button>
                </div>
              </div>

              <RequestForm onSubmit={handleAddRequest} uos={uos} categories={categories} />
              
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-blue-50/50 flex items-center justify-between">
                  <h3 className="text-md font-bold text-blue-900 flex items-center gap-2 uppercase tracking-wide"><Package className="text-blue-600" size={18} /> 1. Solicitudes Pendientes</h3>
                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold">{pendingList.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b">
                      <tr>
                        <th className="px-4 py-3">UO / Descripción / Comentarios</th>
                        <th className="px-4 py-3">Detalle</th>
                        <th className="px-4 py-3">Cant.</th>
                        <th className="px-4 py-3">Necesidad</th>
                        <th className="px-4 py-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingList.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-10 text-slate-400 italic">No hay solicitudes pendientes cargadas.</td></tr>
                      ) : (
                        pendingList.map((req) => {
                          const isEditing = editingPendingId === req.id;
                          const isDeleting = deletingPendingId === req.id;
                          return (
                            <tr key={req.id} className={`hover:bg-slate-50 transition-colors ${isEditing ? 'bg-blue-50/50' : ''}`}>
                              <td className="px-4 py-3">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{req.uo_nombre}</div>
                                {isEditing ? (
                                  <div className="space-y-1">
                                    <input type="text" placeholder="Descripción" className="border rounded p-1 text-xs w-full bg-white text-slate-900 border-slate-300" value={editPendingValues.description} onChange={(e) => setEditPendingValues({...editPendingValues, description: e.target.value})} />
                                    <input type="text" placeholder="Comentarios" className="border rounded p-1 text-[10px] w-full bg-white text-slate-900 border-slate-300 italic" value={editPendingValues.comments} onChange={(e) => setEditPendingValues({...editPendingValues, comments: e.target.value})} />
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-medium text-slate-800">{req.description}</div>
                                    {req.comments && <div className="text-[10px] text-slate-500 italic mt-0.5 border-t border-slate-100 pt-0.5 leading-tight">{req.comments}</div>}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {isEditing ? (
                                    <input type="text" placeholder="Detalle" className="border rounded p-1 text-xs w-full bg-white text-slate-900 border-slate-300" value={editPendingValues.capacity} onChange={(e) => setEditPendingValues({...editPendingValues, capacity: e.target.value})} />
                                ) : req.capacity}
                              </td>
                              <td className="px-4 py-3 font-semibold">
                                {isEditing ? (
                                    <input type="number" min="1" className="border rounded p-1 text-xs w-16 bg-white text-slate-900 border-slate-300" value={editPendingValues.quantity} onChange={(e) => setEditPendingValues({...editPendingValues, quantity: Number(e.target.value)})} />
                                ) : req.quantity}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-red-600 font-medium">
                                {isEditing ? (
                                    <input type="date" className="border rounded p-1 text-xs bg-white text-slate-900 border-slate-300" value={editPendingValues.needDate} onChange={(e) => setEditPendingValues({...editPendingValues, needDate: e.target.value})} />
                                ) : req.needDate}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-center gap-2 items-center">
                                  {isDeleting ? (
                                    <div className="flex flex-col items-center gap-1 animate-in zoom-in">
                                      <span className="text-[10px] font-bold text-red-600 uppercase">¿Borrar?</span>
                                      <div className="flex gap-2">
                                        <button onClick={() => handleDeleteRequest(req.id)} className="bg-red-600 text-white p-1 rounded-md"><CheckCircle size={14}/></button>
                                        <button onClick={() => setDeletingPendingId(null)} className="bg-slate-200 text-slate-600 p-1 rounded-md"><X size={14}/></button>
                                      </div>
                                    </div>
                                  ) : isEditing ? (
                                    <div className="flex gap-2">
                                      <button onClick={() => saveEditingPending(req.id)} className="text-emerald-600 p-1.5 hover:bg-emerald-50 rounded-full" title="Guardar"><Save size={18}/></button>
                                      <button onClick={cancelEditingPending} className="text-slate-400 p-1.5 hover:bg-slate-100 rounded-full" title="Cancelar"><X size={18}/></button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex gap-1 border-r pr-2 border-slate-200">
                                        <button onClick={() => startEditingPending(req)} className="text-slate-400 hover:text-blue-600 p-1.5 rounded-full" title="Editar Solicitud"><Pencil size={18} /></button>
                                        <button onClick={() => setDeletingPendingId(req.id)} className="text-slate-400 hover:text-red-600 p-1.5 rounded-full" title="Eliminar definitivamente"><Trash2 size={18} /></button>
                                      </div>
                                      <div className="flex gap-1 pl-1">
                                        <Button size="sm" variant="success" onClick={() => initiateOwnAssignment(req)}>Propio</Button>
                                        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => initiateRentAssignment(req)}>Alquiler</Button>
                                        <Button size="sm" variant="danger" onClick={() => updateStatusSimple(req.id, RequestStatus.BUY)}>Compra</Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <ReportView 
                  hideHeader={true}
                  compact={true}
                  title="2. Asignación Equipo Propio" 
                  status={RequestStatus.OWN} 
                  requests={requests} 
                  categories={categories} 
                  uos={uos} 
                  globalFilters={{ searchTerm, categoryFilter, uoFilter }}
                  onMarkCompleted={handleMarkAsCompleted} 
                  onUpdateRequest={handleUpdateRequest} 
                  onDeleteRequest={handleDeleteRequest} 
              />

              <ReportView 
                  hideHeader={true}
                  compact={true}
                  title="3. Gestión de Compra" 
                  status={RequestStatus.BUY} 
                  requests={requests} 
                  categories={categories} 
                  uos={uos} 
                  globalFilters={{ searchTerm, categoryFilter, uoFilter }}
                  onMarkCompleted={handleMarkAsCompleted} 
                  onUpdateRequest={handleUpdateRequest} 
                  onDeleteRequest={handleDeleteRequest} 
              />

              <ReportView 
                  hideHeader={true}
                  compact={true}
                  title="4. Alquiler de Equipos" 
                  status={RequestStatus.RENT} 
                  requests={requests} 
                  categories={categories} 
                  uos={uos} 
                  globalFilters={{ searchTerm, categoryFilter, uoFilter }}
                  onMarkCompleted={handleMarkAsCompleted} 
                  onUpdateRequest={handleUpdateRequest} 
                  onDeleteRequest={handleDeleteRequest} 
              />

            </div>
          )}

          {view === 'COMPLETED' && (
            <ReportView 
                title="Historial de Solicitudes Completadas" 
                status={RequestStatus.COMPLETED} 
                requests={requests} 
                categories={categories} 
                uos={uos} 
                onReturnToPending={handleRevertCompleted}
            />
          )}

          {view === 'SETTINGS' && (
            <SettingsView 
                uos={uos.map(u => u.nombre)} 
                onAddUO={async n => { await supabase.from('unidades_operativas').insert({nombre: n}); fetchInitialData(); }} 
                onDeleteUO={async n => { await supabase.from('unidades_operativas').delete().eq('nombre', n); fetchInitialData(); }} 
                onEditUO={async (o, n) => { await supabase.from('unidades_operativas').update({nombre: n}).eq('nombre', o); fetchInitialData(); }} 
                categories={categories.map(c => c.nombre)} 
                onAddCategory={async n => { await supabase.from('categorias').insert({nombre: n}); fetchInitialData(); }} 
                onDeleteCategory={async n => { await supabase.from('categorias').delete().eq('nombre', n); fetchInitialData(); }} 
                onEditCategory={async (o, n) => { await supabase.from('categorias').update({nombre: n}).eq('nombre', o); fetchInitialData(); }} 
                onChangePassword={handleUpdatePassword} 
            />
          )}
        </div>
      </main>

      <AssignOwnModal isOpen={isOwnModalOpen} onClose={() => setIsOwnModalOpen(false)} onConfirm={confirmOwnAssignment} request={selectedRequestForOwn} />
      <AssignRentModal isOpen={isRentModalOpen} onClose={() => setIsRentModalOpen(false)} onConfirm={confirmRentAssignment} request={selectedRequestForRent} />
    </div>
  );
};

const SidebarItem = ({ active, onClick, icon, label, count }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-all ${active ? 'bg-white text-[#1B4D3E] shadow-md shadow-black/10' : 'text-white/80 hover:bg-[#113026] hover:text-white'}`}>
    <div className="flex items-center gap-3">{icon}<span className="font-medium">{label}</span></div>
    {count > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-[#1B4D3E] text-white' : 'bg-[#113026] text-white/90'}`}>{count}</span>}
  </button>
);

export default App;
