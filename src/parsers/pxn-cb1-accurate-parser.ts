import type { EventParser, HIDDevice, ParsedEvent } from '../types/index.js';

export interface PXNCB1AccurateEvent extends ParsedEvent {
  buttons: {
    [key: string]: boolean;
  };
  switches: {
    [key: string]: number; // 0, 1, or 2 for 3-state switches
  };
  knobs: {
    [key: string]: {
      value: number;
      pressed: boolean;
    };
  };
  joystick?: {
    x: number;
    y: number;
    pressed: boolean;
  };
}

export class PXNCB1AccurateParser implements EventParser {
  name = 'PXNCB1AccurateParser';

  supportsDevice(device: HIDDevice): boolean {
    return device.vendorId === 0x36E6 && device.productId === 0x8001;
  }

  parse(data: Buffer): PXNCB1AccurateEvent {
    const timestamp = Date.now();
    
    const event: PXNCB1AccurateEvent = {
      timestamp,
      buttonStates: [],
      rawData: data,
      deviceId: 'pxn-cb1',
      buttons: {},
      switches: {},
      knobs: {},
    };

    // Only process packets that look like button/control data
    if (data.length === 6 && data[0] === 0x01) {
      this.parseControlPacket(data, event);
    } else if (data.length === 64) {
      this.parseStatusPacket(data, event);
    }

    return event;
  }

  private parseControlPacket(data: Buffer, event: PXNCB1AccurateEvent): void {
    // This is the 6-byte control packet: 01c000000002
    // Byte 0: Always 0x01 (packet type)
    // Byte 1: Button states (0xC0 = 11000000 in binary)
    // Byte 2: More button states
    // Byte 3: Knob values and switch states
    // Byte 4: Knob clicks and additional switch states
    // Byte 5: Always 0x02 (packet end)

    const buttonByte1 = data[1];
    const buttonByte2 = data[2];
    const knobSwitchByte = data[3];
    const knobClickByte = data[4];

    // Parse buttons from byte 1 (buttons 1-8)
    for (let i = 0; i < 8; i++) {
      const isPressed = (buttonByte1 & (1 << i)) !== 0;
      event.buttonStates.push(isPressed);
      event.buttons[`button_${i + 1}`] = isPressed;
    }

    // Parse buttons from byte 2 (buttons 9-16) - these work well
    for (let i = 0; i < 8; i++) {
      const isPressed = (buttonByte2 & (1 << i)) !== 0;
      event.buttonStates.push(isPressed);
      event.buttons[`button_${i + 9}`] = isPressed;
    }

    // Parse switches and knobs from byte 3
    this.parseSwitchesAndKnobs(knobSwitchByte, knobClickByte, event);

    // Log the event details
    this.logEventDetails(event);
  }

  private parseStatusPacket(data: Buffer, _event: PXNCB1AccurateEvent): void {
    // This is the 64-byte status packet - mostly static data
    // We might find joystick data here, but it's not obvious yet
    
    // For now, just log that we received a status packet
    console.log('📊 Status packet received (64 bytes)');
    
    // Look for potential joystick data in specific bytes
    // This is speculative - we'll need to test with actual joystick movement
    if (data.length >= 64) {
      // Check if any bytes in the middle range change with joystick movement
      const potentialJoystickBytes = data.slice(20, 40);
      const hasJoystickData = potentialJoystickBytes.some(byte => byte !== 0 && byte !== 255);
      
      if (hasJoystickData) {
        console.log('🎮 Potential joystick data detected in status packet');
      }
    }
  }

  private parseSwitchesAndKnobs(switchByte: number, clickByte: number, event: PXNCB1AccurateEvent): void {
    // Based on user observations:
    // - 1 on/off switch
    // - 3 pressable buttons (Engine Start, ESC, Enter)
    // - 4 three-state toggle switches
    
    // Parse the on/off switch (bit 0 of switchByte)
    const onOffSwitch = (switchByte & 0x01) !== 0;
    event.switches['on_off_switch'] = onOffSwitch ? 1 : 0;

    // Parse the 3 pressable buttons (bits 1-3)
    const engineStart = (switchByte & 0x02) !== 0;
    const escButton = (switchByte & 0x04) !== 0;
    const enterButton = (switchByte & 0x08) !== 0;
    
    event.buttons['engine_start'] = engineStart;
    event.buttons['esc'] = escButton;
    event.buttons['enter'] = enterButton;

    // Parse the 4 three-state switches (bits 4-7 of switchByte)
    // Each switch uses 2 bits: 00=down, 01=middle, 10=up
    const switch1 = (switchByte >> 4) & 0x03;
    const switch2 = (switchByte >> 6) & 0x03;
    
    event.switches['toggle_switch_1'] = switch1;
    event.switches['toggle_switch_2'] = switch2;

    // Parse knob values and additional switches from clickByte
    // Knob clicks (bits 0-1)
    const knob1Click = (clickByte & 0x01) !== 0;
    const knob2Click = (clickByte & 0x02) !== 0;
    
    event.knobs['knob_1'] = {
      value: 0, // We'll need to track this from status packets
      pressed: knob1Click
    };
    
    event.knobs['knob_2'] = {
      value: 0, // We'll need to track this from status packets
      pressed: knob2Click
    };

    // Additional switches (bits 2-7)
    const switch3 = (clickByte >> 2) & 0x03;
    const switch4 = (clickByte >> 4) & 0x03;
    
    event.switches['toggle_switch_3'] = switch3;
    event.switches['toggle_switch_4'] = switch4;
  }

  private logEventDetails(event: PXNCB1AccurateEvent): void {
    console.log('\n=== PXN CB1 Accurate Event ===');
    console.log(`Timestamp: ${new Date(event.timestamp).toISOString()}`);
    
    // Log button states
    const pressedButtons = Object.entries(event.buttons)
      .filter(([_, pressed]) => pressed)
      .map(([name, _]) => name);
    
    if (pressedButtons.length > 0) {
      console.log(`🎯 Buttons pressed: ${pressedButtons.join(', ')}`);
    }
    
    // Log switch states
    const activeSwitches = Object.entries(event.switches)
      .filter(([_, state]) => state > 0)
      .map(([name, state]) => {
        const stateName = state === 1 ? 'ON' : state === 2 ? 'UP' : 'DOWN';
        return `${name}=${stateName}`;
      });
    
    if (activeSwitches.length > 0) {
      console.log(`🔘 Switches: ${activeSwitches.join(', ')}`);
    }
    
    // Log knob states
    const activeKnobs = Object.entries(event.knobs)
      .filter(([_, knob]) => knob.pressed)
      .map(([name, _]) => name);
    
    if (activeKnobs.length > 0) {
      console.log(`🎛️  Knobs pressed: ${activeKnobs.join(', ')}`);
    }
    
    console.log('==============================\n');
  }
} 