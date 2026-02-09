
import React, { useState, useEffect } from 'react';
import { RequestForm } from './components/RequestForm';
import { EquipmentRequest, RequestStatus, ViewMode, OwnDetails, BuyDetails, UnidadOperativa, Categoria } from './types';
import { AssignOwnModal } from './components/AssignOwnModal';
import { AssignRentModal } from './components/AssignRentModal';
import { ReportView } from './components/ReportView';
import { SettingsView } from './components/SettingsView';
import { LoginScreen } from './components/LoginScreen';
import { LayoutDashboard, ShoppingCart, Key, Search, Calendar, Package, Settings, Filter, CheckSquare, LogOut, Pencil, Trash2, X, Save, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from './components/Button';
import { supabase } from './lib/supabase';

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
  const [isLoading, setIsLoading] = useState(true);
  
  // Pending Editing State
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
        // Fetch Password
        const { data: config } = await supabase.from('configuracion_sistema').select('*').eq('clave', 'app_password').single();
        if (config) setAppPassword(config.valor);

        // Fetch UOs
        const { data: uoData } = await supabase.from('unidades_operativas').select('*').order('nombre');
        if (uoData) setUos(uoData);

        // Fetch Categories
        const { data: catData } = await supabase.from('categorias').select('*').order('nombre');
        if (catData) setCategories(catData);

        // Fetch Requests + Asignaciones
        await fetchRequests();
    } catch (e) {
        console.error("Error fetching initial data", e);
    } finally {
        setIsLoading(false);
    }
  };

  const fetchRequests = async () => {
    // Fix: Added equipment details to the query via join
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

    // Flatten data for the UI
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
            // Each assignment acts as a partially or fully fulfilled item
            sol.asignaciones.forEach((asig: any) => {
                flattened.push({
                    ...baseRequest,
                    id: asig.id, // Use assignment ID for identification
                    solicitud_id: sol.id,
                    quantity: asig.cantidad_assigned || asig.cantidad_asignada, // Match column name
                    status: asig.tipo_gestion as RequestStatus,
                    rentalDuration: asig.alquiler_meses,
                    // Fix: Populate all required properties of OwnDetails from the joined 'equipos' data
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
                    fulfillmentType: sol.estado_general === 'COMPLETED' ? asig.tipo_gestion : undefined
                });
            });

            // If quantity total > assigned total, there is still a pending part
            const totalAssigned = sol.asignaciones.reduce((acc: number, curr: any) => acc + (curr.cantidad_assigned || curr.cantidad_asignada || 0), 0);
            if (totalAssigned < sol.cantidad_total) {
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
    const { data, error } = await supabase.from('solicitudes').insert({
        fecha_solicitud: req.requestDate,
        unidad_operativa_id: req.uo_id,
        categoria_id: req.categoria_id,
        descripcion: req.description,
        capacidad: req.capacity,
        cantidad_total: req.quantity,
        fecha_necesidad: req.needDate,
        comentarios: req.comments,
        estado_general: 'PENDING'
    }).select().single();

    if (!error) await fetchRequests();
  };

  const updateStatusSimple = async (id: string, status: RequestStatus) => {
      // Logic for simple status change (e.g. to BUY)
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
      const { error } = await supabase.from('solicitudes').update({
        descripcion: updates.description,
        capacidad: updates.capacity,
        cantidad_total: updates.quantity,
        fecha_necesidad: updates.needDate,
        comentarios: updates.comments
      }).eq('id', id);
      
      if (!error) await fetchRequests();
  };

  const handleDeleteRequest = async (id: string) => {
      const req = requests.find(r => r.id === id);
      if (!req) return;

      if (req.status === RequestStatus.PENDING) {
          await supabase.from('solicitudes').delete().eq('id', id);
      } else {
          // Return to pending = Delete assignment
          await supabase.from('asignaciones').delete().eq('id', id);
      }
      await fetchRequests();
  };

  const handleMarkAsCompleted = async (id: string) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    const solicitudId = (req as any).solicitud_id || req.id;
    await supabase.from('solicitudes').update({ estado_general: 'COMPLETED' }).eq('id', solicitudId);
    await fetchRequests();
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

  const pendingRequests = requests
    .filter(r => r.status === RequestStatus.PENDING)
    .filter(r => 
      (searchTerm === '' || r.uo_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || r.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (categoryFilter === '' || r.categoria_id === categoryFilter)
    );

  const stats = {
    pending: requests.filter(r => r.status === RequestStatus.PENDING).reduce((acc, curr) => acc + curr.quantity, 0),
    own: requests.filter(r => r.status === RequestStatus.OWN).length, 
    rent: requests.filter(r => r.status === RequestStatus.RENT).length,
    buy: requests.filter(r => r.status === RequestStatus.BUY).length,
    completed: requests.filter(r => r.status === RequestStatus.COMPLETED).length,
  };

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
          <SidebarItem active={view === 'DASHBOARD'} onClick={() => setView('DASHBOARD')} icon={<LayoutDashboard size={20} />} label="Solicitudes" count={stats.pending} />
          <div className="pt-6 pb-2 px-3 text-xs font-semibold uppercase text-white/50 tracking-wider">Reportes / Asignaciones</div>
          <SidebarItem active={view === 'REPORT_OWN'} onClick={() => setView('REPORT_OWN')} icon={<Key size={20} />} label="Asignación Propia" count={stats.own} />
          <SidebarItem active={view === 'REPORT_BUY'} onClick={() => setView('REPORT_BUY')} icon={<ShoppingCart size={20} />} label="Compra" count={stats.buy} />
          <SidebarItem active={view === 'REPORT_RENT'} onClick={() => setView('REPORT_RENT')} icon={<Calendar size={20} />} label="Alquiler" count={stats.rent} />
          <div className="pt-4 mt-2 border-t border-white/10">
            <SidebarItem active={view === 'COMPLETED'} onClick={() => setView('COMPLETED')} icon={<CheckSquare size={20} />} label="Completadas" count={stats.completed} />
          </div>
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
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                 <StatCard label="Pendientes (Cant)" value={stats.pending} color="blue" />
                 <StatCard label="Propios" value={stats.own} color="emerald" />
                 <StatCard label="Compra" value={stats.buy} color="red" />
                 <StatCard label="Alquiler" value={stats.rent} color="amber" />
              </div>

              <RequestForm onSubmit={handleAddRequest} uos={uos} categories={categories} />
              
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Package className="text-slate-500" />Solicitudes Pendientes</h3>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                     <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select className="pl-10 pr-4 py-2 border rounded-md text-sm w-full sm:w-48 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900 border-slate-300 appearance-none" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                            <option value="">Todas las Categorías</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                     </div>
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" placeholder="Buscar por UO o descripción..." className="pl-10 pr-4 py-2 border rounded-md text-sm w-full sm:w-64 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900 border-slate-300" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                     </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b">
                      <tr>
                        <th className="px-4 py-3">UO</th>
                        <th className="px-4 py-3">Categoría</th>
                        <th className="px-4 py-3">Descripción</th>
                        <th className="px-4 py-3">Detalle</th>
                        <th className="px-4 py-3">Cant.</th>
                        <th className="px-4 py-3">Necesidad</th>
                        <th className="px-4 py-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingRequests.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-8 text-slate-400">No hay solicitudes pendientes.</td></tr>
                      ) : (
                        pendingRequests.map((req) => {
                          const isEditing = editingPendingId === req.id;
                          const isDeleting = deletingPendingId === req.id;
                          return (
                            <tr key={req.id} className={`hover:bg-slate-50 transition-colors ${isEditing ? 'bg-blue-50/50' : ''}`}>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <select className="border rounded p-1 text-xs w-full bg-white text-slate-900 border-slate-300" value={editPendingValues.uo_id} onChange={(e) => setEditPendingValues({...editPendingValues, uo_id: e.target.value})}>
                                    {uos.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                                  </select>
                                ) : <span className="font-medium text-slate-900">{req.uo_nombre}</span>}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <select className="border rounded p-1 text-xs w-full bg-white text-slate-900 border-slate-300" value={editPendingValues.categoria_id} onChange={(e) => setEditPendingValues({...editPendingValues, categoria_id: e.target.value})}>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                  </select>
                                ) : <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-800 border border-slate-200">{req.categoria_nombre}</span>}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <input type="text" className="border rounded p-1 text-xs w-full bg-white text-slate-900 border-slate-300" value={editPendingValues.description} onChange={(e) => setEditPendingValues({...editPendingValues, description: e.target.value})} />
                                ) : <div className="font-medium text-slate-800">{req.description}</div>}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <input type="text" className="border rounded p-1 text-xs w-full bg-white text-slate-900 border-slate-300" value={editPendingValues.capacity} onChange={(e) => setEditPendingValues({...editPendingValues, capacity: e.target.value})} />
                                ) : <span className="text-slate-600">{req.capacity}</span>}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <input type="number" className="border rounded p-1 text-xs w-20 bg-white text-slate-900 border-slate-300" value={editPendingValues.quantity} onChange={(e) => setEditPendingValues({...editPendingValues, quantity: parseInt(e.target.value)})} />
                                ) : <span className="font-semibold">{req.quantity}</span>}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <input type="date" className="border rounded p-1 text-xs bg-white text-slate-900 border-slate-300" value={editPendingValues.needDate} onChange={(e) => setEditPendingValues({...editPendingValues, needDate: e.target.value})} />
                                ) : <span className="whitespace-nowrap text-red-600 font-medium">{req.needDate}</span>}
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
            </div>
          )}

          {view === 'REPORT_OWN' && <ReportView title="Asignación de Equipo Propio" status={RequestStatus.OWN} requests={requests} onMarkCompleted={handleMarkAsCompleted} onUpdateRequest={handleUpdateRequest} onDeleteRequest={handleDeleteRequest} />}
          {view === 'REPORT_BUY' && <ReportView title="Compra de Equipos" status={RequestStatus.BUY} requests={requests} onMarkCompleted={handleMarkAsCompleted} onUpdateRequest={handleUpdateRequest} onDeleteRequest={handleDeleteRequest} />}
          {view === 'REPORT_RENT' && <ReportView title="Alquiler de Equipos" status={RequestStatus.RENT} requests={requests} onMarkCompleted={handleMarkAsCompleted} onUpdateRequest={handleUpdateRequest} onDeleteRequest={handleDeleteRequest} />}
          {view === 'COMPLETED' && <ReportView title="Solicitudes Completadas" status={RequestStatus.COMPLETED} requests={requests} />}
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

const StatCard = ({ label, value, color }: any) => {
    const colors: any = { blue: "bg-blue-50 border-blue-200 text-blue-700", emerald: "bg-emerald-50 border-emerald-200 text-emerald-700", red: "bg-red-50 border-red-200 text-red-700", amber: "bg-amber-50 border-amber-200 text-amber-700" };
    return (<div className={`p-4 rounded-lg border ${colors[color]} flex flex-col items-center justify-center`}><span className="text-2xl font-bold">{value}</span><span className="text-xs uppercase tracking-wide opacity-80">{label}</span></div>);
}

export default App;
