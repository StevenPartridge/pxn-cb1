import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function updateControlNames() {
  console.log('🎛️ Control Name Updater\n');
  
  try {
    // Load current config
    const configData = readFileSync('config-controls.json', 'utf8');
    const config = JSON.parse(configData);
    
    console.log('Current controls found:\n');
    
    const updates = {};
    
    // Go through each control type
    for (const [controlType, controls] of Object.entries(config.controls)) {
      console.log(`\n${controlType.toUpperCase()}:`);
      
      for (const [controlId, control] of Object.entries(controls)) {
        if (controlType === 'knobs' || controlType === 'toggles') {
          // Handle nested controls
          for (const [action, actionControl] of Object.entries(control)) {
            if (action === 'type') continue;
            
            const currentName = actionControl.user_name || actionControl.default_name;
            console.log(`  ${controlId}.${action}: ${currentName}`);
            
            const newName = await question(`    New name for ${controlId}.${action} (or press Enter to keep "${currentName}"): `);
            
            if (newName.trim()) {
              if (!updates[controlType]) updates[controlType] = {};
              if (!updates[controlType][controlId]) updates[controlType][controlId] = {};
              if (!updates[controlType][controlId][action]) updates[controlType][controlId][action] = {};
              updates[controlType][controlId][action].user_name = newName.trim();
            }
          }
        } else {
          // Handle simple controls
          const currentName = control.user_name || control.default_name;
          console.log(`  ${controlId}: ${currentName}`);
          
          const newName = await question(`    New name for ${controlId} (or press Enter to keep "${currentName}"): `);
          
          if (newName.trim()) {
            if (!updates[controlType]) updates[controlType] = {};
            if (!updates[controlType][controlId]) updates[controlType][controlId] = {};
            updates[controlType][controlId].user_name = newName.trim();
          }
        }
      }
    }
    
    // Apply updates
    if (Object.keys(updates).length > 0) {
      console.log('\n🔄 Applying updates...');
      
      for (const [controlType, typeUpdates] of Object.entries(updates)) {
        for (const [controlId, controlUpdates] of Object.entries(typeUpdates)) {
          if (controlType === 'knobs' || controlType === 'toggles') {
            for (const [action, actionUpdates] of Object.entries(controlUpdates)) {
              config.controls[controlType][controlId][action] = {
                ...config.controls[controlType][controlId][action],
                ...actionUpdates
              };
            }
          } else {
            config.controls[controlType][controlId] = {
              ...config.controls[controlType][controlId],
              ...controlUpdates
            };
          }
        }
      }
      
      // Save updated config
      writeFileSync('config-controls.json', JSON.stringify(config, null, 2));
      console.log('✅ Config updated successfully!');
    } else {
      console.log('\nℹ️ No changes made.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

updateControlNames(); 