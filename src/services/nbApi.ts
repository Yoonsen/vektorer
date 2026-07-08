export interface CorpusConfig {
  from_year?: number;
  to_year?: number;
  author?: string;
  subject?: string;
  ddk?: string;
  lang?: string;
  limit?: number; // Kept for backwards compat, but we'll use explicit parameter
}

export interface BookMeta {
  dhlabid: number;
  urn: string;
  title: string;
  authors: string;
  year: number;
}

export async function fetchCorpus(config: CorpusConfig, limit: number = 100): Promise<BookMeta[]> {
  const body: any = {
    limit: limit,
    doctype: 'digibok',
  };

  if (config.from_year) body.from_year = config.from_year;
  if (config.to_year) body.to_year = config.to_year;
  if (config.author) body.author = config.author;
  if (config.subject) body.subject = config.subject;
  if (config.ddk) body.ddk = config.ddk + '*'; // Match alle underkategorier (FTS5)
  body.lang = config.lang || 'nob';

  const response = await fetch('https://api.nb.no/dhlab/build_corpus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    throw new Error(`Klarte ikke bygge korpus. Status: ${response.status}`);
  }

  const data = await response.json();
  
  // Data kommer tilbake i et kolonne-orientert Pandas-format (record)
  // { dhlabid: { "0": 100384761 }, urn: { "0": "URN:NBN:no-nb_digibok_..." } }
  if (!data || !data.dhlabid) {
    return [];
  }

  const keys = Object.keys(data.dhlabid);
  return keys.map(k => ({
    dhlabid: data.dhlabid[k],
    urn: data.urn[k],
    title: data.title ? data.title[k] : '',
    authors: data.authors ? data.authors[k] : '',
    year: data.year ? data.year[k] : 0
  }));
}

export type FrequencyRecord = [number, string, number, number]; 
// [dhlabid, ord, frekvens, totale_ord_i_dokumentet]

export async function fetchFrequencies(urns: string[], words: string[]): Promise<FrequencyRecord[]> {
  if (urns.length === 0) return [];

  const response = await fetch('https://api.nb.no/dhlab/frequencies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      urns: urns,
      words: words,
      cutoff: 0
    })
  });

  if (!response.ok) {
    throw new Error(`Klarte ikke hente frekvenser. Status: ${response.status}`);
  }

  const data = await response.json();
  return data as FrequencyRecord[];
}

export async function fetchCollocations(urns: string[], word: string): Promise<Record<string, number>> {
  if (urns.length === 0) return {};

  const response = await fetch('https://api.nb.no/dhlab/urncolldist_urn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      urn: urns,
      word: word,
      before: 10,
      after: 10,
      samplesize: 500000
    })
  });

  if (!response.ok) {
    throw new Error(`Klarte ikke hente kollokasjoner for ${word}. Status: ${response.status}`);
  }

  const text = await response.text();
  try {
    // API returns a JSON string containing another JSON string representing the Pandas DataFrame
    const parsed1 = JSON.parse(text);
    const parsed2 = typeof parsed1 === 'string' ? JSON.parse(parsed1) : parsed1;
    
    // We want the 'counts' column which maps words to their collocation frequency
    return parsed2.counts || {};
  } catch (e) {
    console.error(`Feil ved parsing av kollokasjonsdata for ${word}`, e);
    return {};
  }
}

export async function fetchTotals(limit: number = 200000): Promise<Record<string, number>> {
  const response = await fetch(`https://api.nb.no/dhlab/totals/${limit}`);
  if (!response.ok) {
    throw new Error(`Klarte ikke hente totals. Status: ${response.status}`);
  }
  
  const data = await response.json();
  const totals: Record<string, number> = {};
  
  // Format is [["word", count], ["word", count]]
  if (Array.isArray(data)) {
    data.forEach(([word, count]) => {
      totals[word] = count;
    });
  }
  
  return totals;
}
