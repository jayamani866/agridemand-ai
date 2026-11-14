
import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  MapPin,
  Phone,
  Package,
  Sprout,
  AlertCircle,
  UserRound,
  TrendingUp,
} from 'lucide-react';
import { getFarmers, getLots } from '../../services/api';
import './Farmers.css';

const quantity = (value) =>
  `${Number(value || 0).toLocaleString('en-IN')} kg`;

function Farmers() {
  const [farmers, setFarmers] = useState([]);
  const [lots, setLots] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFarmers = async () => {
    setLoading(true);
    setError('');

    try {
      const [farmerData, lotData] = await Promise.all([
        getFarmers(),
        getLots(),
      ]);

      if (!Array.isArray(farmerData) || !Array.isArray(lotData)) {
        throw new Error('Invalid response received from server.');
      }

      setFarmers(farmerData);
      setLots(lotData);
    } catch (err) {
      setError(err.message || 'Unable to load farmer data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all([getFarmers(), getLots()])
      .then(([farmerData, lotData]) => {
        if (!cancelled) {
          setFarmers(farmerData);
          setLots(lotData);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Unable to load farmer data.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const farmerStats = useMemo(() => {
    return farmers.map((farmer) => {
      const farmerLots = lots.filter(
        (lot) => Number(lot.farmer_id) === Number(farmer.id)
      );

      const availableStock = farmerLots.reduce(
        (total, lot) => total + Number(lot.available_kg || 0),
        0
      );

      return {
        ...farmer,
        lotCount: farmerLots.length,
        availableStock,
      };
    });
  }, [farmers, lots]);

  const filteredFarmers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return farmerStats;

    return farmerStats.filter((farmer) =>
      [
        farmer.name,
        farmer.phone,
        farmer.location,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [farmerStats, search]);

  const totalStock = farmerStats.reduce(
    (sum, farmer) => sum + farmer.availableStock,
    0
  );

  const totalLots = lots.length;

  return (
    <main className="farmers-page">
      <header className="farmers-header">
        <div>
          <div className="farmers-eyebrow">
            <span className="farmers-live-dot" />
            FARMER MANAGEMENT
          </div>

          <h1>
            Farmers <span>Network.</span>
          </h1>

          <p>
            Monitor registered farmers, their locations and available produce.
          </p>
        </div>

        <button
          type="button"
          className="farmers-refresh"
          onClick={loadFarmers}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? 'farmers-spin' : ''}
          />
          {loading ? 'Refreshing...' : 'Refresh data'}
        </button>
      </header>

      <section className="farmers-metrics">
        <article className="farmers-metric">
          <div className="farmers-metric-top">
            <span>Total farmers</span>
            <span className="farmers-icon green">
              <Users size={20} />
            </span>
          </div>
          <strong>{farmers.length}</strong>
          <small>Registered farmer records</small>
        </article>

        <article className="farmers-metric">
          <div className="farmers-metric-top">
            <span>Produce lots</span>
            <span className="farmers-icon blue">
              <Package size={20} />
            </span>
          </div>
          <strong>{totalLots}</strong>
          <small>Recorded inventory lots</small>
        </article>

        <article className="farmers-metric">
          <div className="farmers-metric-top">
            <span>Available stock</span>
            <span className="farmers-icon gold">
              <Sprout size={20} />
            </span>
          </div>
          <strong>{quantity(totalStock)}</strong>
          <small>Across registered farmers</small>
        </article>

        <article className="farmers-metric">
          <div className="farmers-metric-top">
            <span>Average lots</span>
            <span className="farmers-icon purple">
              <TrendingUp size={20} />
            </span>
          </div>
          <strong>
            {farmers.length
              ? (totalLots / farmers.length).toFixed(1)
              : '0'}
          </strong>
          <small>Lots per farmer</small>
        </article>
      </section>

      <section className="farmers-workspace">
        <div className="farmers-toolbar">
          <div>
            <h2>Registered farmers</h2>
            <p>Explore farmer profiles and inventory contributions.</p>
          </div>
          <span className="farmers-count">
            {filteredFarmers.length} farmers
          </span>
        </div>

        <div className="farmers-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search name, phone or location..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading && (
          <div className="farmers-message">
            <RefreshCw size={22} className="farmers-spin" />
            <p>Loading farmer records...</p>
          </div>
        )}

        {!loading && error && (
          <div className="farmers-message farmers-error" role="alert">
            <AlertCircle size={24} />
            <p>{error}</p>
            <button type="button" onClick={loadFarmers}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filteredFarmers.length === 0 && (
          <div className="farmers-empty">
            <Users size={30} />
            <h3>
              {farmers.length ? 'No matching farmers' : 'No farmers found'}
            </h3>
            <p>
              {farmers.length
                ? 'Try another search term.'
                : 'Registered farmer records will appear here.'}
            </p>
          </div>
        )}

        {!loading && !error && filteredFarmers.length > 0 && (
          <div className="farmers-grid">
            {filteredFarmers.map((farmer) => (
              <article className="farmer-card" key={farmer.id}>
                <div className="farmer-card-top">
                  <div className="farmer-avatar">
                    <UserRound size={24} />
                  </div>
                  <span className="farmer-id">
                    FARMER #{String(farmer.id).padStart(4, '0')}
                  </span>
                </div>

                <h3>{farmer.name}</h3>

                <div className="farmer-info">
                  <span>
                    <Phone size={15} />
                    {farmer.phone || 'Phone unavailable'}
                  </span>
                  <span>
                    <MapPin size={15} />
                    {farmer.location || 'Location unavailable'}
                  </span>
                </div>

                <div className="farmer-card-stats">
                  <div>
                    <span>Produce lots</span>
                    <strong>{farmer.lotCount}</strong>
                  </div>
                  <div>
                    <span>Available stock</span>
                    <strong>{quantity(farmer.availableStock)}</strong>
                  </div>
                </div>

                <div className="farmer-card-footer">
                  <span>
                    <span className="farmers-live-dot" />
                    Backend record
                  </span>
                  <span>#{farmer.id}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Farmers;
