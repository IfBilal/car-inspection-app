// Database row types. Mirrors supabase/migrations/0001_schema.sql.
// Replace with `supabase gen types typescript` output once a project is linked.

export type InspectionStatus = 'draft' | 'completed';
export type ItemResult = 'pass' | 'fail' | 'na' | 'repair';
export type Recommendation = 'buy' | 'negotiate' | 'walk_away';
export type DamageMarkType = 'dent' | 'scratch' | 'rust';
export type VehicleBodyType =
  | 'suv'
  | 'truck'
  | 'dual_cab_ute'
  | 'hatchback'
  | 'sedan'
  | 'single_cab_ute'
  | 'van'
  | 'wagon';
/** Normalized (0..1) position on the damage diagram image */
export type DamageMark = { x: number; y: number; t: DamageMarkType };

export type Profile = {
  id: string;
  full_name: string;
  company_name: string;
  phone: string | null;
  created_at: string;
};

export type Client = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  created_by: string | null;
  created_at: string;
};

export type Vehicle = {
  id: string;
  registration_plate: string | null;
  chassis_number: string | null;
  vin: string | null;
  make: string;
  model: string;
  year: number | null;
  colour: string | null;
  trim: string | null;
  engine_size: string | null;
  transmission: string | null;
  fuel_type: string | null;
  drive_type: string | null;
  body_type: VehicleBodyType | null;
  created_by: string | null;
  created_at: string;
};

export type SectionKind = 'status' | 'passfail' | 'flags';

export type ChecklistSection = {
  id: number;
  title: string;
  emoji_icon: string;
  sort_order: number;
  /** drives rating labels: status=OK/Needs Attention/Critical, passfail=Pass/Fail/N-A, flags=Yes/No */
  kind: SectionKind;
};

export type ChecklistItem = {
  id: number;
  section_id: number;
  item_number: number;
  label: string;
  description: string | null;
  sort_order: number;
};

export type Inspection = {
  id: string;
  vehicle_id: string;
  client_id: string;
  inspector_id: string;
  status: InspectionStatus;
  odometer_km: number | null;
  seller: string | null;
  purchase_price: number | null;
  overall_score: number | null;
  recommendation: Recommendation | null;
  inspector_notes: string | null;
  estimated_repair_cost: number | null;
  obd_ready: boolean | null;
  obd_codes: string | null;
  obd_notes: string | null;
  damage_marks: DamageMark[] | null;
  signature_path: string | null;
  pdf_path: string | null;
  email_sent_at: string | null;
  current_step: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type InspectionResult = {
  inspection_id: string;
  item_id: number;
  result: ItemResult;
  note: string | null;
};

export type InspectionPhoto = {
  id: string;
  inspection_id: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
};

// Common joined shapes
export type InspectionWithRelations = Inspection & {
  client: Pick<Client, 'id' | 'full_name' | 'email'>;
  vehicle: Pick<Vehicle, 'id' | 'make' | 'model' | 'year' | 'registration_plate'>;
  inspector: Pick<Profile, 'id' | 'full_name'>;
};

export type VehicleWithHistory = Vehicle & {
  inspections: InspectionWithRelations[];
};
