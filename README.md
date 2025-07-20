# PXN CB1 HID Monitor

A TypeScript Node.js application for monitoring USB HID devices like the PXN CB1 button box. This project provides a modular, extensible framework for listening to button presses and executing custom actions.

## Features

- **USB HID Device Monitoring**: Listen to button presses from USB HID devices
- **Modular Parser System**: Support for different device types with custom parsers
- **Extensible Action System**: Execute custom actions when buttons are pressed
- **Configuration Management**: Flexible configuration via JSON files or environment variables
- **Logging**: Comprehensive logging with different levels and colorized output
- **Graceful Shutdown**: Proper cleanup and error handling

## Prerequisites

- Node.js 18.0.0 or higher
- npm, yarn, or pnpm
- USB HID device (like PXN CB1 button box)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pxn_cb1
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Build the project:
```bash
npm run build
```

## Finding Your Device's Vendor and Product IDs

Before running the application, you need to find your device's vendor and product IDs:

### On macOS/Linux:
```bash
# List all USB devices
lsusb

# Or use the built-in device enumeration
npm run dev
```

### On Windows:
```bash
# Use Device Manager or PowerShell
Get-PnpDevice | Where-Object {$_.Class -eq "USB"}
```

### Using the Application:
The application will automatically enumerate and display all available HID devices when it starts. Look for output like:
```
[2024-01-01T12:00:00.000Z] INFO: Found 5 HID devices
[2024-01-01T12:00:00.000Z] DEBUG: Device 0: { vendorId: '0x0483', productId: '0x5750', product: 'PXN CB1', manufacturer: 'PXN' }
```

## Configuration

### Environment Variables

You can configure the application using environment variables:

```bash
# Device configuration
export HID_VENDOR_ID=0x0483
export HID_PRODUCT_ID=0x5750
export HID_DEVICE_NAME="PXN CB1 Button Box"

# Polling configuration
export HID_POLLING_FREQUENCY=10
export HID_DEBOUNCE=50

# Logging configuration
export HID_LOG_LEVEL=info
export HID_ENABLE_RAW_DATA=false
```

### Configuration File

Create a `config.json` file in the project root:

```json
{
  "device": {
    "vendorId": 1155,
    "productId": 22352,
    "name": "PXN CB1 Button Box"
  },
  "polling": {
    "frequency": 10,
    "debounce": 50
  },
  "actions": {
    "0": {
      "name": "Button 1",
      "action": "log",
      "description": "Log button press"
    },
    "1": {
      "name": "Button 2",
      "action": "open https://www.google.com",
      "description": "Open Google"
    },
    "2": {
      "name": "Button 3",
      "action": "macro:log|open https://www.github.com",
      "description": "Log and open GitHub"
    }
  },
  "logging": {
    "level": "info",
    "enableRawData": false
  }
}
```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Available Scripts

- `npm run dev` - Start in development mode with hot reload
- `npm run build` - Build the TypeScript project
- `npm start` - Start the built application
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run clean` - Clean build artifacts

## Action Types

### 1. Log Action
Simple logging of button presses:
```json
{
  "name": "Button 1",
  "action": "log"
}
```

### 2. Shell Command
Execute shell commands:
```json
{
  "name": "Button 2",
  "action": "open https://www.google.com"
}
```

### 3. Macro Actions
Execute multiple actions in sequence:
```json
{
  "name": "Button 3",
  "action": "macro:log|open https://www.github.com|echo 'Button pressed'"
}
```

## Example Output

```
[2024-01-01T12:00:00.000Z] INFO: Starting HID Monitor...
[2024-01-01T12:00:00.000Z] INFO: Found 5 HID devices
[2024-01-01T12:00:00.000Z] INFO: Connecting to device: PXN CB1
[2024-01-01T12:00:00.000Z] INFO: Successfully connected to HID device
[2024-01-01T12:00:00.000Z] INFO: HID Monitor is running and listening for button presses
[2024-01-01T12:00:05.000Z] INFO: Button 0 (Button 1) pressed
[2024-01-01T12:00:05.000Z] INFO: Button pressed: Button 1 (index: 0)
[2024-01-01T12:00:08.000Z] INFO: Button 1 (Button 2) pressed
[2024-01-01T12:00:08.000Z] INFO: Executing shell command: open https://www.google.com
```

## Extending the Application

### Adding Custom Parsers

Create a new parser by implementing the `EventParser` interface:

```typescript
import type { EventParser, HIDDevice, ParsedEvent } from '../types/index.js';

export class CustomParser implements EventParser {
  name = 'CustomParser';

  supportsDevice(device: HIDDevice): boolean {
    return device.vendorId === 0x1234 && device.productId === 0x5678;
  }

  parse(data: Buffer): ParsedEvent {
    // Custom parsing logic here
    return {
      timestamp: Date.now(),
      buttonStates: [/* parsed button states */],
      rawData: data,
      deviceId: 'custom-device',
    };
  }
}
```

### Adding Custom Action Runners

Create a new action runner by implementing the `ActionRunner` interface:

```typescript
import type { ActionRunner, Logger } from '../types/index.js';

export class CustomActionRunner implements ActionRunner {
  name = 'CustomActionRunner';

  constructor(private logger: Logger) {}

  async execute(action: string, context?: Record<string, unknown>): Promise<void> {
    // Custom action logic here
    this.logger.info(`Executing custom action: ${action}`);
  }
}
```

## Troubleshooting

### Permission Issues (Linux/macOS)

On Linux and macOS, you might need to run the application with elevated privileges or configure udev rules:

```bash
# Run with sudo (not recommended for production)
sudo npm start

# Or configure udev rules (Linux)
echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="0483", ATTR{idProduct}=="5750", MODE="0666"' | sudo tee /etc/udev/rules.d/99-pxn-cb1.rules
sudo udevadm control --reload-rules
```

### Device Not Found

1. Check if your device is properly connected
2. Verify vendor and product IDs
3. Ensure the device is recognized by the OS
4. Try running with debug logging: `HID_LOG_LEVEL=debug npm run dev`

### Build Issues

If you encounter TypeScript compilation errors:

1. Ensure all dependencies are installed: `npm install`
2. Clean and rebuild: `npm run clean && npm run build`
3. Check TypeScript version compatibility

## Project Structure

```
src/
├── actions/          # Action runners (log, shell, macros)
├── config/           # Configuration management
├── hid/              # HID device management
├── parsers/          # Event parsers for different devices
├── types/            # TypeScript type definitions
├── utils/            # Utilities (logging, etc.)
└── index.ts          # Main entry point
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Search existing issues
3. Create a new issue with detailed information about your setup 