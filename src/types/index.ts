export interface HIDDevice {
  vendorId: number;
  productId: number;
  path?: string;
  serialNumber?: string;
  manufacturer?: string;
  product?: string;
  release: number;
  interface: number;
  usagePage?: number;
  usage?: number;
}

export interface ParsedEvent {
  timestamp: number;
  buttonStates: boolean[];
  rawData: Buffer;
  deviceId: string;
}

export interface ActionMapping {
  [buttonIndex: number]: {
    name: string;
    action: string;
    description?: string;
  };
}

export interface Config {
  device: {
    vendorId: number;
    productId: number;
    name?: string;
  };
  polling: {
    frequency: number; // milliseconds
    debounce: number; // milliseconds
  };
  actions: ActionMapping;
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableRawData: boolean;
  };
}

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

export interface EventParser {
  name: string;
  parse: (data: Buffer) => ParsedEvent;
  supportsDevice: (device: HIDDevice) => boolean;
}

export interface ActionRunner {
  name: string;
  execute: (action: string, context?: Record<string, unknown>) => Promise<void>;
} 