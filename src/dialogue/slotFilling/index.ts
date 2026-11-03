import { IDialogueState } from '../stateTracker';
import { IExtractedEntity } from '../../nlu/entityExtractor';
import { IFlow } from '../../models/Flow';
import logger from '../../lib/logger';

export interface ISlotFillingResult {
  isComplete: boolean;
  missingSlotName?: string;
  prompt?: string;
}

export class SlotFillingEngine {
  constructor() {}

  /**
   * Processes the dialogue state and fills slots using incoming NLU details
   */
  public fillSlots(
    state: IDialogueState,
    flow: IFlow,
    extractedEntities: IExtractedEntity[],
    userText: string
  ): ISlotFillingResult {
    logger.info(`📥 SlotFilling: Processing slots for active flow "${flow.name}". Current slots: ${JSON.stringify(state.slots)}`);

    // 1. If we are explicitly waiting for a slot, check if the entire user input matches the type or contains entities
    if (state.waitingFor) {
      const waitingSlot = flow.requiredSlots.find((s) => s.name === state.waitingFor);
      if (waitingSlot) {
        // Try to find if there is an extracted entity that matches the expected slot name
        const matchedEntity = extractedEntities.find((e) => e.name === waitingSlot.name || e.name === waitingSlot.type);

        if (matchedEntity) {
          state.slots[waitingSlot.name] = matchedEntity.value;
          logger.info(`✨ SlotFilling: Filled slot [${waitingSlot.name}] from entity value [${matchedEntity.value}]`);
          state.waitingFor = undefined;
        } else {
          // If no formal entity was extracted but the type matches simple strings, consume the text directly
          const validated = this.validateRawInput(userText, waitingSlot.type);
          if (validated !== null) {
            state.slots[waitingSlot.name] = validated;
            logger.info(`✨ SlotFilling: Filled slot [${waitingSlot.name}] from raw text input [${validated}]`);
            state.waitingFor = undefined;
          } else {
            // Correction/Validation failure
            logger.warn(`⚠️ SlotFilling: Validation failed for slot [${waitingSlot.name}] with input "${userText}"`);
            // Retain waitingFor to prompt again
            const randomPrompt = this.getRandomPrompt(waitingSlot.promptTemplates) || `Please provide a valid ${waitingSlot.name}.`;
            return {
              isComplete: false,
              missingSlotName: waitingSlot.name,
              prompt: `I didn't quite get that. ${randomPrompt}`,
            };
          }
        }
      }
    }

    // 2. Also map any other entities present in the user text to required slots
    extractedEntities.forEach((entity) => {
      // Find a slot in the current flow that matches the entity name or type
      const targetSlot = flow.requiredSlots.find(
        (slot) => slot.name === entity.name || (slot.type === entity.name && !state.slots[slot.name])
      );

      if (targetSlot) {
        state.slots[targetSlot.name] = entity.value;
        logger.info(`✨ SlotFilling: Auto-filled slot [${targetSlot.name}] with value [${entity.value}]`);
      }
    });

    // 3. Find the next missing required slot
    const nextMissingSlot = flow.requiredSlots.find((slot) => slot.isRequired && state.slots[slot.name] === undefined);

    if (nextMissingSlot) {
      state.waitingFor = nextMissingSlot.name;
      const prompt = this.getRandomPrompt(nextMissingSlot.promptTemplates) || `Please enter ${nextMissingSlot.name}.`;
      return {
        isComplete: false,
        missingSlotName: nextMissingSlot.name,
        prompt,
      };
    }

    // All slots are satisfied!
    state.waitingFor = undefined;
    return {
      isComplete: true,
    };
  }

  /**
   * Selects a random prompt from configured options
   */
  private getRandomPrompt(prompts: string[]): string | undefined {
    if (!prompts || prompts.length === 0) return undefined;
    const index = Math.floor(Math.random() * prompts.length);
    return prompts[index];
  }

  /**
   * Helper to validate and convert raw input depending on expected type
   */
  private validateRawInput(text: string, type: 'string' | 'number' | 'date' | 'email'): any {
    const trimmed = text.trim();
    if (!trimmed) return null;

    switch (type) {
      case 'string':
        return trimmed.length > 0 ? trimmed : null;
      case 'number':
        const num = Number(trimmed);
        return isNaN(num) ? null : num;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(trimmed) ? trimmed : null;
      case 'date':
        // Check if YYYY-MM-DD or standard parseable date
        const parsedDate = Date.parse(trimmed);
        if (!isNaN(parsedDate)) {
          return new Date(parsedDate).toISOString().split('T')[0];
        }
        return null;
      default:
        return null;
    }
  }
}

export default new SlotFillingEngine();
