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
