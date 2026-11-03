import logger from '../../lib/logger';

export interface ITrainingExample {
  intent: string;
  text: string;
}

export interface IClassificationResult {
  intent: string;
  confidence: number;
}

export class IntentClassifier {
  private trainingData: ITrainingExample[] = [];
  private vocabulary: string[] = [];
  private idfs: Record<string, number> = {};
  private trainedVectors: Array<{ intent: string; vector: number[] }> = [];
  private isTrained = false;

  constructor() {}

  /**
   * Tokenize and preprocess input text
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 0);
  }

  /**
   * Train the classifier on an array of training examples
   */
  public train(examples: ITrainingExample[]): void {
    if (examples.length === 0) {
      logger.warn('IntentClassifier: Received empty training set.');
      this.isTrained = false;
      return;
    }

    this.trainingData = examples;

    // 1. Build Vocabulary and Document Counts
    const docTokens = examples.map((ex) => this.tokenize(ex.text));
    const allWords = new Set<string>();
    const docCountWithWord: Record<string, number> = {};

    docTokens.forEach((tokens) => {
      const uniqueTokens = new Set(tokens);
      uniqueTokens.forEach((word) => {
        allWords.add(word);
        docCountWithWord[word] = (docCountWithWord[word] || 0) + 1;
      });
    });

    this.vocabulary = Array.from(allWords);
    const N = examples.length;

    // 2. Compute IDF for each word in vocabulary
    this.idfs = {};
    this.vocabulary.forEach((word) => {
      const df = docCountWithWord[word] || 0;
      // Smooth IDF formula
      this.idfs[word] = Math.log((1 + N) / (1 + df)) + 1;
    });

    // 3. Compute TF-IDF vector for each training example
    this.trainedVectors = examples.map((ex, index) => {
      const tokens = docTokens[index];
      const vector = this.computeTfidfVector(tokens);
      return { intent: ex.intent, vector };
    });

    this.isTrained = true;
    logger.info(`🎯 IntentClassifier: Trained on ${N} examples, vocabulary size: ${this.vocabulary.length}`);
  }

  /**
   * Compute TF-IDF vector for a tokenized document
   */
  private computeTfidfVector(tokens: string[]): number[] {
    const termCounts: Record<string, number> = {};
    tokens.forEach((t) => {
      termCounts[t] = (termCounts[t] || 0) + 1;
    });

    const docLength = tokens.length || 1;

    return this.vocabulary.map((word) => {
      const tf = (termCounts[word] || 0) / docLength;
      const idf = this.idfs[word] || 0;
      return tf * idf;
    });
  }

  /**
   * Calculate Cosine Similarity between two vectors
   */
  private cosineSimilarity(v1: number[], v2: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      normA += v1[i] * v1[i];
      normB += v2[i] * v2[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Classify an input text and return the intent and confidence score
   */
  public classify(text: string): IClassificationResult {
    if (!this.isTrained || this.trainedVectors.length === 0) {
      return { intent: 'nlu_fallback', confidence: 0 };
    }

    const queryTokens = this.tokenize(text);
    if (queryTokens.length === 0) {
      return { intent: 'nlu_fallback', confidence: 0 };
    }

    const queryVector = this.computeTfidfVector(queryTokens);

    let bestIntent = 'nlu_fallback';
    let bestSimilarity = 0;

    // Calculate similarity against all trained examples
    this.trainedVectors.forEach((trained) => {
      const sim = this.cosineSimilarity(queryVector, trained.vector);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestIntent = trained.intent;
      }
    });

    return {
      intent: bestIntent,
      confidence: parseFloat(bestSimilarity.toFixed(4)),
    };
  }
}
export default new IntentClassifier();
