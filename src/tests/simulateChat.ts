import { connectToDatabase, disconnectFromDatabase } from '../lib/mongoose';
import dialogueOrchestrator from '../services/dialogueOrchestrator';
import dialogueStateTracker from '../dialogue/stateTracker';
import logger from '../lib/logger';
import { Types } from 'mongoose';

// Clean test session helper
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runSimulation = async () => {
  try {
    logger.info('🧪 Starting Conversational Engine Test Simulation...');
    
    // 1. Connect to Database
    await connectToDatabase();

    // 2. Initialize orchestrator (seeds database and pre-trains NLU classifier)
    await dialogueOrchestrator.initialize();

    const sessionId = `test-session-${Math.floor(1000 + Math.random() * 9000)}`;
    const tenantId = new Types.ObjectId('000000000000000000000000');
    logger.info(`🧪 Session ID for simulation: ${sessionId}`);

    // Clear any previous state
    await dialogueStateTracker.clear(sessionId, tenantId);

    // Multi-turn script to simulate
    const turns = [
      { text: 'Hello, good afternoon', expect: 'greet' },
      { text: 'I need to book a flight to Delhi', expect: 'book_flight' },
      { text: 'help please', expect: 'help' }, // Interruption
      { text: 'tomorrow', expect: 'date' }, // Resuming and completing flight booking
      { text: 'thanks, bye', expect: 'goodbye' },
    ];

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      console.log('\n==================================================');
      console.log(`👤 TURN ${i + 1} | User input: "${turn.text}"`);
      console.log('==================================================');

      const response = await dialogueOrchestrator.handleMessage(sessionId, turn.text);

      console.log(`🤖 RESPONSE:`);
      console.log(response.text);
      console.log(`📊 NLU: Intent = "${response.intent}" (Confidence: ${response.confidence})`);
      console.log(`💾 STATE: Active Flow = "${response.activeFlow || 'none'}", Waiting For = "${response.waitingFor || 'none'}"`);
      console.log(`🎒 SLOTS: ${JSON.stringify(response.slots)}`);
      console.log(`⏱️ LATENCY: ${response.latencyMs}ms`);

      await sleep(1000);
    }

    console.log('\n==================================================');
    logger.info('✅ Simulation completed successfully!');
    
    // 3. Cleanup session
    await dialogueStateTracker.clear(sessionId, tenantId);
    await disconnectFromDatabase();
  } catch (error) {
    logger.error('❌ Simulation failed with error:', error);
    process.exit(1);
  }
};

runSimulation();
