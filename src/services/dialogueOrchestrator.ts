import nluPipeline from '../nlu';
import dialogueStateTracker, { IDialogueState } from '../dialogue/stateTracker';
import contextManager from '../dialogue/contextManager';
import slotFillingEngine from '../dialogue/slotFilling';
import policyEngine from '../policies/policyEngine';
import actionExecutor, { IActionResult } from '../actions';
import responseGenerator from '../responses';
import MessageModel from '../models/Message';
import AnalyticsModel from '../models/Analytics';
import logger from '../lib/logger';
import { Types } from 'mongoose';

export interface IOrchestratorResponse {
  text: string;
  intent: string;
  confidence: number;
  activeFlow?: string;
  waitingFor?: string;
  slots: Record<string, any>;
  contexts?: any[];
  latencyMs: number;
}

export class DialogueOrchestrator {
  constructor() {}

  /**
   * Initializes the orchestrator (flows/intents are loaded dynamically per tenant)
   */
  public async initialize(): Promise<void> {
    logger.info('🚀 DialogueOrchestrator: Conversational engine is ready.');
  }

  /**
   * Orchestrates a single conversation turn
   */
  public async handleMessage(sessionId: string, text: string, userId?: string, tenantId?: string): Promise<IOrchestratorResponse> {
    const startTime = Date.now();
    logger.info(`💬 Orchestrator: Incoming message on session "${sessionId}": "${text}"`);

    // 1. Resolve tenantId
    let tenantIdObj: Types.ObjectId | undefined;
    if (tenantId) {
      try {
        tenantIdObj = new Types.ObjectId(tenantId);
      } catch (err) {
        // Invalid ObjectId passed
      }
    }

    if (!tenantIdObj && userId) {
      try {
        const UserModel = require('../models/user').default;
        const user = await UserModel.findById(userId);
        if (user && user.tenantId) {
          tenantIdObj = user.tenantId;
        }
      } catch (err) {
        // Ignore user lookup error
      }
    }

    if (!tenantIdObj) {
      try {
        const ConversationModel = require('../models/Conversation').default;
        const existingConv = await ConversationModel.findOne({ sessionId });
        if (existingConv && existingConv.tenantId) {
          tenantIdObj = existingConv.tenantId;
        }
      } catch (err) {
        // Ignore existing conversation lookup error
      }
    }

    if (!tenantIdObj) {
      // Fallback for simulation tests / local sandbox
      try {
        const TenantModel = require('../models/tenant').default;
        const firstTenant = await TenantModel.findOne();
        if (firstTenant) {
          tenantIdObj = firstTenant._id;
        } else {
          tenantIdObj = new Types.ObjectId('000000000000000000000000');
        }
      } catch (err) {
        tenantIdObj = new Types.ObjectId('000000000000000000000000');
      }
    }

    const activeTenantId = tenantIdObj!;

    // 2. Load session state from Redis/MongoDB
    const state = await dialogueStateTracker.load(sessionId, activeTenantId);
    if (userId && !state.sessionId.startsWith('test-')) {
      // Bind user if available
      try {
        const ConversationModel = require('../models/Conversation').default;
        await ConversationModel.findOneAndUpdate({ sessionId, tenantId: activeTenantId }, { userId }, { upsert: true });
      } catch (err) {
        // Ignore user bind errors in analytics/testing
      }
    }

    // 3. Run NLU processing (Intent + Entities)
    const nlu = await nluPipeline.process(text, activeTenantId);
    logger.info(`🔍 Orchestrator NLU Result: Intent: "${nlu.intent}" (${nlu.confidence}), Entities: ${JSON.stringify(nlu.entities)}`);

    // 4. Tick contexts (decrement lifespans)
    contextManager.tick(state);

    // 5. Evaluate conversation policy rules & detect interruptions
    const tenantFlows = await policyEngine.getFlowsForTenant(activeTenantId);
    const policy = policyEngine.evaluate(state, nlu.intent, nlu.confidence, tenantFlows);

    let systemResponse = '';
    let isFlowCompleted = false;

    // Handle Interruption / Switch Flow
    if (policy.isInterruption && policy.nextFlow) {
      state.activeFlow = policy.nextFlow.name;
      state.slots = {}; // Reset slots for new flow
      state.waitingFor = undefined;
    } else if (policy.nextFlow && !state.activeFlow) {
      // Start a brand new flow
      state.activeFlow = policy.nextFlow.name;
      state.slots = {};
      state.waitingFor = undefined;
    }

    // 6. Check if there is an active flow (newly triggered or continuing)
    if (state.activeFlow) {
      const activeFlowObj = tenantFlows.get(state.activeFlow);
      if (activeFlowObj) {
        // Perform slot filling
        const slotResult = slotFillingEngine.fillSlots(state, activeFlowObj, nlu.entities, text);

        if (!slotResult.isComplete) {
          // Keep prompting for slots
          systemResponse = slotResult.prompt || `Please provide details for ${state.waitingFor}`;
        } else {
          // Flow is completed! Run final business action.
          isFlowCompleted = true;
          const actionResult = await actionExecutor.execute(activeFlowObj.onCompleteAction || '', state);

          // Generate success response from action results
          systemResponse = responseGenerator.generate(activeFlowObj.onCompleteAction || '', state, actionResult);

          // Clear active flow since it completed
          state.activeFlow = undefined;
          state.slots = {};
          state.waitingFor = undefined;

          // Check if there is a suspended flow to resume
          const suspendedContext = contextManager.get(state, 'suspended_flow_context');
          if (suspendedContext && suspendedContext.parameters.flowName) {
            const restoredFlowName = suspendedContext.parameters.flowName;
            const restoredSlots = suspendedContext.parameters.slots || {};
            const restoredWaitingFor = suspendedContext.parameters.waitingFor;

            logger.info(`🔄 Orchestrator: Resuming suspended flow "${restoredFlowName}"`);

            // Restore state
            state.activeFlow = restoredFlowName;
            state.slots = restoredSlots;
            state.waitingFor = restoredWaitingFor;

            // Remove suspension context
            contextManager.remove(state, 'suspended_flow_context');

            // Evaluate next slots for restored flow
            const restoredFlowObj = tenantFlows.get(restoredFlowName);
            if (restoredFlowObj) {
              const resumeSlotResult = slotFillingEngine.fillSlots(state, restoredFlowObj, [], '');
              if (!resumeSlotResult.isComplete) {
                // Combine completed message with prompt to resume
                const resumePrompt = responseGenerator.generate('interruption_resume', state, null, resumeSlotResult.prompt);
                systemResponse = `${systemResponse}\n\n${resumePrompt}`;
              }
            }
          }
        }
      }
    } else {
      // 7. No active flow. Check if intent triggers a simple static action (greet, goodbye, help) or fallback
      const actionName = `${nlu.intent}_action`;
      let actionResult: IActionResult | null = null;

      if (nlu.intent !== 'nlu_fallback') {
        actionResult = await actionExecutor.execute(actionName, state);
        systemResponse = responseGenerator.generate(actionName, state, actionResult);

        if (actionResult.clearSession) {
          state.activeFlow = undefined;
          state.slots = {};
          state.waitingFor = undefined;
          state.contexts = [];
        }
      } else {
        // Trigger fallback response
        systemResponse = responseGenerator.generate('nlu_fallback', state, null);
      }
    }

    // 8. Save updated dialogue state back to Redis & MongoDB
    await dialogueStateTracker.save(sessionId, state, activeTenantId);

    // Calculate latency
    const latencyMs = Date.now() - startTime;

    // 9. Log message exchanges asynchronously in MongoDB
    this.logConversation(sessionId, text, systemResponse, nlu, state, latencyMs, activeTenantId).catch((err) =>
      logger.error('Orchestrator: Failed to log message history to DB:', err.message)
    );

    // 10. Write KPIs to Analytics Collection asynchronously
    this.logAnalytics(sessionId, nlu, state, isFlowCompleted, latencyMs, activeTenantId).catch((err) =>
      logger.error('Orchestrator: Failed to log metrics to Analytics:', err.message)
    );

    return {
      text: systemResponse,
      intent: nlu.intent,
      confidence: nlu.confidence,
      activeFlow: state.activeFlow,
      waitingFor: state.waitingFor,
      slots: state.slots,
      contexts: state.contexts,
      latencyMs,
    };
  }

  /**
   * Helper to persist exchange messages in MongoDB
   */
  private async logConversation(
    sessionId: string,
    userText: string,
    botResponse: string,
    nluResult: any,
    stateSnapshot: IDialogueState,
    latencyMs: number,
    tenantId: Types.ObjectId
  ): Promise<void> {
    // Save user message
    await MessageModel.create({
      sessionId,
      sender: 'user',
      text: userText,
      timestamp: new Date(),
      nluAnalysis: {
        intent: nluResult.intent,
        confidence: nluResult.confidence,
        entities: nluResult.entities,
      },
      latencyMs,
      tenantId,
    });

    // Save bot response
    await MessageModel.create({
      sessionId,
      sender: 'bot',
      text: botResponse,
      timestamp: new Date(),
      stateSnapshot: {
        activeFlow: stateSnapshot.activeFlow,
        waitingFor: stateSnapshot.waitingFor,
        slots: stateSnapshot.slots,
        contexts: stateSnapshot.contexts,
      },
      tenantId,
    });
  }

  /**
   * Helper to write analytical metrics
   */
  private async logAnalytics(
    sessionId: string,
    nluResult: any,
    state: IDialogueState,
    isCompletedFlow: boolean,
    latencyMs: number,
    tenantId: Types.ObjectId
  ): Promise<void> {
    await AnalyticsModel.create({
      sessionId,
      intentDetected: nluResult.intent,
      confidenceScore: nluResult.confidence,
      isFallback: nluResult.intent === 'nlu_fallback',
      activeFlow: state.activeFlow,
      isCompletedFlow,
      latencyMs,
      timestamp: new Date(),
      tenantId,
    });
  }
}

export default new DialogueOrchestrator();
