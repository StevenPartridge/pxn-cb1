import type { HIDDevice, ParsedEvent } from '../types/index.js';
import { PXNCB1DetailedParser } from './pxn-cb1-parser.js';
import { PXNCB1AccurateParser } from './pxn-cb1-accurate-parser.js';

export interface EventParser {
  name: string;
  parse: (data: Buffer) => ParsedEvent;
  supportsDevice: (device: HIDDevice) => boolean;
}

/**
 * Generic button parser that interprets the first byte as individual bit flags
 * Each bit represents a button state (pressed = 1, released = 0)
 */
export class ButtonParser implements EventParser {
  name = 'ButtonParser';

  supportsDevice(_device: HIDDevice): boolean {
    // This parser works with most button boxes
    // You can add specific vendor/product ID checks here
    return true;
  }

  parse(data: Buffer): ParsedEvent {
    const timestamp = Date.now();
    const buttonStates: boolean[] = [];

    // Parse first byte as individual button states
    if (data.length > 0) {
      const firstByte = data[0];
      
      // Extract each bit (8 buttons)
      for (let i = 0; i < 8; i++) {
        buttonStates.push((firstByte & (1 << i)) !== 0);
      }
    }

    // If there are more bytes, they might represent additional buttons
    // or other data (analog values, etc.)
    for (let i = 1; i < data.length; i++) {
      const byte = data[i];
      for (let j = 0; j < 8; j++) {
        buttonStates.push((byte & (1 << j)) !== 0);
      }
    }

    return {
      timestamp,
      buttonStates,
      rawData: data,
      deviceId: 'button-box',
    };
  }
}

/**
 * PXN CB1 specific parser
 * This is a placeholder - you'll need to reverse engineer the actual data format
 */
export class PXNCB1Parser implements EventParser {
  name = 'PXNCB1Parser';

  supportsDevice(device: HIDDevice): boolean {
    // PXN CB1 vendor/product IDs
    return device.vendorId === 0x36E6 && device.productId === 0x8001;
  }

  parse(data: Buffer): ParsedEvent {
    const timestamp = Date.now();
    const buttonStates: boolean[] = [];

    // PXN CB1 specific parsing logic
    // This is a placeholder - you'll need to analyze the actual data format
    if (data.length >= 1) {
      const firstByte = data[0];
      
      // Example: PXN CB1 might use different bit patterns
      // You'll need to reverse engineer this from actual device data
      for (let i = 0; i < 8; i++) {
        buttonStates.push((firstByte & (1 << i)) !== 0);
      }
    }

    return {
      timestamp,
      buttonStates,
      rawData: data,
      deviceId: 'pxn-cb1',
    };
  }
}

/**
 * Parser registry for managing multiple parsers
 */
export class ParserRegistry {
  private parsers: EventParser[] = [];

  constructor() {
    // Register default parsers
    this.register(new ButtonParser());
    this.register(new PXNCB1AccurateParser()); // Use the accurate parser
    this.register(new PXNCB1DetailedParser()); // Keep as fallback
  }

  register(parser: EventParser): void {
    this.parsers.push(parser);
  }

  getParserForDevice(device: HIDDevice): EventParser | null {
    for (const parser of this.parsers) {
      if (parser.supportsDevice(device)) {
        return parser;
      }
    }
    return null;
  }

  getAllParsers(): EventParser[] {
    return [...this.parsers];
  }
} 