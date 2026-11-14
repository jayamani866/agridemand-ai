
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  RefreshCw,
  Package,
  TrendingUp,
  Sprout,
  Search,
  MapPin,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { getLots } from '../../services/api';
import './MarketIntelligence.css';

const formatQuantity = (value) =>
  `${Number(value || 0).toLocaleString('en-IN')} kg`;

const formatCrop = (value) =>
  String(value || 'Unknown').replace(/\b\w/g, (c) => c.toUpperCase());

function MarketIntelligence() {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getLots();

      if (!Array.isArray(data)) {
        throw new Error('Invalid inventory response.');
      }

      setLots(data);
    } catch (err) {
      setError(err.message || 'Unable to load inventory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    getLots()
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error('Invalid inventory response.');
        }
        if (!cancelled) setLots(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Unable to load inventory data.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const cropInsights = useMemo(() => {
    const grouped = new Map();

    lots.forEach((lot) => {
      const crop = String(lot.crop || 'Unknown').toLowerCase();

      if (!grouped.has(crop)) {
        grouped.set(crop, {
          crop,
          lotCount: 0,
          totalStock: 0,
          availableStock: 0,
          locations: new Set(),
          prices: [],
        });
      }

      const item = grouped.get(crop);

      item.lotCount += 1;
      item.totalStock += Number(lot.quantity_kg || 0);
      item.availableStock += Number(lot.available_kg || 0);

      if (lot.location) item.locations.add(lot.location);

      if (lot.price_per_kg !== null && lot.price_per_kg !== undefined) {
        const price = Number(lot.price_per_kg);
        if (Number.isFinite(price)) item.prices.push(price);
      }
    });

    return [...grouped.values()].map((item) => ({
      ...item,
      averagePrice: item.prices.length
        ? item.prices.reduce((sum, price) => sum + price, 0) /
          item.prices.length
        : null,
      locations: [...item.locations],
    })).sort((a, b) => b.availableStock - a.availableStock);
  }, [lots]);

  const filteredCrops = cropInsights.filter((item) =>
    item.crop.includes(search.trim().toLowerCase())
  );

  const totalAvailable = lots.reduce(
    (sum, lot) => sum + Number(lot.available_kg || 0),
    0
  );

  const totalValue = lots.reduce(
    (sum, lot) =>
      sum +
      Number(lot.available_kg || 0) *
      Number(lot.price_per_kg || 0),
    0
  );

  const cropCount = cropInsights.length;

  return (
    <main className="market-page">
      <header className="market-header">
        <div>
          <div className="market-eyebrow">
            <span className="market-live-dot" />
            AGRICULTURAL ANALYTICS
          </div>

          <h1>
            Market <span>Intelligence.</span>
          </h1>

          <p>
            Understand crop availability, inventory distribution and
            indicative listing values.
          </p>
        </div>

        <button
          className="market-refresh"
          type="button"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'market-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh data'}
        </button>
      </header>

      <section className="market-notice">
        <Activity size={18} />
        <p>
          Inventory-based insights. Prices shown are farmer listing prices,
          not verified market or mandi rates.
        </p>
      </section>

      <section className="market-metrics">
        <article className="market-metric">
          <div className="market-metric-top">
            <span>Crop categories</span>
            <Sprout size={20} />
          </div>
          <strong>{cropCount}</strong>
          <small>Distinct crops listed</small>
        </article>

        <article className="market-metric">
          <div className="market-metric-top">
            <span>Available supply</span>
            <Package size={20} />
          </div>
          <strong>{formatQuantity(totalAvailable)}</strong>
          <small>Current available inventory</small>
        </article>

        <article className="market-metric">
          <div className="market-metric-top">
            <span>Inventory lots</span>
            <BarChart3 size={20} />
          </div>
          <strong>{lots.length}</strong>
          <small>Registered produce lots</small>
        </article>

        <article className="market-metric">
          <div className="market-metric-top">
            <span>Indicative stock value</span>
            <TrendingUp size={20} />
          </div>
          <strong>
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0,
            }).format(totalValue)}
          </strong>
          <small>Available stock × listing price</small>
        </article>
      </section>

      <section className="market-workspace">
        <div className="market-section-heading">
          <div>
            <h2>Crop market overview</h2>
            <p>Supply and listing-price information by crop.</p>
          </div>
          <span>{filteredCrops.length} crops</span>
        </div>

        <div className="market-search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Search crop..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading && (
          <div className="market-message">
            <RefreshCw size={22} className="market-spin" />
            <p>Loading inventory insights...</p>
          </div>
        )}

        {!loading && error && (
          <div className="market-message market-error" role="alert">
            <AlertCircle size={23} />
            <p>{error}</p>
            <button type="button" onClick={loadData}>Try again</button>
          </div>
        )}

        {!loading && !error && filteredCrops.length === 0 && (
          <div className="market-message">
            <Package size={25} />
            <p>No crop inventory found.</p>
          </div>
        )}

        {!loading && !error && filteredCrops.length > 0 && (
          <div className="market-crop-grid">
            {filteredCrops.map((crop) => (
              <article className="market-crop-card" key={crop.crop}>
                <div className="market-crop-top">
                  <div className="market-crop-icon">
                    <Sprout size={22} />
                  </div>
                  <span>{crop.lotCount} lots</span>
                </div>

                <h3>{formatCrop(crop.crop)}</h3>

                <div className="market-stock-row">
                  <span>Available supply</span>
                  <strong>{formatQuantity(crop.availableStock)}</strong>
                </div>

                <div className="market-stock-track">
                  <span
                    style={{
                      width: `${
                        crop.totalStock > 0
                          ? Math.min(
                              100,
                              (crop.availableStock / crop.totalStock) * 100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <div className="market-crop-details">
                  <div>
                    <span>Total listed</span>
                    <strong>{formatQuantity(crop.totalStock)}</strong>
                  </div>
                  <div>
                    <span>Average listing price</span>
                    <strong>
                      {crop.averagePrice === null
                        ? 'Not available'
                        : `₹${crop.averagePrice.toFixed(2)}/kg`}
                    </strong>
                  </div>
                </div>

                <div className="market-location">
                  <MapPin size={14} />
                  {crop.locations.length
                    ? crop.locations.join(', ')
                    : 'Location unavailable'}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="market-footer">
        <span>
          <span className="market-live-dot" />
          Live backend inventory
        </span>
        <span>AgriDemand AI Analytics</span>
      </footer>
    </main>
  );
}

export default MarketIntelligence;
