import { ConsoleLogger } from './utils/logger.js';
import { ConfigManager } from './config/index.js';
import { ParserRegistry } from './parsers/index.js';
import { ActionRegistry } from './actions/index.js';
import { HIDDeviceManager } from './hid/device-manager.js';

class HIDMonitor {
  private logger: ConsoleLogger;
  private configManager: ConfigManager;
  private parserRegistry: ParserRegistry;
  private actionRegistry: ActionRegistry;
  private deviceManager: HIDDeviceManager;
  private isRunning = false;

  constructor() {
    // Initialize logger first
    this.logger = new ConsoleLogger('info');
    
    // Load configuration
    this.configManager = new ConfigManager();
    const config = this.configManager.getConfig();
    
    // Set log level from config
    this.logger.setLevel(config.logging.level);
    
    // Initialize components
    this.parserRegistry = new ParserRegistry();
    this.actionRegistry = new ActionRegistry(this.logger);
    
    // Initialize device manager
    const parser = this.parserRegistry.getParserForDevice({
      vendorId: config.device.vendorId,
      productId: config.device.productId,
      release: 0,
      interface: 0,
    }) || this.parserRegistry.getAllParsers()[0];
    
    this.deviceManager = new HIDDeviceManager(
      config,
      this.logger,
      parser,
      this.actionRegistry
    );
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('HID Monitor is already running');
      return;
    }

    this.logger.info('Starting HID Monitor...');
    this.logger.info('Press Ctrl+C to stop');

    try {
      // Connect to the device
      const connected = await this.deviceManager.connect();
      
      if (!connected) {
        this.logger.error('Failed to connect to HID device. Exiting.');
        process.exit(1);
      }

      this.isRunning = true;
      this.logger.info('HID Monitor is running and listening for button presses');

      // Set up graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      this.logger.error('Failed to start HID Monitor:', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping HID Monitor...');
    
    try {
      this.deviceManager.disconnect();
      this.isRunning = false;
      this.logger.info('HID Monitor stopped');
    } catch (error) {
      this.logger.error('Error stopping HID Monitor:', error);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, shutting down gracefully...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception:', error);
      this.stop().finally(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason) => {
      this.logger.error('Unhandled rejection:', reason);
      this.stop().finally(() => process.exit(1));
    });
  }

  getStatus(): { isRunning: boolean; isConnected: boolean } {
    return {
      isRunning: this.isRunning,
      isConnected: this.deviceManager.isDeviceConnected(),
    };
  }
}

// Main execution
async function main(): Promise<void> {
  const monitor = new HIDMonitor();
  await monitor.start();
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { HIDMonitor }; 