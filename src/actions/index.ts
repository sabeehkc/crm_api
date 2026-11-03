import { IDialogueState } from '../dialogue/stateTracker';
import logger from '../lib/logger';

export interface IActionResult {
  success: boolean;
  message?: string;
  data?: Record<string, any>;
  clearSession?: boolean;
}

export type ActionFunction = (state: IDialogueState) => Promise<IActionResult>;

export class ActionExecutor {
  private actions = new Map<string, ActionFunction>();

  constructor() {
    this.registerActions();
  }

  /**
   * Register available business actions
   */
  private registerActions() {
    // 1. Greet Action
    this.actions.set('greet_action', async (state) => {
      return {
        success: true,
        data: {
          timeOfDay: this.getTimeOfDay(),
        },
      };
    });

    // 2. Goodbye Action
    this.actions.set('goodbye_action', async (state) => {
      return {
        success: true,
        clearSession: true,
      };
    });

    // 3. Help Action
    this.actions.set('help_action', async (state) => {
      return {
        success: true,
      };
    });

    // 4. Book Flight Action
    this.actions.set('book_flight_action', async (state) => {
      const { destination, date } = state.slots;

      if (!destination || !date) {
        return {
          success: false,
          message: 'Missing required slots: destination and date are required.',
        };
      }

      // Generate a mock booking reference
      const bookingRef = `FL-${Math.floor(100000 + Math.random() * 900000)}`;

      logger.info(`✈️ ActionExecutor: Successfully booked flight to ${destination} on ${date}. Reference: ${bookingRef}`);

      return {
        success: true,
        data: {
          bookingRef,
          destination,
          date,
        },
        // We can choose to clear activeFlow and slots but keep the context so the user is greeted with a completion message
      };
    });
  }

  /**
   * Run an action by its registered name
   */
  public async execute(actionName: string, state: IDialogueState): Promise<IActionResult> {
    const action = this.actions.get(actionName);
    if (!action) {
      logger.error(`❌ ActionExecutor: Action "${actionName}" is not registered.`);
      return {
        success: false,
        message: `Action ${actionName} not found.`,
      };
    }

    try {
      logger.info(`⚙️ ActionExecutor: Running action "${actionName}"`);
      return await action(state);
    } catch (err: any) {
      logger.error(`❌ ActionExecutor: Failed to execute "${actionName}":`, err.message);
      return {
        success: false,
        message: `Internal error executing action ${actionName}: ${err.message}`,
      };
    }
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'day' {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'day';
  }
}

export default new ActionExecutor();
