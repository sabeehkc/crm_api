import intentClassifierInstance, { IntentClassifier } from './intentClassifier';
import entityExtractorInstance, { EntityExtractor, IExtractedEntity } from './entityExtractor';
import IntentModel from '../models/Intent';
import logger from '../lib/logger';
import { Types } from 'mongoose';

export interface INluResult {
  text: string;
  intent: string;
  confidence: number;
  entities: IExtractedEntity[];
}

export class NluPipeline {
  private extractor: EntityExtractor;
  private confidenceThreshold = 0.45; // Below this, trigger fallback
  private classifiers = new Map<string, IntentClassifier>();

  constructor() {
    this.extractor = entityExtractorInstance;
  }

  /**
   * Seed default training examples to ensure NLU functions without database config
   */
  private getDefaultTrainingExamples() {
    return [
      { intent: 'greet', text: 'hello' },
      { intent: 'greet', text: 'hi' },
      { intent: 'greet', text: 'hey' },
      { intent: 'greet', text: 'greetings' },
      { intent: 'greet', text: 'good morning' },
      
      { intent: 'goodbye', text: 'bye' },
      { intent: 'goodbye', text: 'goodbye' },
      { intent: 'goodbye', text: 'see you later' },
      { intent: 'goodbye', text: 'talk to you later' },
      
      { intent: 'book_flight', text: 'book a flight' },
      { intent: 'book_flight', text: 'i need to book a flight to Delhi' },
      { intent: 'book_flight', text: 'fly to Mumbai tomorrow' },
      { intent: 'book_flight', text: 'get me a flight' },
      { intent: 'book_flight', text: 'i want to fly to London' },
      
      { intent: 'help', text: 'help' },
      { intent: 'help', text: 'what can you do' },
      { intent: 'help', text: 'how to use this' },
      { intent: 'help', text: 'i am stuck' },
    ];
  }

  /**
   * Load training data from MongoDB, compile and train the intent classifier for a tenant
   */
  public async train(tenantId: Types.ObjectId): Promise<void> {
    const tenantKey = tenantId.toString();
    try {
      const dbIntents = await IntentModel.getTrainingData(tenantId);
      const trainingExamples: { intent: string; text: string }[] = [];

      if (dbIntents.length > 0) {
        dbIntents.forEach((item) => {
          item.examples.forEach((example) => {
            trainingExamples.push({ intent: item.name, text: example });
          });
        });
        logger.info(`💾 NLU: Loaded ${trainingExamples.length} training examples from MongoDB for tenant ${tenantKey}.`);
      } else {
        // Use default examples in memory, no need to force-seed database
        const defaults = this.getDefaultTrainingExamples();
        trainingExamples.push(...defaults);
        logger.info(`💾 NLU: MongoDB is empty for tenant ${tenantKey}. Seeding classifier with ${defaults.length} default in-memory examples.`);
      }

      const classifier = new IntentClassifier();
      classifier.train(trainingExamples);
      this.classifiers.set(tenantKey, classifier);
    } catch (error: any) {
      logger.error(`❌ NLU Pipeline training failed for tenant ${tenantKey}. Using default examples. Error:`, error.message);
      const classifier = new IntentClassifier();
      classifier.train(this.getDefaultTrainingExamples());
      this.classifiers.set(tenantKey, classifier);
    }
  }

  /**
   * Get or train classifier for a specific tenant
   */
  public async getClassifier(tenantId: Types.ObjectId): Promise<IntentClassifier> {
    const tenantKey = tenantId.toString();
    if (!this.classifiers.has(tenantKey)) {
      await this.train(tenantId);
    }
    return this.classifiers.get(tenantKey)!;
  }

  /**
   * Main entrypoint to process raw user inputs
   */
  public async process(text: string, tenantId: Types.ObjectId): Promise<INluResult> {
    const cleanedText = text.trim();
    if (!cleanedText) {
      return {
        text: '',
        intent: 'nlu_fallback',
        confidence: 0,
        entities: [],
      };
    }

    // 1. Intent Classification using the tenant's classifier
    const classifier = await this.getClassifier(tenantId);
    const classification = classifier.classify(cleanedText);

    // 2. Fallback check
    let intent = classification.intent;
    let confidence = classification.confidence;

    if (confidence < this.confidenceThreshold) {
      intent = 'nlu_fallback';
    }

    // 3. Entity Extraction
    const entities = this.extractor.extract(cleanedText);

    return {
      text: cleanedText,
      intent,
      confidence,
      entities,
    };
  }
}

export default new NluPipeline();
