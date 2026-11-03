import { IDialogueState } from '../dialogue/stateTracker';
import { IActionResult } from '../actions';
import logger from '../lib/logger';

export class ResponseGenerator {
  // Predefined templates for actions and system events
  private templates: Record<string, string[]> = {
    greet_action: [
      'Hello! Good {timeOfDay}. How can I assist you today?',
      'Hi there! Hope you are having a good {timeOfDay}. What can I do for you?',
      'Greetings! How can I help you today?',
    ],
    goodbye_action: [
      'Goodbye! Have a wonderful day!',
      'Bye! Let me know if you need anything else.',
      'Take care! Have a safe trip!',
    ],
    help_action: [
      'I am an intent-based digital assistant. Currently, I can help you with: \n1. Booking a flight (say "I need a flight") \nLet me know how I can help!',
      'You can ask me to "book a flight". I will ask you for your destination and travel date.',
    ],
    book_flight_action: [
      'I have successfully booked your flight to {destination} on {date}. Your confirmation code is **{bookingRef}**.',
      'All set! Your flight to {destination} for {date} is reserved. Booking reference: **{bookingRef}**.',
      'Success! Seat confirmed for {destination} on {date}. Ref: **{bookingRef}**.',
    ],
    nlu_fallback: [
      "I'm sorry, I didn't quite catch that. Could you please rephrase?",
      "I didn't understand that. Could you try asking in a different way?",
      "Apologies, that's beyond my current capabilities. Try asking to 'book a flight'.",
    ],
    interruption_resume: [
      "Now, returning to your flight booking to {destination}. {prompt}",
      "Let's get back to your flight request. {prompt}",
    ],
  };

  constructor() {}

  /**
   * Generates response string by selecting a random template and interpolating variables
   */
  public generate(
    key: string,
    state: IDialogueState,
    actionResult?: IActionResult | null,
    extraPrompt?: string
  ): string {
    const templatesList = this.templates[key];

    if (!templatesList || templatesList.length === 0) {
      logger.warn(`ResponseGenerator: No templates found for key "${key}"`);
      return `Processed action: ${key}.`;
    }

    // Select random template variation
    const index = Math.floor(Math.random() * templatesList.length);
    let template = templatesList[index];

    // Compile variables map
    const vars: Record<string, any> = {};

    // 1. Add state slots
    Object.keys(state.slots).forEach((slotName) => {
      vars[slotName] = state.slots[slotName];
    });

    // 2. Add action results data
    if (actionResult && actionResult.data) {
      Object.keys(actionResult.data).forEach((dataKey) => {
        vars[dataKey] = actionResult.data![dataKey];
      });
    }

    // 3. Add context variables
    state.contexts.forEach((ctx) => {
      Object.keys(ctx.parameters).forEach((paramKey) => {
        vars[paramKey] = ctx.parameters[paramKey];
      });
    });

    // 4. Add extra prompt placeholder (for resume flows)
    if (extraPrompt) {
      vars['prompt'] = extraPrompt;
    }

    // Interpolate variables
    const interpolated = this.interpolate(template, vars);
    return interpolated;
  }

  /**
   * Helper to replace {placeholder} with variables from object
   */
  private interpolate(template: string, vars: Record<string, any>): string {
    return template.replace(/\{([^{}]+)\}/g, (match, key) => {
      if (vars[key] !== undefined) {
        return String(vars[key]);
      }
      return match; // return original placeholder if key is missing
    });
  }
}

export default new ResponseGenerator();
