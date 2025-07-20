#!/usr/bin/env node

/**
 * Test script to help debug PXN CB1 interactions
 * Run this alongside the main application to see what's happening
 */

import HID from 'node-hid';

console.log('🔍 PXN CB1 Interaction Test');
console.log('==========================');
console.log('This script will help you understand your device\'s data format.');
console.log('Press buttons, move toggles, and turn knobs to see the raw data.\n');

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
  console.log(`   Path: ${pxnDevice.path}`);
  console.log('');

  // Connect to device
  const device = new HID.HID(pxnDevice.path);
  
  console.log('🎮 Connected! Now interact with your device:');
  console.log('   • Press buttons');
  console.log('   • Move toggles (2-state and 3-state)');
  console.log('   • Turn knobs/joysticks');
  console.log('   • Press joysticks');
  console.log('');
  console.log('📊 Raw data will be displayed below:');
  console.log('=====================================');

  let packetCount = 0;

  device.on('data', (data) => {
    packetCount++;
    console.log(`\n📦 Packet #${packetCount} (${data.length} bytes):`);
    console.log(`   Hex: ${data.toString('hex')}`);
    console.log(`   Binary: ${Array.from(data).map(b => b.toString(2).padStart(8, '0')).join(' ')}`);
    console.log(`   Decimal: ${Array.from(data).join(' ')}`);
    
    // Try to interpret the data
    console.log('   Interpretation:');
    
    if (data.length >= 1) {
      const byte1 = data[0];
      console.log(`     Byte 1 (${byte1}): Buttons 1-8: ${Array.from({length: 8}, (_, i) => (byte1 & (1 << i)) ? 'ON' : 'OFF').join(' ')}`);
    }
    
    if (data.length >= 2) {
      const byte2 = data[1];
      console.log(`     Byte 2 (${byte2}): Buttons 9-16: ${Array.from({length: 8}, (_, i) => (byte2 & (1 << i)) ? 'ON' : 'OFF').join(' ')}`);
    }
    
    if (data.length >= 3) {
      const byte3 = data[2];
      console.log(`     Byte 3 (${byte3}): Possible toggles/other controls`);
    }
    
    if (data.length >= 4) {
      const byte4 = data[3];
      const byte5 = data[4];
      console.log(`     Byte 4-5 (${byte4}, ${byte5}): Possible joystick X,Y coordinates`);
    }
    
    console.log('   ---');
  });

  device.on('error', (error) => {
    console.error('❌ Device error:', error);
  });

  device.on('close', () => {
    console.log('🔌 Device disconnected');
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    device.close();
    process.exit(0);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
  
  if (error.message.includes('permission')) {
    console.log('\n💡 Permission denied. Try:');
    console.log('   - Running with sudo (not recommended)');
    console.log('   - Setting up udev rules (Linux)');
    console.log('   - Running as administrator (Windows)');
  }
  
  process.exit(1);
} 