#!/usr/bin/env node

/**
 * Simple test script to enumerate HID devices
 * Run with: node test-devices.js
 */

import HID from 'node-hid';

try {
  console.log('🔍 Enumerating HID devices...\n');
  
  const devices = HID.devices();
  
  if (devices.length === 0) {
    console.log('❌ No HID devices found');
    process.exit(1);
  }
  
  console.log(`✅ Found ${devices.length} HID device(s):\n`);
  
  devices.forEach((device, index) => {
    console.log(`Device ${index + 1}:`);
    console.log(`  Product: ${device.product || 'Unknown'}`);
    console.log(`  Manufacturer: ${device.manufacturer || 'Unknown'}`);
    console.log(`  Vendor ID: 0x${device.vendorId.toString(16).toUpperCase()}`);
    console.log(`  Product ID: 0x${device.productId.toString(16).toUpperCase()}`);
    console.log(`  Path: ${device.path || 'N/A'}`);
    console.log(`  Serial Number: ${device.serialNumber || 'N/A'}`);
    console.log(`  Release: ${device.release || 'N/A'}`);
    console.log(`  Interface: ${device.interface || 'N/A'}`);
    console.log(`  Usage Page: ${device.usagePage || 'N/A'}`);
    console.log(`  Usage: ${device.usage || 'N/A'}`);
    console.log('');
  });
  
  console.log('💡 To use a device with the HID Monitor:');
  console.log('1. Copy the Vendor ID and Product ID values');
  console.log('2. Update your config.json or set environment variables:');
  console.log('   HID_VENDOR_ID=0x[VENDOR_ID]');
  console.log('   HID_PRODUCT_ID=0x[PRODUCT_ID]');
  console.log('3. Run: npm run dev');
  
} catch (error) {
  console.error('❌ Error enumerating devices:', error.message);
  
  if (error.message.includes('permission')) {
    console.log('\n💡 Permission denied. Try:');
    console.log('   - Running with sudo (not recommended)');
    console.log('   - Setting up udev rules (Linux)');
    console.log('   - Running as administrator (Windows)');
  }
  
  process.exit(1);
} 