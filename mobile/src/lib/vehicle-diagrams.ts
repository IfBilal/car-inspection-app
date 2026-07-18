import type { ImageSourcePropType } from 'react-native';

export const BODY_TYPE_OPTIONS = [
  'SUV',
  'Truck',
  'Dual cab ute',
  'Hatchback',
  'Sedan',
  'Single cab ute',
  'Van',
  'Wagon',
] as const;

export type VehicleBodyType =
  | 'suv'
  | 'truck'
  | 'dual_cab_ute'
  | 'hatchback'
  | 'sedan'
  | 'single_cab_ute'
  | 'van'
  | 'wagon';

type Diagram = { source: ImageSourcePropType; aspect: number; label: string };

const diagrams: Record<VehicleBodyType, Diagram> = {
  suv: { source: require('../../assets/images/SUV.jpeg'), aspect: 1346 / 1169, label: 'SUV' },
  truck: { source: require('../../assets/images/Truck.jpeg'), aspect: 1383 / 1137, label: 'Truck' },
  dual_cab_ute: { source: require('../../assets/images/dual_cab_ute.jpeg'), aspect: 1179 / 1088, label: 'Dual cab ute' },
  hatchback: { source: require('../../assets/images/hatchback.jpeg'), aspect: 1179 / 1262, label: 'Hatchback' },
  sedan: { source: require('../../assets/images/sedan.jpeg'), aspect: 1179 / 1056, label: 'Sedan' },
  single_cab_ute: { source: require('../../assets/images/single_cab_ute.jpeg'), aspect: 1306 / 1205, label: 'Single cab ute' },
  van: { source: require('../../assets/images/van.jpeg'), aspect: 1343 / 1171, label: 'Van' },
  wagon: { source: require('../../assets/images/wagon.jpeg'), aspect: 1179 / 1042, label: 'Wagon' },
};

const legacyDiagram: Diagram = {
  source: require('../../assets/images/damage-diagram.png'),
  aspect: 2114 / 826,
  label: 'Passenger car',
};

export function bodyTypeFromLabel(label: string): VehicleBodyType {
  return label.toLowerCase().replaceAll(' ', '_') as VehicleBodyType;
}

export function getVehicleDiagram(bodyType: VehicleBodyType | null | undefined): Diagram {
  return bodyType ? diagrams[bodyType] : legacyDiagram;
}
