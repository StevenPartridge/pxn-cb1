import HID from 'node-hid';
import type { HIDDevice, ParsedEvent, Config, Logger } from '../types/index.js';
import type { EventParser } from '../parsers/index.js';
import type { ActionRegistry } from '../actions/index.js';

export class HIDDeviceManager {
  private device: HID.HID | null = null;
  private isConnected = false;
  private lastButtonStates: boolean[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(
    private config: Config,
    private logger: Logger,
    private parser: EventParser,
    private actionRegistry: ActionRegistry
  ) {}

  /**
   * Enumerate all available HID devices
   */
  enumerateDevices(): HIDDevice[] {
    try {
      const devices = HID.devices();
      return devices.map(device => ({
        vendorId: device.vendorId,
        productId: device.productId,
        path: device.path || '',
        serialNumber: device.serialNumber || '',
        manufacturer: device.manufacturer || '',
        product: device.product || '',
        release: device.release,
        interface: device.interface,
        usagePage: device.usagePage || 0,
        usage: device.usage || 0,
      }));
    } catch (error) {
      this.logger.error('Failed to enumerate HID devices:', error);
      return [];
    }
  }

  /**
   * Find and connect to the configured device
   */
  async connect(): Promise<boolean> {
    try {
      const devices = this.enumerateDevices();
      this.logger.info(`Found ${devices.length} HID devices`);

      // Log all devices for debugging
      devices.forEach((device, index) => {
        this.logger.debug(`Device ${index}:`, {
          vendorId: `0x${device.vendorId.toString(16).toUpperCase()}`,
          productId: `0x${device.productId.toString(16).toUpperCase()}`,
          product: device.product,
          manufacturer: device.manufacturer,
        });
      });

      // Find target device
      const targetDevice = devices.find(
        device =>
          device.vendorId === this.config.device.vendorId &&
          device.productId === this.config.device.productId
      );

      if (!targetDevice) {
        this.logger.error(
          `Target device not found. Looking for vendorId: 0x${this.config.device.vendorId.toString(16).toUpperCase()}, productId: 0x${this.config.device.productId.toString(16).toUpperCase()}`
        );
        this.logger.info('Available devices:');
        devices.forEach(device => {
          this.logger.info(
            `- ${device.product || 'Unknown'} (${device.manufacturer || 'Unknown'}) - Vendor: 0x${device.vendorId.toString(16).toUpperCase()}, Product: 0x${device.productId.toString(16).toUpperCase()}`
          );
        });
        return false;
      }

      this.logger.info(`Connecting to device: ${targetDevice.product || 'Unknown'}`);
      
      // Connect to the device
      this.device = new HID.HID(targetDevice.path!);
      this.isConnected = true;

      // Set up event handlers
      this.setupEventHandlers();

      this.logger.info('Successfully connected to HID device');
      return true;
    } catch (error) {
      this.logger.error('Failed to connect to HID device:', error);
      return false;
    }
  }

  /**
   * Disconnect from the device
   */
  disconnect(): void {
    if (this.device) {
      this.device.close();
      this.device = null;
      this.isConnected = false;
      this.logger.info('Disconnected from HID device');
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Check if device is connected
   */
  isDeviceConnected(): boolean {
    return this.isConnected && this.device !== null;
  }

  /**
   * Set up event handlers for the HID device
   */
  private setupEventHandlers(): void {
    if (!this.device) return;

    this.device.on('data', (data: Buffer) => {
      this.handleDeviceData(data);
    });

    this.device.on('error', (error: Error) => {
      this.logger.error('HID device error:', error);
      this.isConnected = false;
    });

    this.device.on('close', () => {
      this.logger.warn('HID device connection closed');
      this.isConnected = false;
    });
  }

  /**
   * Handle incoming data from the HID device
   */
  private handleDeviceData(data: Buffer): void {
    try {
      // Log raw data if enabled
      if (this.config.logging.enableRawData) {
        this.logger.debug('Raw HID data:', data.toString('hex'));
      }

      // Parse the data
      const parsedEvent = this.parser.parse(data);
      
      // Apply debouncing
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        this.processButtonStates(parsedEvent);
      }, this.config.polling.debounce);

    } catch (error) {
      this.logger.error('Error processing device data:', error);
    }
  }

  /**
   * Process button state changes and trigger actions
   */
  private async processButtonStates(event: ParsedEvent): Promise<void> {
    const currentStates = event.buttonStates;
    const previousStates = this.lastButtonStates;

    // Find buttons that were just pressed (transition from false to true)
    for (let i = 0; i < Math.max(currentStates.length, previousStates.length); i++) {
      const currentState = currentStates[i] || false;
      const previousState = previousStates[i] || false;

      if (currentState && !previousState) {
        // Button was just pressed
        await this.triggerButtonAction(i, event);
      }
    }

    // Update last known states
    this.lastButtonStates = [...currentStates];
  }

  /**
   * Trigger action for a specific button
   */
  private async triggerButtonAction(buttonIndex: number, event: ParsedEvent): Promise<void> {
    const actionMapping = this.config.actions[buttonIndex];
    
    if (!actionMapping) {
      this.logger.debug(`No action mapped for button ${buttonIndex}`);
      return;
    }

    try {
      this.logger.info(`Button ${buttonIndex} (${actionMapping.name}) pressed`);
      
      const context = {
        buttonIndex,
        buttonName: actionMapping.name,
        timestamp: event.timestamp,
        rawData: event.rawData,
        deviceId: event.deviceId,
      };

      await this.actionRegistry.executeAction(actionMapping.action, context);
    } catch (error) {
      this.logger.error(`Failed to execute action for button ${buttonIndex}:`, error);
    }
  }
} 