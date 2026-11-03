import logger from '../../lib/logger';

export interface IExtractedEntity {
  name: string;
  value: any;
  raw: string;
  startIndex: number;
  endIndex: number;
}

export interface IDictionaryEntity {
  canonical: string;
  synonyms: string[];
}

export class EntityExtractor {
  // Pre-configured custom dictionaries
  private dictionaries: Record<string, IDictionaryEntity[]> = {
    destination: [
      { canonical: 'Delhi', synonyms: ['delhi', 'new delhi', 'del', 'indira gandhi international'] },
      { canonical: 'Mumbai', synonyms: ['mumbai', 'bombay', 'bom', 'chhatrapati shivaji'] },
      { canonical: 'London', synonyms: ['london', 'heathrow', 'lhr', 'gatwick'] },
      { canonical: 'New York', synonyms: ['new york', 'ny', 'nyc', 'jfk'] },
    ],
    class_type: [
      { canonical: 'Economy', synonyms: ['economy', 'coach', 'standard', 'eco'] },
      { canonical: 'Business', synonyms: ['business', 'biz', 'executive'] },
      { canonical: 'First Class', synonyms: ['first class', 'first', 'suite'] },
    ],
  };

  constructor() {}

  /**
   * Add custom dictionary dynamically
   */
  public registerDictionary(entityName: string, items: IDictionaryEntity[]): void {
    this.dictionaries[entityName] = items;
    logger.info(`📚 EntityExtractor: Registered dictionary for entity "${entityName}" with ${items.length} entries.`);
  }

  /**
   * Extract all entities from the text input
   */
  public extract(text: string): IExtractedEntity[] {
    const results: IExtractedEntity[] = [];

    // 1. Extract Emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match: RegExpExecArray | null;
    while ((match = emailRegex.exec(text)) !== null) {
      results.push({
        name: 'email',
        value: match[0],
        raw: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    // 2. Extract Numbers
    const numberRegex = /\b\d+\b/g;
    while ((match = numberRegex.exec(text)) !== null) {
      const currentMatch = match;
      // Avoid matching numbers inside emails
      const isInsideEmail = results.some(
        (r) => r.name === 'email' && currentMatch.index >= r.startIndex && currentMatch.index < r.endIndex
      );
      if (!isInsideEmail) {
        results.push({
          name: 'number',
          value: parseInt(currentMatch[0], 10),
          raw: currentMatch[0],
          startIndex: currentMatch.index,
          endIndex: currentMatch.index + currentMatch[0].length,
        });
      }
    }

    // 3. Extract Dates (System Entity)
    // Support "today", "tomorrow" and YYYY-MM-DD formats
    const today = new Date();
    const dateKeywords = [
      { keyword: 'today', offsetDays: 0 },
      { keyword: 'tomorrow', offsetDays: 1 },
      { keyword: 'day after tomorrow', offsetDays: 2 },
    ];

    dateKeywords.forEach(({ keyword, offsetDays }) => {
      const idx = text.toLowerCase().indexOf(keyword);
      if (idx !== -1) {
        const resolvedDate = new Date(today);
        resolvedDate.setDate(today.getDate() + offsetDays);
        results.push({
          name: 'date',
          value: resolvedDate.toISOString().split('T')[0],
          raw: text.substring(idx, idx + keyword.length),
          startIndex: idx,
          endIndex: idx + keyword.length,
        });
      }
    });

    // Match YYYY-MM-DD dates
    const yyyymmddRegex = /\b(\d{4})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/g;
    while ((match = yyyymmddRegex.exec(text)) !== null) {
      results.push({
        name: 'date',
        value: match[0],
        raw: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    // 4. Extract Dictionary Entities
    Object.keys(this.dictionaries).forEach((entityName) => {
      const dictionary = this.dictionaries[entityName];

      dictionary.forEach((item) => {
        item.synonyms.forEach((synonym) => {
          // Check for exact word boundaries to avoid false positives (e.g. matching "del" in "delicious")
          const escapedSynonym = synonym.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const dictRegex = new RegExp(`\\b${escapedSynonym}\\b`, 'gi');

          let dictMatch;
          while ((dictMatch = dictRegex.exec(text)) !== null) {
            results.push({
              name: entityName,
              value: item.canonical,
              raw: dictMatch[0],
              startIndex: dictMatch.index,
              endIndex: dictMatch.index + dictMatch[0].length,
            });
          }
        });
      });
    });

    // Remove duplicates or overlapping entity match bounds (keeping the longest match)
    return this.resolveOverlappingEntities(results);
  }

  /**
   * Resolves overlaps where one span is contained in or overlaps with another.
   */
  private resolveOverlappingEntities(entities: IExtractedEntity[]): IExtractedEntity[] {
    // Sort by start index ascending, and length descending
    entities.sort((a, b) => {
      if (a.startIndex !== b.startIndex) {
        return a.startIndex - b.startIndex;
      }
      return (b.endIndex - b.startIndex) - (a.endIndex - a.startIndex);
    });

    const filtered: IExtractedEntity[] = [];
    let lastEnd = -1;

    entities.forEach((entity) => {
      if (entity.startIndex >= lastEnd) {
        filtered.push(entity);
        lastEnd = entity.endIndex;
      }
    });

    return filtered;
  }
}

export default new EntityExtractor();
