#!/usr/bin/env node

/**
 * PXN CB1 Control Testing and Labeling Script
 * This script helps you identify and label each control on your device
 */

import HID from 'node-hid';

console.log('🎮 PXN CB1 Control Testing & Labeling');
console.log('=====================================');
console.log('This script will help you identify each control on your device.');
console.log('Follow the prompts to test each control and see the data changes.\n');

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
  
  console.log('🎯 Ready to test controls!');
  console.log('');
  console.log('📋 Testing Instructions:');
  console.log('1. Press each button one at a time');
  console.log('2. Move each toggle switch to different positions');
  console.log('3. Turn the knobs and click them');
  console.log('4. Move the joystick if present');
  console.log('5. Watch the data changes below');
  console.log('');
  console.log('Press Ctrl+C to stop testing');
  console.log('=====================================');

  let packetCount = 0;
  let lastControlPacket = null;

  device.on('data', (data) => {
    // Only focus on control packets (6 bytes starting with 0x01)
    if (data.length === 6 && data[0] === 0x01) {
      packetCount++;
      
      // Compare with last packet to see what changed
      if (lastControlPacket) {
        const changes = findChanges(lastControlPacket, data);
        if (changes.length > 0) {
          console.log(`\n🔄 Changes detected in packet #${packetCount}:`);
          changes.forEach(change => console.log(`   ${change}`));
        }
      }
      
      lastControlPacket = Buffer.from(data);
      
      // Show current state
      interpretControlPacket(data, packetCount);
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
    console.log('\n👋 Testing complete!');
    device.close();
    process.exit(0);
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
  console.log(`\n📦 Control Packet #${packetNum}: ${data.toString('hex')}`);
  
  const byte1 = data[1];
  const byte2 = data[2];
  const byte3 = data[3];
  const byte4 = data[4];
  
  console.log('   Current State:');
  
  // Buttons 1-8 (Byte 1)
  const buttons1 = Array.from({length: 8}, (_, i) => (byte1 & (1 << i)) ? 'ON' : 'OFF');
  console.log(`   Buttons 1-8:   ${buttons1.join(' ')}`);
  
  // Buttons 9-16 (Byte 2)
  const buttons2 = Array.from({length: 8}, (_, i) => (byte2 & (1 << i)) ? 'ON' : 'OFF');
  console.log(`   Buttons 9-16:  ${buttons2.join(' ')}`);
  
  // Switches and special buttons (Byte 3)
  console.log(`   Byte 3 (${byte3}): ${byte3.toString(2).padStart(8, '0')}`);
  console.log(`     - On/Off Switch: ${(byte3 & 0x01) ? 'ON' : 'OFF'}`);
  console.log(`     - Engine Start: ${(byte3 & 0x02) ? 'ON' : 'OFF'}`);
  console.log(`     - ESC Button: ${(byte3 & 0x04) ? 'ON' : 'OFF'}`);
  console.log(`     - Enter Button: ${(byte3 & 0x08) ? 'ON' : 'OFF'}`);
  console.log(`     - Toggle 1: ${getToggleState((byte3 >> 4) & 0x03)}`);
  console.log(`     - Toggle 2: ${getToggleState((byte3 >> 6) & 0x03)}`);
  
  // Knobs and additional switches (Byte 4)
  console.log(`   Byte 4 (${byte4}): ${byte4.toString(2).padStart(8, '0')}`);
  console.log(`     - Knob 1 Click: ${(byte4 & 0x01) ? 'ON' : 'OFF'}`);
  console.log(`     - Knob 2 Click: ${(byte4 & 0x02) ? 'ON' : 'OFF'}`);
  console.log(`     - Toggle 3: ${getToggleState((byte4 >> 2) & 0x03)}`);
  console.log(`     - Toggle 4: ${getToggleState((byte4 >> 4) & 0x03)}`);
  
  console.log('   ---');
}

function getToggleState(value) {
  switch (value) {
    case 0: return 'DOWN';
    case 1: return 'MIDDLE';
    case 2: return 'UP';
    default: return 'UNKNOWN';
  }
} 