import fs from 'fs';
import path from 'path';

// Path to the log file (update as needed)
const LOG_PATH = process.argv[2] || path.resolve(process.cwd(), 'src/logs/postgres_logs_14jul25.json');
const SPEND_QUERIES_PATH = path.resolve(process.cwd(), 'src/logs/unique_spend_queries.json');
const SEARCH_QUERIES_PATH = path.resolve(process.cwd(), 'src/logs/unique_search_queries.json');

function parseLogFile(logPath: string) {
  const raw = fs.readFileSync(logPath, 'utf-8');
  let entries: any[];
  try {
    entries = JSON.parse(raw);
  } catch {
    // Try to parse as NDJSON
    entries = raw.split('\n').filter(Boolean).map(line => JSON.parse(line));
  }
  return entries;
}

function extractApiQueries(entries: any[]) {
  const spendQueries = new Set<string>();
  const searchQueries = new Set<string>();

  for (const entry of entries) {
    if (!entry.requestPath) continue;
    if (entry.requestPath.includes('/api/spend')) {
      if (entry.requestQueryString) {
        spendQueries.add(entry.requestQueryString);
      }
    }
    if (entry.requestPath.includes('/api/search')) {
      if (entry.requestQueryString) {
        searchQueries.add(entry.requestQueryString);
      }
    }
  }

  return { spendQueries: Array.from(spendQueries), searchQueries: Array.from(searchQueries) };
}

function main() {
  const entries = parseLogFile(LOG_PATH);
  const { spendQueries, searchQueries } = extractApiQueries(entries);
  fs.writeFileSync(SPEND_QUERIES_PATH, JSON.stringify(spendQueries, null, 2));
  fs.writeFileSync(SEARCH_QUERIES_PATH, JSON.stringify(searchQueries, null, 2));
  console.log(`Wrote ${spendQueries.length} unique spend queries to ${SPEND_QUERIES_PATH}`);
  console.log(`Wrote ${searchQueries.length} unique search queries to ${SEARCH_QUERIES_PATH}`);
}

main(); 