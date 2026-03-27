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

export interface HMISyncExpectedState {
  currentMode: number;
  countMode: number;
  baseRestSeconds: number;
  closeSeconds?: number;
  modes?: ModeParams[];
  updatedAt: string;
  sourceCommand: string;
  toleranceSeconds: number;
}

export interface HMISyncTelemetryState {
  currentMode: number;
  countMode: number;
  restSeconds: number;
  modes?: ModeParams[];
  lastTelemetryAt?: string;
}

export interface HMISyncState {
  status: "idle" | "pending" | "matched" | "warning";
  lastCheckedAt?: string;
  lastCommand?: {
    command: string;
    params: Record<string, unknown>;
    issuedAt: string;
  };
  expected?: HMISyncExpectedState;
  telemetry?: HMISyncTelemetryState;
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
  syncState?: HMISyncState | null;
  onConfigChange?: (config: DeviceConfig) => void;
  onControlChange?: HMIControlChangeHandler;
}

export type ModeChangeHandler = (mode: string) => void;
export type PowerChangeHandler = (powerOn: boolean) => void;
