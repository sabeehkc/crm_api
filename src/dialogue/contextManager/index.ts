import { IDialogueState, IDialogueContext } from '../stateTracker';

export class ContextManager {
  constructor() {}

  /**
   * Set or update a context in the state
   */
  public set(state: IDialogueState, name: string, lifespan: number, parameters: Record<string, any> = {}): void {
    const existingIndex = state.contexts.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());

    if (existingIndex !== -1) {
      // Merge parameters and update lifespan
      state.contexts[existingIndex].lifespan = lifespan;
      state.contexts[existingIndex].parameters = {
        ...state.contexts[existingIndex].parameters,
        ...parameters,
      };
    } else {
      // Create new context
      state.contexts.push({
        name,
        lifespan,
        parameters,
      });
    }
  }

  /**
   * Get an active context by name
   */
  public get(state: IDialogueState, name: string): IDialogueContext | null {
    const ctx = state.contexts.find((c) => c.name.toLowerCase() === name.toLowerCase());
    return ctx || null;
  }

  /**
   * Remove a context from the state
   */
  public remove(state: IDialogueState, name: string): void {
    state.contexts = state.contexts.filter((c) => c.name.toLowerCase() !== name.toLowerCase());
  }

  /**
   * Decrement lifespans of all active contexts. Remove those that hit 0.
   */
  public tick(state: IDialogueState): void {
    state.contexts = state.contexts
      .map((c) => {
        c.lifespan -= 1;
        return c;
      })
      .filter((c) => c.lifespan > 0);
  }
}

export default new ContextManager();
