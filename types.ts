export enum RequestStatus {
  PENDING = 'PENDING',
  OWN = 'OWN',
  RENT = 'RENT',
  BUY = 'BUY',
  COMPLETED = 'COMPLETED'
}

export interface OwnDetails {
  internalId: string;
  brand: string;
  model: string;
  hours: number;
  availabilityDate: string;
}

export interface BuyDetails {
  vendor: string;
  deliveryDate: string;
}

export interface EquipmentRequest {
  id: string;
  requestDate: string;
  uo: string; // Unidad Operativa
  category: string; // Nueva Categoría
  description: string;
  capacity: string;
  quantity: number;
  needDate: string;
  comments: string;
  status: RequestStatus;
  ownDetails?: OwnDetails; // Only if status is OWN
  buyDetails?: BuyDetails; // Only if status is BUY
  rentalDuration?: number; // Only if status is RENT (in months)
  fulfillmentType?: RequestStatus; // To track if it was OWN, RENT or BUY when completed
}

export type ViewMode = 'DASHBOARD' | 'REPORT_OWN' | 'REPORT_RENT' | 'REPORT_BUY' | 'COMPLETED' | 'SETTINGS';