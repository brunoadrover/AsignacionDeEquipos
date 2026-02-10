
export enum RequestStatus {
  PENDING = 'PENDING',
  OWN = 'OWN',
  RENT = 'RENT',
  BUY = 'BUY',
  COMPLETED = 'COMPLETED'
}

export interface OwnDetails {
  id?: string;
  internalId: string;
  brand: string;
  model: string;
  hours: number;
  availabilityDate: string;
  equipo_id?: string;
}

export interface BuyDetails {
  vendor: string;
  deliveryDate: string;
}

export interface UnidadOperativa {
  id: string;
  nombre: string;
}

export interface Categoria {
  id: string;
  nombre: string;
}

export interface EquipmentRequest {
  id: string;
  requestDate: string;
  uo_id: string;
  uo_nombre?: string;
  categoria_id: string;
  categoria_nombre?: string;
  description: string;
  capacity: string;
  quantity: number;
  needDate: string;
  comments: string;
  status: RequestStatus;
  
  solicitud_id?: string;
  ownDetails?: OwnDetails;
  buyDetails?: BuyDetails;
  rentalDuration?: number;
  fulfillmentType?: RequestStatus;
  
  unidad_operativa?: UnidadOperativa;
  categoria?: Categoria;
}

export type ViewMode = 'DASHBOARD' | 'COMPLETED' | 'SETTINGS';
