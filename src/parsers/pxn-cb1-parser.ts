import type { EventParser, HIDDevice, ParsedEvent } from '../types/index.js';

export interface PXNCB1Event extends ParsedEvent {
  buttons: {
    [key: string]: boolean;
  };
  toggles: {
    [key: string]: number; // 0, 1, or 2 for 3-state toggles
  };
  joysticks: {
    [key: string]: {
      x: number;
      y: number;
      pressed: boolean;
    };
  };
  knobs: {
    [key: string]: number; // 0-255 or similar range
  };
}

export class PXNCB1Parser implements EventParser {
  name = 'PXNCB1Parser';

  supportsDevice(device: HIDDevice): boolean {
    return device.vendorId === 0x36E6 && device.productId === 0x8001;
  }

  parse(data: Buffer): PXNCB1Event {
    const timestamp = Date.now();
    
    // Initialize the event structure
    const event: PXNCB1Event = {
      timestamp,
      buttonStates: [],
      rawData: data,
      deviceId: 'pxn-cb1',
      buttons: {},
      toggles: {},
      joysticks: {},
      knobs: {},
    };

    // Log the raw data for debugging
    console.log(`Raw PXN CB1 data (${data.length} bytes):`, data.toString('hex'));

    // Parse based on data length - PXN CB1 might send different packet sizes
    if (data.length >= 1) {
      this.parseButtons(data, event);
    }

    if (data.length >= 2) {
      this.parseToggles(data, event);
    }

    if (data.length >= 4) {
      this.parseJoysticks(data, event);
    }

    if (data.length >= 6) {
      this.parseKnobs(data, event);
    }

    return event;
  }

  private parseButtons(data: Buffer, event: PXNCB1Event): void {
    // First byte typically contains button states
    const buttonByte = data[0];
    
    // Parse individual bits as buttons
    for (let i = 0; i < 8; i++) {
      const isPressed = (buttonByte & (1 << i)) !== 0;
      event.buttonStates.push(isPressed);
      event.buttons[`button_${i + 1}`] = isPressed;
    }

    // If there are more bytes, they might contain additional buttons
    if (data.length >= 2) {
      const buttonByte2 = data[1];
      for (let i = 0; i < 8; i++) {
        const isPressed = (buttonByte2 & (1 << i)) !== 0;
        event.buttonStates.push(isPressed);
        event.buttons[`button_${i + 9}`] = isPressed;
      }
    }
  }

  private parseToggles(data: Buffer, event: PXNCB1Event): void {
    // Toggles might be in bytes 2-3
    if (data.length >= 3) {
      const toggleByte = data[2];
      
      // Parse toggles - each toggle might use 2 bits for 3-state
      for (let i = 0; i < 4; i++) {
        const toggleValue = (toggleByte >> (i * 2)) & 0x03;
        event.toggles[`toggle_${i + 1}`] = toggleValue;
      }
    }
  }

  private parseJoysticks(data: Buffer, event: PXNCB1Event): void {
    // Joysticks typically use 2 bytes each (X and Y)
    if (data.length >= 4) {
      // First joystick
      const x1 = data[3];
      const y1 = data[4];
      const pressed1 = (data[5] & 0x01) !== 0;
      
      event.joysticks['joystick_1'] = {
        x: x1,
        y: y1,
        pressed: pressed1,
      };

      // Second joystick (if available)
      if (data.length >= 7) {
        const x2 = data[6];
        const y2 = data[7];
        const pressed2 = (data[8] & 0x01) !== 0;
        
        event.joysticks['joystick_2'] = {
          x: x2,
          y: y2,
          pressed: pressed2,
        };
      }
    }
  }

  private parseKnobs(data: Buffer, event: PXNCB1Event): void {
    // Knobs might be in later bytes
    if (data.length >= 6) {
      for (let i = 0; i < Math.min(4, data.length - 6); i++) {
        const knobValue = data[6 + i];
        event.knobs[`knob_${i + 1}`] = knobValue;
      }
    }
  }
}

// Enhanced parser that provides detailed logging
export class PXNCB1DetailedParser extends PXNCB1Parser {
  name = 'PXNCB1DetailedParser';

  parse(data: Buffer): PXNCB1Event {
    const event = super.parse(data);
    
    // Log detailed information about what was detected
    this.logEventDetails(event);
    
    return event;
  }

  private logEventDetails(event: PXNCB1Event): void {
    console.log('\n=== PXN CB1 Event Details ===');
    console.log(`Timestamp: ${new Date(event.timestamp).toISOString()}`);
    
    // Log button states
    const pressedButtons = Object.entries(event.buttons)
      .filter(([_, pressed]) => pressed)
      .map(([name, _]) => name);
    
    if (pressedButtons.length > 0) {
      console.log(`Buttons pressed: ${pressedButtons.join(', ')}`);
    }
    
    // Log toggle states
    const activeToggles = Object.entries(event.toggles)
      .filter(([_, state]) => state > 0)
      .map(([name, state]) => `${name}=${state}`);
    
    if (activeToggles.length > 0) {
      console.log(`Toggles active: ${activeToggles.join(', ')}`);
    }
    
    // Log joystick positions
    Object.entries(event.joysticks).forEach(([name, joystick]) => {
      console.log(`${name}: x=${joystick.x}, y=${joystick.y}, pressed=${joystick.pressed}`);
    });
    
    // Log knob values
    Object.entries(event.knobs).forEach(([name, value]) => {
      console.log(`${name}: ${value}`);
    });
    
    console.log('=============================\n');
  }
} 