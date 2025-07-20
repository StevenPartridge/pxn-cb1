import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ActionRunner, Logger } from '../types/index.js';

const execAsync = promisify(exec);

/**
 * Basic logging action runner
 */
export class LogActionRunner implements ActionRunner {
  name = 'LogActionRunner';

  constructor(private logger: Logger) {}

  async execute(_action: string, context?: Record<string, unknown>): Promise<void> {
    const buttonName = context?.buttonName as string || 'Unknown';
    const buttonIndex = context?.buttonIndex as number;
    
    this.logger.info(`Button pressed: ${buttonName} (index: ${buttonIndex})`);
    
    if (context?.rawData) {
      this.logger.debug('Raw data:', context.rawData);
    }
  }
}

/**
 * Shell command action runner
 */
export class ShellActionRunner implements ActionRunner {
  name = 'ShellActionRunner';

  constructor(private logger: Logger) {}

  async execute(action: string, _context?: Record<string, unknown>): Promise<void> {
    try {
      this.logger.info(`Executing shell command: ${action}`);
      
      const { stdout, stderr } = await execAsync(action);
      
      if (stdout) {
        this.logger.info('Command output:', stdout);
      }
      
      if (stderr) {
        this.logger.warn('Command stderr:', stderr);
      }
    } catch (error) {
      this.logger.error(`Failed to execute command: ${action}`, error);
    }
  }
}

/**
 * Macro action runner for complex sequences
 */
export class MacroActionRunner implements ActionRunner {
  name = 'MacroActionRunner';

  constructor(
    private logger: Logger,
    private actionRunners: ActionRunner[]
  ) {}

  async execute(action: string, context?: Record<string, unknown>): Promise<void> {
    try {
      // Parse macro definition (format: "macro:action1|action2|action3")
      if (!action.startsWith('macro:')) {
        throw new Error('Invalid macro format. Expected: macro:action1|action2|action3');
      }

      const macroActions = action.substring(6).split('|');
      this.logger.info(`Executing macro with ${macroActions.length} actions`);

      for (const [index, macroAction] of macroActions.entries()) {
        this.logger.debug(`Executing macro step ${index + 1}: ${macroAction}`);
        
        // Find appropriate action runner
        const runner = this.findRunnerForAction(macroAction);
        if (runner) {
          await runner.execute(macroAction, context);
        } else {
          this.logger.warn(`No runner found for action: ${macroAction}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to execute macro: ${action}`, error);
    }
  }

  private findRunnerForAction(action: string): ActionRunner | null {
    // Simple heuristic: if it starts with a command-like pattern, use shell runner
    if (action.includes(' ') || action.includes('/') || action.includes('\\')) {
      return this.actionRunners.find(r => r.name === 'ShellActionRunner') || null;
    }
    
    // Default to log runner
    return this.actionRunners.find(r => r.name === 'LogActionRunner') || null;
  }
}

/**
 * Action registry for managing multiple action runners
 */
export class ActionRegistry {
  private runners: ActionRunner[] = [];

  constructor(logger: Logger) {
    // Register default runners
    const logRunner = new LogActionRunner(logger);
    const shellRunner = new ShellActionRunner(logger);
    
    this.register(logRunner);
    this.register(shellRunner);
    this.register(new MacroActionRunner(logger, [logRunner, shellRunner]));
  }

  register(runner: ActionRunner): void {
    this.runners.push(runner);
  }

  async executeAction(action: string, context?: Record<string, unknown>): Promise<void> {
    const runner = this.findRunnerForAction(action);
    
    if (runner) {
      await runner.execute(action, context);
    } else {
      throw new Error(`No action runner found for action: ${action}`);
    }
  }

  private findRunnerForAction(action: string): ActionRunner | null {
    // Check for macro actions first
    if (action.startsWith('macro:')) {
      return this.runners.find(r => r.name === 'MacroActionRunner') || null;
    }

    // Check for shell commands
    if (action.includes(' ') || action.includes('/') || action.includes('\\')) {
      return this.runners.find(r => r.name === 'ShellActionRunner') || null;
    }

    // Default to log runner
    return this.runners.find(r => r.name === 'LogActionRunner') || null;
  }

  getAllRunners(): ActionRunner[] {
    return [...this.runners];
  }
} 