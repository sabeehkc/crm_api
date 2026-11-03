import FlowModel, { IFlow } from '../models/Flow';
import { IDialogueState } from '../dialogue/stateTracker';
import contextManager from '../dialogue/contextManager';
import logger from '../lib/logger';
import { Types } from 'mongoose';

export class PolicyEngine {
  private flowsByTenant = new Map<string, Map<string, IFlow>>();

  constructor() {}

  /**
   * Pre-loads default flows in memory
   */
  private getDefaultFlows(): IFlow[] {
    return [
      {
        name: 'book_flight',
        intentTrigger: 'book_flight',
        requiredSlots: [
          {
            name: 'destination',
            type: 'string',
            isRequired: true,
            promptTemplates: [
              'Where are you flying to?',
              'What is your destination city?',
              'Which city would you like to travel to?',
            ],
          },
          {
            name: 'date',
            type: 'date',
            isRequired: true,
            promptTemplates: [
              'When do you want to travel?',
              'What is the date of your flight?',
              'Please specify a departure date (YYYY-MM-DD).',
            ],
          },
        ],
        onCompleteAction: 'book_flight_action',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'greet',
        intentTrigger: 'greet',
        requiredSlots: [],
        onCompleteAction: 'greet_action',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'goodbye',
        intentTrigger: 'goodbye',
        requiredSlots: [],
        onCompleteAction: 'goodbye_action',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'help',
        intentTrigger: 'help',
        requiredSlots: [],
        onCompleteAction: 'help_action',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  /**
   * Syncs custom flows from MongoDB into memory for a specific tenant
   */
  public async getFlowsForTenant(tenantId: Types.ObjectId): Promise<Map<string, IFlow>> {
    const tenantKey = tenantId.toString();
    if (this.flowsByTenant.has(tenantKey)) {
      return this.flowsByTenant.get(tenantKey)!;
    }

    const registry = new Map<string, IFlow>();
    // First, register standard defaults in memory
    const defaults = this.getDefaultFlows();
    defaults.forEach((flow) => {
      registry.set(flow.name, flow);
    });

    // Load custom flows for this tenant from database
    try {
      const dbFlows = await FlowModel.find({ tenantId });
      dbFlows.forEach((flow) => {
        registry.set(flow.name, flow);
      });
      logger.info(`📋 PolicyEngine: Loaded ${dbFlows.length} custom flows from MongoDB for tenant ${tenantKey}.`);
    } catch (err: any) {
      logger.error(`❌ PolicyEngine: Failed to load flows from DB for tenant ${tenantKey}. Error:`, err.message);
    }

    this.flowsByTenant.set(tenantKey, registry);
    return registry;
  }

  /**
   * Reload flows for a tenant
   */
  public async loadFlows(tenantId?: Types.ObjectId): Promise<void> {
    if (!tenantId) return;
    const tenantKey = tenantId.toString();
    this.flowsByTenant.delete(tenantKey);
    await this.getFlowsForTenant(tenantId);
  }

  /**
   * Find a flow by its trigger intent name
   */
  public findFlowByIntent(intentName: string, tenantFlows: Map<string, IFlow>): IFlow | null {
    for (const flow of tenantFlows.values()) {
      if (flow.intentTrigger === intentName) {
        return flow;
      }
    }
    return null;
  }

  /**
   * Evaluates the next transition / policy action based on current state and new NLU intent
   */
  public evaluate(
    state: IDialogueState,
    detectedIntent: string,
    confidence: number,
    tenantFlows: Map<string, IFlow>
  ): {
    nextFlow?: IFlow;
    isInterruption: boolean;
    suspendedFlow?: string;
  } {
    // 1. If there's no active flow, check if the detected intent triggers a new flow
    if (!state.activeFlow) {
      const newFlow = this.findFlowByIntent(detectedIntent, tenantFlows);
      return {
        nextFlow: newFlow || undefined,
        isInterruption: false,
      };
    }

    // 2. If there is an active flow, check if the user is interrupting with a different high-confidence intent
    const activeFlowObj = tenantFlows.get(state.activeFlow);
    if (activeFlowObj && activeFlowObj.intentTrigger !== detectedIntent && detectedIntent !== 'nlu_fallback') {
      const interruptingFlow = this.findFlowByIntent(detectedIntent, tenantFlows);
      
      // Interruptions must meet high confidence (e.g. >= 0.70)
      if (interruptingFlow && confidence >= 0.70) {
        logger.warn(`🔀 PolicyEngine: Interruption detected. Suspending "${state.activeFlow}" for "${interruptingFlow.name}".`);

        // Save active flow state to suspension context
        contextManager.set(state, 'suspended_flow_context', 3, {
          flowName: state.activeFlow,
          slots: { ...state.slots },
          waitingFor: state.waitingFor,
        });

        return {
          nextFlow: interruptingFlow,
          isInterruption: true,
          suspendedFlow: state.activeFlow,
        };
      }
    }

    // 3. Keep current flow active
    return {
      nextFlow: activeFlowObj || undefined,
      isInterruption: false,
    };
  }
}

export default new PolicyEngine();
