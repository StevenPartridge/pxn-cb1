import { ParsedEvent } from '../types/index.js';
import { readFileSync } from 'fs';
import type { EventParser } from './index.js';
import type { HIDDevice } from '../types/index.js';

interface ControlChange {
  changes: string[];
  default_name: string;
  user_name: string | null;
  type?: string;
}

interface ControlConfig {
  controls: {
    buttons: Record<string, ControlChange>;
    knobs: Record<string, Record<string, ControlChange>>;
    toggles: Record<string, Record<string, ControlChange> & { type: string }>;
    joystick: Record<string, ControlChange>;
  };
  metadata: {
    device: string;
    version: string;
    description: string;
    change_format: string;
    types: Record<string, string>;
  };
}

export class ControlConfigParser implements EventParser {
  name = 'ControlConfigParser';
  private config: ControlConfig;
  private previousState: number[] = [0, 0, 0, 0, 0, 0];

  constructor(configPath: string = 'config-controls.json') {
    try {
      const configData = readFileSync(configPath, 'utf8');
      this.config = JSON.parse(configData);
    } catch (error) {
      throw new Error(`Failed to load control config: ${error}`);
    }
  }

  parse(data: Buffer): ParsedEvent {
    const currentState = Array.from(data);
    
    // Only process 6-byte packets (PXN CB1 control data)
    // Ignore the 64-byte packets which seem to be status/configuration data
    if (currentState.length !== 6) {
      return {
        timestamp: Date.now(),
        buttonStates: new Array(8).fill(false),
        rawData: data,
        deviceId: 'pxn-cb1'
      };
    }
    
    // Find what changed
    const changes = this.detectChanges(this.previousState, currentState);
    
    // Match changes against our config
    const matchedControl = this.matchChanges(changes);
    
    this.previousState = currentState;
    
    // Create button states array - set the matched control's button index to true
    const buttonStates = new Array(8).fill(false);
    
    if (matchedControl) {
      // Find which button this control corresponds to by searching through the config
      const buttonIndex = this.findButtonIndexForControl(matchedControl);
      if (buttonIndex >= 0 && buttonIndex < 8) {
        buttonStates[buttonIndex] = true;
      }
      
      console.log(`🎮 Control detected: ${matchedControl.default_name} (${matchedControl.type || 'unknown'})`);
    } else if (changes.length > 0) {
      console.log(`🔍 Changes detected but no control matched: ${changes.join(', ')}`);
    }

    return {
      timestamp: Date.now(),
      buttonStates: buttonStates,
      rawData: data,
      deviceId: 'pxn-cb1'
    };
  }

  private findButtonIndexForControl(control: ControlChange): number {
    // Search through buttons to find the matching control
    for (const [buttonId, button] of Object.entries(this.config.controls.buttons)) {
      if (this.changesMatch(button.changes, control.changes)) {
        return parseInt(buttonId);
      }
    }
    
    // If not found in buttons, return -1 (no button mapping)
    return -1;
  }

  supportsDevice(device: HIDDevice): boolean {
    // Support PXN CB1 devices
    return device.vendorId === 0x36E6 && device.productId === 0x8001;
  }

  private detectChanges(previous: number[], current: number[]): string[] {
    const changes: string[] = [];
    
    for (let i = 0; i < Math.min(previous.length, current.length); i++) {
      if (previous[i] !== current[i]) {
        changes.push(`byte${i + 1}:${previous[i]}->${current[i]}`);
      }
    }
    
    return changes;
  }

  private matchChanges(changes: string[]): ControlChange | null {
    // Check buttons first
    for (const [, button] of Object.entries(this.config.controls.buttons)) {
      if (this.changesMatch(button.changes, changes)) {
        return button;
      }
    }

    // Check knobs
    for (const [, knobActions] of Object.entries(this.config.controls.knobs)) {
      for (const [, knob] of Object.entries(knobActions)) {
        if (this.changesMatch(knob.changes, changes)) {
          return knob;
        }
      }
    }

    // Check toggles
    for (const [, toggleActions] of Object.entries(this.config.controls.toggles)) {
      for (const [action, toggle] of Object.entries(toggleActions)) {
        if (action === 'type') continue;
        if (typeof toggle === 'object' && 'changes' in toggle && this.changesMatch(toggle.changes, changes)) {
          return toggle as ControlChange;
        }
      }
    }

    // Check joystick
    for (const [, joystick] of Object.entries(this.config.controls.joystick)) {
      if (this.changesMatch(joystick.changes, changes)) {
        return joystick;
      }
    }

    return null;
  }

  private changesMatch(configChanges: string[], actualChanges: string[]): boolean {
    // For now, we'll do exact matching
    // In the future, we could make this more flexible
    if (configChanges.length !== actualChanges.length) {
      return false;
    }

    const sortedConfig = [...configChanges].sort();
    const sortedActual = [...actualChanges].sort();

    return sortedConfig.every((change, index) => change === sortedActual[index]);
  }

  // Helper method to get all available controls for debugging
  getAllControls(): Record<string, unknown> {
    return this.config.controls;
  }

  // Helper method to get control by ID
  getControl(controlType: string, controlId: string, action?: string): ControlChange | null {
    const controls = this.config.controls[controlType as keyof typeof this.config.controls];
    if (!controls) return null;

    if (action) {
      return (controls as Record<string, Record<string, ControlChange>>)[controlId]?.[action] || null;
    }

    return (controls as Record<string, ControlChange>)[controlId] || null;
  }

  // Debug method to get detected changes
  getDetectedChanges(data: Buffer): string[] {
    const currentState = Array.from(data);
    return this.detectChanges(this.previousState, currentState);
  }

  // Test method that doesn't update state
  testParse(baseline: Buffer, data: Buffer): ParsedEvent | null {
    const baselineState = Array.from(baseline);
    const currentState = Array.from(data);
    
    // Find what changed
    const changes = this.detectChanges(baselineState, currentState);
    
    if (changes.length === 0) {
      return null;
    }

    // Match changes against our config
    const matchedControl = this.matchChanges(changes);
    
    if (matchedControl) {
      // Convert button states to boolean array (simplified for now)
      const buttonStates = new Array(8).fill(false);
      
      return {
        timestamp: Date.now(),
        buttonStates: buttonStates,
        rawData: data,
        deviceId: 'pxn-cb1'
      };
    }

    return null;
  }
} 