# PXN CB1 Control Mapping Guide

## 🎯 What We Learned

From your interactive mapping session, we discovered the PXN CB1 button box has:

### **Button Layout**
- **Momentary buttons** (spring back up): Handle, Cruise, Flash, Audio, Wipers, Map, ESC, Enter, Engine Start
- **Toggle buttons** (stay in position): Kill Switch, Talk, Light

### **Knobs**
- **ABS Knob**: Up/Down rotation + Click
- **TC Knob**: Up/Down rotation

### **Three-Way Toggles**
- **Switch 1 & 2**: Spring-return (return to center when released)
- **Switch 3 & 4**: Latching (stay in position until manually changed)

### **Joystick**
- 8-directional with diagonal support

## 📁 Files Created

### `config-controls.json`
A minimal, human-readable configuration file that defines:
- **Changes**: Byte-level transitions that trigger each control
- **Default names**: Standard names for each control
- **User names**: Optional custom names for logging/output
- **Control types**: Categorization (momentary, toggle, etc.)

### `src/parsers/control-config-parser.ts`
A parser that:
- Reads the config file
- Matches HID data changes against defined controls
- Returns structured events with proper names

### `test-config-parser.js`
Test script to verify the parser works correctly

### `update-control-names.js`
Interactive utility to customize control names

## 🔧 How to Use

### 1. **Test the Parser**
```bash
node test-config-parser.js
```

### 2. **Customize Control Names**
```bash
node update-control-names.js
```

### 3. **Use in Your Application**
```typescript
import { ControlConfigParser } from './src/parsers/control-config-parser.js';

const parser = new ControlConfigParser();
const event = parser.parse(hidData);
if (event) {
  console.log(`Control activated: ${event.name}`);
}
```

## 📊 Change Format

The config uses a simple format: `byte{number}:{old_value}->{new_value}`

Examples:
- `byte1:64->65` = Button press (byte 1 changes from 64 to 65)
- `byte3:0->32` = Knob turn (byte 3 changes from 0 to 32)
- `byte2:0->8` = Toggle switch (byte 2 changes from 0 to 8)

## 🎛️ Control Categories

### **Buttons**
- Simple on/off controls
- Most are momentary (spring back)
- Some are toggles (stay in position)

### **Knobs**
- Rotary controls with multiple actions
- Up/down rotation
- Click functionality

### **Toggles**
- Three-position switches
- Spring-return vs latching behavior
- Up/down/home positions

### **Joystick**
- 8-directional control
- Diagonal movements supported

## 🔄 Extending the System

### **Adding New Controls**
1. Edit `config-controls.json`
2. Add new control definition with changes array
3. Test with `test-config-parser.js`

### **Custom Parsers**
1. Create new parser class implementing `EventParser`
2. Add to parser registry in `src/parsers/index.ts`
3. Configure in your main application

### **Action Mapping**
1. Define actions in your config
2. Create action runners for different types
3. Map controls to actions

## 🐛 Troubleshooting

### **Control Not Detected**
- Check the changes array matches actual byte transitions
- Verify the change format is correct
- Test with raw data logging

### **Wrong Names**
- Use `update-control-names.js` to customize
- Check user_name vs default_name fields
- Verify JSON syntax

### **Parser Errors**
- Check config file exists and is valid JSON
- Verify file paths are correct
- Check TypeScript compilation

## 📈 Next Steps

1. **Integrate with main application**: Replace the existing parser with the config-based one
2. **Add action mapping**: Connect controls to specific actions
3. **Enhance logging**: Use custom names in log output
4. **Add validation**: Verify config file integrity
5. **Create UI**: Build a visual control mapping interface

## 🎮 Example Usage

```typescript
// Load parser
const parser = new ControlConfigParser('config-controls.json');

// Process HID data
device.on('data', (data) => {
  const event = parser.parse(data);
  if (event) {
    // Use the user-friendly name
    console.log(`${event.name} activated`);
    
    // Trigger appropriate action
    if (event.name === 'Red Kill Switch') {
      emergencyStop();
    } else if (event.name === 'ABS Knob Up') {
      increaseABS();
    }
  }
});
```

This system provides a clean, maintainable way to map your PXN CB1 controls with human-readable names and flexible configuration! 