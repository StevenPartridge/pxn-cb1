import { ControlConfigParser } from './dist/parsers/control-config-parser.js';

console.log('🔧 Testing Control Config Parser\n');

try {
  const parser = new ControlConfigParser();
  
  console.log('✅ Config loaded successfully');
  
  // Test some sample data based on your mappings
  const testCases = [
    {
      name: 'ABS Knob Up',
      baseline: Buffer.from([0x01, 0x40, 0x00, 0x00, 0x00, 0x00]),
      data: Buffer.from([0x01, 0x40, 0x20, 0x00, 0x00, 0x00]),
      expected: 'ABS Knob Up'
    },
    {
      name: 'Handle Button',
      baseline: Buffer.from([0x01, 0x40, 0x00, 0x00, 0x00, 0x00]),
      data: Buffer.from([0x01, 0x41, 0x00, 0x00, 0x00, 0x00]),
      expected: 'Handle Button'
    },
    {
      name: 'Kill Switch',
      baseline: Buffer.from([0x01, 0x40, 0x00, 0x00, 0x00, 0x00]),
      data: Buffer.from([0x01, 0x40, 0x08, 0x00, 0x00, 0x00]),
      expected: 'Red Kill Switch'
    }
  ];

  console.log('\n🧪 Running test cases...\n');

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    
    // Use test method that doesn't update state
    const freshParser = new ControlConfigParser();
    const result = freshParser.testParse(testCase.baseline, testCase.data);
    
    if (result) {
      console.log(`  ✅ Detected: ${testCase.expected}`);
      console.log(`  📊 Raw data: ${testCase.data.toString('hex')}`);
    } else {
      console.log(`  ❌ No match found`);
      console.log(`  🔍 Expected changes: ${testCase.expected}`);
      console.log(`  📊 Raw data: ${testCase.data.toString('hex')}`);
      
      // Debug: show baseline and current data
      console.log(`  🔍 Baseline: ${testCase.baseline.toString('hex')}`);
      console.log(`  🔍 Current: ${testCase.data.toString('hex')}`);
      
      // Debug: show what changes should be detected
      const baselineState = Array.from(testCase.baseline);
      const currentState = Array.from(testCase.data);
      const expectedChanges = [];
      for (let i = 0; i < Math.min(baselineState.length, currentState.length); i++) {
        if (baselineState[i] !== currentState[i]) {
          expectedChanges.push(`byte${i + 1}:${baselineState[i]}->${currentState[i]}`);
        }
      }
      console.log(`  🔍 Expected changes: ${expectedChanges.join(', ')}`);
    }
    console.log('');
  }

  // Show available controls
  console.log('📋 Available Controls:');
  const controls = parser.getAllControls();
  
  console.log('\n🔘 Buttons:');
  Object.entries(controls.buttons).forEach(([id, button]) => {
    console.log(`  ${id}: ${button.user_name || button.default_name}`);
  });

  console.log('\n🎛️ Knobs:');
  Object.entries(controls.knobs).forEach(([id, actions]) => {
    console.log(`  ${id}:`);
    Object.entries(actions).forEach(([action, knob]) => {
      console.log(`    ${action}: ${knob.user_name || knob.default_name}`);
    });
  });

  console.log('\n🔀 Toggles:');
  Object.entries(controls.toggles).forEach(([id, actions]) => {
    console.log(`  ${id} (${actions.type}):`);
    Object.entries(actions).forEach(([action, toggle]) => {
      if (action !== 'type') {
        console.log(`    ${action}: ${toggle.user_name || toggle.default_name}`);
      }
    });
  });

  console.log('\n🎮 Joystick:');
  Object.entries(controls.joystick).forEach(([direction, joystick]) => {
    console.log(`  ${direction}: ${joystick.user_name || joystick.default_name}`);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} 