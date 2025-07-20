#!/usr/bin/env node

/**
 * Interactive PXN CB1 Control Mapper
 * This script helps you identify and map each control on your device
 */

import HID from 'node-hid';
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

console.log('🎮 Interactive PXN CB1 Control Mapper');
console.log('=====================================');
console.log('This script will help you map each control to its function.');
console.log('Press a button or move a control, then describe what you did.\n');

// Create readline interface for user input
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// Store mappings
const controlMappings = new Map();
let packetCount = 0;
let lastControlPacket = null;
let isWaitingForInput = false;
let pendingChanges = null;

// Load existing mappings if they exist
try {
  const existingMappings = JSON.parse(readFileSync('control-mappings.json', 'utf-8'));
  Object.entries(existingMappings).forEach(([key, value]) => {
    controlMappings.set(key, value);
  });
  console.log('📁 Loaded existing mappings from control-mappings.json');
} catch (error) {
  console.log('📁 No existing mappings found, starting fresh');
}

try {
  // Find PXN CB1 device
  const devices = HID.devices();
  const pxnDevice = devices.find(d => 
    d.vendorId === 0x36E6 && d.productId === 0x8001
  );

  if (!pxnDevice) {
    console.log('❌ PXN CB1 device not found');
    process.exit(1);
  }

  console.log(`✅ Found PXN CB1: ${pxnDevice.product}`);
  console.log('');

  // Connect to device
  const device = new HID.HID(pxnDevice.path);
  
  console.log('🎯 Ready to map controls!');
  console.log('');
  console.log('📋 Instructions:');
  console.log('1. Press a button or move a control');
  console.log('2. When prompted, describe what you did (e.g., "ABS knob turn up")');
  console.log('3. Repeat for all controls');
  console.log('4. Type "done" when finished');
  console.log('5. Type "skip" to skip a control');
  console.log('');
  console.log('Press Ctrl+C to stop at any time');
  console.log('=====================================');

  device.on('data', (data) => {
    // Only focus on control packets (6 bytes starting with 0x01)
    if (data.length === 6 && data[0] === 0x01) {
      packetCount++;
      
      // Compare with last packet to see what changed
      if (lastControlPacket && !isWaitingForInput) {
        const changes = findChanges(lastControlPacket, data);
        if (changes.length > 0) {
          console.log(`\n🔄 Changes detected in packet #${packetCount}:`);
          changes.forEach(change => console.log(`   ${change}`));
          
          // Show current state
          const state = interpretControlPacket(data, packetCount);
          
          // Ask user what they did
          pendingChanges = { changes, state, packetNum: packetCount };
          isWaitingForInput = true;
          
          rl.question('\n🎯 What did you just do? (or type "skip" to skip): ', (answer) => {
            if (answer.toLowerCase() === 'done') {
              saveMappingsAndExit();
            } else if (answer.toLowerCase() !== 'skip') {
              // Store the mapping
              const mappingKey = `packet_${packetCount}_${Date.now()}`;
              controlMappings.set(mappingKey, {
                description: answer,
                changes: pendingChanges.changes,
                state: pendingChanges.state,
                timestamp: new Date().toISOString()
              });
              
              console.log(`✅ Mapped: ${answer}`);
              console.log(`   Changes: ${pendingChanges.changes.join(', ')}`);
            } else {
              console.log('⏭️  Skipped this control');
            }
            
            isWaitingForInput = false;
            pendingChanges = null;
          });
        }
      }
      
      lastControlPacket = Buffer.from(data);
    }
  });

  device.on('error', (error) => {
    console.error('❌ Device error:', error);
  });

  device.on('close', () => {
    console.log('🔌 Device disconnected');
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Saving mappings and shutting down...');
    saveMappingsAndExit();
  });

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

function findChanges(prevData, currentData) {
  const changes = [];
  
  for (let i = 0; i < Math.min(prevData.length, currentData.length); i++) {
    if (prevData[i] !== currentData[i]) {
      const prevBin = prevData[i].toString(2).padStart(8, '0');
      const currBin = currentData[i].toString(2).padStart(8, '0');
      changes.push(`Byte ${i}: ${prevData[i]} (${prevBin}) → ${currentData[i]} (${currBin})`);
    }
  }
  
  return changes;
}

function interpretControlPacket(data, packetNum) {
  const byte1 = data[1];
  const byte2 = data[2];
  const byte3 = data[3];
  const byte4 = data[4];
  
  const state = {
    packetNum,
    hex: data.toString('hex'),
    buttons1: Array.from({length: 8}, (_, i) => (byte1 & (1 << i)) ? 'ON' : 'OFF'),
    buttons2: Array.from({length: 8}, (_, i) => (byte2 & (1 << i)) ? 'ON' : 'OFF'),
    byte3: {
      value: byte3,
      binary: byte3.toString(2).padStart(8, '0'),
      onOffSwitch: (byte3 & 0x01) ? 'ON' : 'OFF',
      engineStart: (byte3 & 0x02) ? 'ON' : 'OFF',
      escButton: (byte3 & 0x04) ? 'ON' : 'OFF',
      enterButton: (byte3 & 0x08) ? 'ON' : 'OFF',
      toggle1: getToggleState((byte3 >> 4) & 0x03),
      toggle2: getToggleState((byte3 >> 6) & 0x03)
    },
    byte4: {
      value: byte4,
      binary: byte4.toString(2).padStart(8, '0'),
      knob1Click: (byte4 & 0x01) ? 'ON' : 'OFF',
      knob2Click: (byte4 & 0x02) ? 'ON' : 'OFF',
      toggle3: getToggleState((byte4 >> 2) & 0x03),
      toggle4: getToggleState((byte4 >> 4) & 0x03)
    }
  };
  
  console.log(`📦 Control Packet #${packetNum}: ${data.toString('hex')}`);
  console.log('   Current State:');
  console.log(`   Buttons 1-8:   ${state.buttons1.join(' ')}`);
  console.log(`   Buttons 9-16:  ${state.buttons2.join(' ')}`);
  console.log(`   Byte 3 (${byte3}): ${byte3.toString(2).padStart(8, '0')}`);
  console.log(`     - On/Off Switch: ${state.byte3.onOffSwitch}`);
  console.log(`     - Engine Start: ${state.byte3.engineStart}`);
  console.log(`     - ESC Button: ${state.byte3.escButton}`);
  console.log(`     - Enter Button: ${state.byte3.enterButton}`);
  console.log(`     - Toggle 1: ${state.byte3.toggle1}`);
  console.log(`     - Toggle 2: ${state.byte3.toggle2}`);
  console.log(`   Byte 4 (${byte4}): ${byte4.toString(2).padStart(8, '0')}`);
  console.log(`     - Knob 1 Click: ${state.byte4.knob1Click}`);
  console.log(`     - Knob 2 Click: ${state.byte4.knob2Click}`);
  console.log(`     - Toggle 3: ${state.byte4.toggle3}`);
  console.log(`     - Toggle 4: ${state.byte4.toggle4}`);
  
  return state;
}

function getToggleState(value) {
  switch (value) {
    case 0: return 'DOWN';
    case 1: return 'MIDDLE';
    case 2: return 'UP';
    default: return 'UNKNOWN';
  }
}

function saveMappingsAndExit() {
  try {
    // Convert Map to object for JSON serialization
    const mappingsObj = {};
    controlMappings.forEach((value, key) => {
      mappingsObj[key] = value;
    });
    
    // Save to file
    writeFileSync('control-mappings.json', JSON.stringify(mappingsObj, null, 2));
    
    console.log(`\n💾 Saved ${controlMappings.size} control mappings to control-mappings.json`);
    console.log('\n📋 Summary of mapped controls:');
    controlMappings.forEach((mapping, key) => {
      console.log(`   • ${mapping.description}`);
    });
    
    console.log('\n🎉 Mapping complete! You can now use this data to configure your application.');
    
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error saving mappings:', error);
    process.exit(1);
  }
} 