import { readFileSync } from 'node:fs';
import type { Config } from '../types/index.js';

const DEFAULT_CONFIG: Config = {
  device: {
    vendorId: 0x36E6, // PXN CB1 vendor ID
    productId: 0x8001, // PXN CB1 product ID
    name: 'PXN CB1 Button Box',
  },
  polling: {
    frequency: 10, // 10ms polling frequency
    debounce: 50, // 50ms debounce
  },
  actions: {
    0: { name: 'Button 1', action: 'log', description: 'Log button press' },
    1: { name: 'Button 2', action: 'log', description: 'Log button press' },
    2: { name: 'Button 3', action: 'log', description: 'Log button press' },
    3: { name: 'Button 4', action: 'log', description: 'Log button press' },
    4: { name: 'Button 5', action: 'log', description: 'Log button press' },
    5: { name: 'Button 6', action: 'log', description: 'Log button press' },
    6: { name: 'Button 7', action: 'log', description: 'Log button press' },
    7: { name: 'Button 8', action: 'log', description: 'Log button press' },
  },
  logging: {
    level: 'info',
    enableRawData: false,
  },
};

export class ConfigManager {
  private config: Config;

  constructor(configPath?: string) {
    this.config = this.loadConfig(configPath);
  }

  private loadConfig(configPath?: string): Config {
    try {
      if (configPath) {
        const configFile = readFileSync(configPath, 'utf-8');
        const fileConfig = JSON.parse(configFile) as Partial<Config>;
        return this.mergeConfig(DEFAULT_CONFIG, fileConfig);
      }
    } catch (error) {
      console.warn(`Failed to load config file: ${error}`);
    }

    // Override with environment variables
    const envConfig = this.loadFromEnvironment();
    return this.mergeConfig(DEFAULT_CONFIG, envConfig);
  }

  private loadFromEnvironment(): Partial<Config> {
    const envConfig: Partial<Config> = {};

    if (process.env.HID_VENDOR_ID) {
      envConfig.device = { 
        ...envConfig.device, 
        vendorId: parseInt(process.env.HID_VENDOR_ID, 16),
        productId: envConfig.device?.productId ?? DEFAULT_CONFIG.device.productId
      };
    }

    if (process.env.HID_PRODUCT_ID) {
      envConfig.device = { 
        ...envConfig.device, 
        productId: parseInt(process.env.HID_PRODUCT_ID, 16),
        vendorId: envConfig.device?.vendorId ?? DEFAULT_CONFIG.device.vendorId
      };
    }

    if (process.env.HID_DEVICE_NAME) {
      envConfig.device = { 
        ...envConfig.device, 
        name: process.env.HID_DEVICE_NAME,
        vendorId: envConfig.device?.vendorId ?? DEFAULT_CONFIG.device.vendorId,
        productId: envConfig.device?.productId ?? DEFAULT_CONFIG.device.productId
      };
    }

    if (process.env.HID_POLLING_FREQUENCY) {
      envConfig.polling = { 
        ...envConfig.polling, 
        frequency: parseInt(process.env.HID_POLLING_FREQUENCY),
        debounce: envConfig.polling?.debounce ?? DEFAULT_CONFIG.polling.debounce
      };
    }

    if (process.env.HID_DEBOUNCE) {
      envConfig.polling = { 
        ...envConfig.polling, 
        debounce: parseInt(process.env.HID_DEBOUNCE),
        frequency: envConfig.polling?.frequency ?? DEFAULT_CONFIG.polling.frequency
      };
    }

    if (process.env.HID_LOG_LEVEL) {
      envConfig.logging = { 
        ...envConfig.logging, 
        level: process.env.HID_LOG_LEVEL as Config['logging']['level'],
        enableRawData: envConfig.logging?.enableRawData ?? DEFAULT_CONFIG.logging.enableRawData
      };
    }

    if (process.env.HID_ENABLE_RAW_DATA) {
      envConfig.logging = { 
        ...envConfig.logging, 
        enableRawData: process.env.HID_ENABLE_RAW_DATA === 'true',
        level: envConfig.logging?.level ?? DEFAULT_CONFIG.logging.level
      };
    }

    return envConfig;
  }

  private mergeConfig(defaultConfig: Config, overrideConfig: Partial<Config>): Config {
    return {
      ...defaultConfig,
      ...overrideConfig,
      device: { ...defaultConfig.device, ...overrideConfig.device },
      polling: { ...defaultConfig.polling, ...overrideConfig.polling },
      actions: { ...defaultConfig.actions, ...overrideConfig.actions },
      logging: { ...defaultConfig.logging, ...overrideConfig.logging },
    };
  }

  getConfig(): Config {
    return this.config;
  }

  updateConfig(updates: Partial<Config>): void {
    this.config = this.mergeConfig(this.config, updates);
  }
} 