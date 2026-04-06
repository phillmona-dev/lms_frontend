import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';

const PROVIDERS = [
  { value: 'ALL', label: 'Google + YouTube' },
  { value: 'GOOGLE', label: 'Google only' },
  { value: 'YOUTUBE', label: 'YouTube only' }
];

export default function EducationSearch() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialProvider = (searchParams.get('provider') || 'ALL').toUpperCase();
  const initialLimit = Number(searchParams.get('limit') || 8);

  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('ALL');
  const [limit, setLimit] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const autoSearched = useRef(false);

  const hasResults = useMemo(() => Array.isArray(data?.results) && data.results.length > 0, [data]);

  const performSearch = async ({ q, source, resultLimit }) => {
    setError('');

    if (!q.trim()) {
      setError('Please enter a topic, for example: algebra, biology, or world history.');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get('/api/search/education', {
        params: {
          q: q.trim(),
          provider: source,
          limit: resultLimit
        }
      });
      setData(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await performSearch({ q: query, source: provider, resultLimit: limit });
  };

  useEffect(() => {
    setQuery(initialQuery);
    setProvider(PROVIDERS.some((p) => p.value === initialProvider) ? initialProvider : 'ALL');
    setLimit(Number.isFinite(initialLimit) ? Math.min(Math.max(initialLimit, 1), 20) : 8);
  }, [initialQuery, initialProvider, initialLimit]);

  useEffect(() => {
    if (!initialQuery || autoSearched.current) {
      return;
    }
    autoSearched.current = true;
    const source = PROVIDERS.some((p) => p.value === initialProvider) ? initialProvider : 'ALL';
    const resultLimit = Number.isFinite(initialLimit) ? Math.min(Math.max(initialLimit, 1), 20) : 8;
    performSearch({ q: initialQuery, source, resultLimit });
  }, [initialQuery, initialProvider, initialLimit]);

  return (
    <div className="edu-search-page">
      <div className="edu-search-hero">
        <div>
          <p className="edu-search-kicker">Global Learning Discovery</p>
          <h1>Educational Search</h1>
          <p>
            Find learning-focused resources from Google and YouTube with education filters.
            Built for students and teachers who want high-signal content quickly.
          </p>
        </div>
        <Link to="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
      </div>

      <form className="edu-search-form glass-panel" onSubmit={handleSearch}>
        <div className="edu-search-form-grid">
          <div>
            <label htmlFor="edu-query">Topic</label>
            <input
              id="edu-query"
              className="input"
              placeholder="e.g. linear equations, climate science, software design"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="edu-provider">Source</label>
            <select
              id="edu-provider"
              className="input"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edu-limit">Results</label>
            <input
              id="edu-limit"
              type="number"
              min="1"
              max="20"
              className="input"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value || 8))}
            />
          </div>
        </div>

        <div className="edu-search-actions">
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Search Educational Content'}
          </button>
          {data?.googleSearchUrl && (
            <a className="btn btn-secondary" href={data.googleSearchUrl} target="_blank" rel="noreferrer">
              Open Google
            </a>
          )}
          {data?.youtubeSearchUrl && (
            <a className="btn btn-secondary" href={data.youtubeSearchUrl} target="_blank" rel="noreferrer">
              Open YouTube
            </a>
          )}
        </div>
      </form>

      {error && <div className="edu-search-error">{error}</div>}

      {data && (
        <div className="edu-search-meta glass-panel">
          <div>
            <strong>Applied educational query:</strong> {data.educationalQuery}
          </div>
          {!data.apiBacked && (
            <div className="edu-search-note">
              API keys are not configured, so links are generated with educational filters.
            </div>
          )}
        </div>
      )}

      {hasResults && (
        <div className="edu-search-results">
          {data.results.map((item, index) => (
            <article key={`${item.url}-${index}`} className="edu-search-card interactive-glass-panel">
              <div className="edu-search-card-top">
                <span className={`edu-source-badge source-${(item.source || '').toLowerCase()}`}>
                  {item.source || 'SOURCE'}
                </span>
                {item.publishedAt && <span className="edu-date">{new Date(item.publishedAt).toLocaleDateString()}</span>}
              </div>
              <h3>{item.title}</h3>
              <p>{item.snippet}</p>
              <a href={item.url} target="_blank" rel="noreferrer">Open resource</a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
