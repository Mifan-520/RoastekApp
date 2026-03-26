export interface DeviceConfig {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  location?: string;
  address?: string;
  [key: string]: unknown;
}

export interface HMISummaryItem {
  id: string;
  label: string;
  value: string;
  unit?: string;
  tone?: "rose" | "amber";
}

export interface HMIControlItem {
  id: string;
  label: string;
  description: string;
  icon?: "fan" | "power" | "gauge" | string;
  active: boolean;
  tone?: "rose" | "amber";
}

export interface ModeParams {
  fireMinutes: number;
  closeMinutes: number;
}

export interface HMIEquipment {
  id: string;
  name: string;
  status: "online" | "offline";
}

export interface HMIBin {
  id: number;
  weight: number;
  maxWeight: number;
}

export interface HMIFrequency {
  current: number;
  target: number;
}

export interface HMIDataShape {
  summary?: HMISummaryItem[];
  controls?: HMIControlItem[];
  modes?: ModeParams[];
  temperature?: number;
  powerOn?: boolean;
  currentMode?: number;
  countMode?: 0 | 1 | 2;
  restSeconds?: number;
  lastTelemetryAt?: string;
  equipment?: HMIEquipment[];
  bins?: HMIBin[];
  frequency?: HMIFrequency;
}

export type HMIControlValue =
  | boolean
  | number
  | string
  | ModeParams
  | ModeParams[]
  | HMIFrequency
  | Record<string, unknown>;

export type HMIControlChangeHandler = (controlId: string, value: HMIControlValue) => void;

export interface HMIComponentProps<TData extends HMIDataShape = HMIDataShape> {
  data: TData;
  deviceId?: string;
  deviceName?: string;
  config?: DeviceConfig;
  onConfigChange?: (config: DeviceConfig) => void;
  onControlChange?: HMIControlChangeHandler;
}

export type ModeChangeHandler = (mode: string) => void;
export type PowerChangeHandler = (powerOn: boolean) => void;
