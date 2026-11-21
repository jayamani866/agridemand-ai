import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BrainCircuit,
  RefreshCw,
  Package,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Search,
  ArrowUpRight,
  Boxes,
  IndianRupee,
  Activity,
  Clock3,
  Leaf,
  ChevronDown,
} from 'lucide-react';

import { getBuyerRequests } from '../../services/api';
import { getMatchingResults } from '../../shared/services/matchingApi';
import './AIMatching.css';

const formatNumber = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  });

const formatPrice = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

function MetricCard({ label, value, helper, icon: Icon, variant = '' }) {
  return (
    <article className={`aim-metric-card ${variant}`}>
      <div className="aim-metric-top">
        <span>{label}</span>
        <div className="aim-metric-icon"><Icon size={19} /></div>
      </div>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

function EmptyState({ title, description, icon: Icon = Package }) {
  return (
    <div className="aim-empty">
      <div className="aim-empty-icon"><Icon size={25} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export default function AIMatching() {
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [matching, setMatching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [lastCalculated, setLastCalculated] = useState(null);

  
  
  const loadRequests = useCallback(async () => {
    try {
      const data = await getBuyerRequests();
      const safeRequests = Array.isArray(data) ? data : [];

      setRequests(safeRequests);

      setSelectedRequestId((previous) => {
        if (safeRequests.some((item) => String(item.id) === String(previous))) {
          return previous;
        }

        return safeRequests.length ? String(safeRequests[0].id) : '';
      });
    } catch (err) {
      setError(err.message || 'Unable to load buyer requests.');
      setRequests([]);
      setSelectedRequestId('');
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    getBuyerRequests()
      .then((data) => {
        if (!active) return;

        const safeRequests = Array.isArray(data) ? data : [];

        setRequests(safeRequests);

        setSelectedRequestId((previous) => {
          if (safeRequests.some((item) => String(item.id) === String(previous))) {
            return previous;
          }

          return safeRequests.length ? String(safeRequests[0].id) : '';
        });
      })
      .catch((err) => {
        if (!active) return;

        setError(err.message || 'Unable to load buyer requests.');
        setRequests([]);
        setSelectedRequestId('');
      })
      .finally(() => {
        if (active) {
          setLoadingRequests(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);



  
  useEffect(() => {
    let active = true;

    getBuyerRequests()
      .then((data) => {
        if (!active) return;

        const safeRequests = Array.isArray(data) ? data : [];

        setRequests(safeRequests);

        setSelectedRequestId((previous) => {
          if (safeRequests.some((item) => String(item.id) === String(previous))) {
            return previous;
          }

          return safeRequests.length ? String(safeRequests[0].id) : '';
        });
      })
      .catch((err) => {
        if (!active) return;

        setError(err.message || 'Unable to load buyer requests.');
        setRequests([]);
        setSelectedRequestId('');
      })
      .finally(() => {
        if (active) {
          setLoadingRequests(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);



  const handleRefresh = () => {
    setLoadingRequests(true);
    setError('');
    setResult(null);
    setLastCalculated(null);
    loadRequests();
  };


  const selectedRequest = useMemo(
    () => requests.find(
      (item) => String(item.id) === String(selectedRequestId)
    ) || null,
    [requests, selectedRequestId]
  );

  const totalDemand = useMemo(
    () => requests.reduce(
      (sum, item) => sum + Number(item.quantity_kg || 0),
      0
    ),
    [requests]
  );

  const filteredRequests = useMemo(
    () => requests.filter((item) =>
      `${item.id} ${item.crop} ${item.buyer_name} ${item.delivery_location}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ),
    [requests, search]
  );

  const matchPercentage = result && Number(result.requested_kg) > 0
    ? Math.min(
        100,
        (Number(result.matched_kg) / Number(result.requested_kg)) * 100
      )
    : 0;

  const allocationCount = Array.isArray(result?.allocations)
    ? result.allocations.length
    : 0;

  const runMatching = async () => {
    if (!selectedRequest) {
      setError('Please select a buyer request first.');
      return;
    }

    setMatching(true);
    setError('');
    setResult(null);
    setLastCalculated(null);

    try {
      const data = await getMatchingResults(selectedRequest.id);
      setResult(data);
      setLastCalculated(new Date());
    } catch (err) {
      setError(err.message || 'Unable to calculate matching results.');
    } finally {
      setMatching(false);
    }
  };

  const selectRequest = (id) => {
    setSelectedRequestId(id);
    setResult(null);
    setLastCalculated(null);
    setError('');
  };

  return (
    <section className="ai-matching-page">

      {/* PAGE HEADER */}
      <header className="aim-header">
        <div>
          <div className="aim-eyebrow">
            <BrainCircuit size={15} />
            INTELLIGENT SUPPLY MATCHING
          </div>
          <h1>AI <span>Matching</span></h1>
          <p>
            Connect bulk buyer requirements with available farmer inventory
            through transparent, lot-wise supply allocation.
          </p>
        </div>

        <button
          className="aim-refresh"
          onClick={handleRefresh}
          disabled={loadingRequests || matching}
        >
          <RefreshCw
            size={15}
            className={loadingRequests ? 'aim-spin' : ''}
          />
          Refresh data
        </button>
      </header>

      {/* OVERVIEW METRICS */}
      <div className="aim-overview-grid">
        <MetricCard
          label="Buyer requests"
          value={requests.length}
          helper="Requests available on platform"
          icon={Package}
        />
        <MetricCard
          label="Total demand"
          value={`${formatNumber(totalDemand)} kg`}
          helper="Combined requested quantity"
          icon={Boxes}
          variant="aim-card-green"
        />
        <MetricCard
          label="Selected request"
          value={selectedRequest ? `#${selectedRequest.id}` : '—'}
          helper={selectedRequest ? selectedRequest.crop : 'No request selected'}
          icon={Activity}
          variant="aim-card-blue"
        />
      </div>

      {/* REQUEST SELECTOR */}
      <section className="aim-request-panel">
        <div className="aim-panel-title">
          <div className="aim-panel-icon"><Package size={19} /></div>
          <div>
            <h2>Buyer demand selection</h2>
            <p>Select a procurement requirement to find eligible supply.</p>
          </div>
        </div>

        {loadingRequests ? (
          <div className="aim-loading-state">
            <span className="aim-loader" />
            <span>Loading buyer requests...</span>
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No buyer requests available"
            description="Create a buyer procurement request first. It will appear here automatically."
          />
        ) : (
          <>
            <div className="aim-select-layout">
              <div className="aim-request-search">
                <label htmlFor="aim-search">Find a buyer request</label>
                <div className="aim-input-wrap">
                  <Search size={16} />
                  <input
                    id="aim-search"
                    placeholder="Search crop, buyer or destination..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>

              <div className="aim-request-select-wrap">
                <label htmlFor="aim-request">Select request</label>
                <div className="aim-select-wrap">
                  <select
                    id="aim-request"
                    value={selectedRequestId}
                    onChange={(event) => selectRequest(event.target.value)}
                  >
                    {filteredRequests.length === 0 ? (
                      <option value="">No matching requests</option>
                    ) : (
                      filteredRequests.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          #{item.id} · {item.crop} · {item.buyer_name}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            {!selectedRequest ? (
              <div className="aim-no-selection">
                No matching buyer request. Try a different search.
              </div>
            ) : (
              <>
                <div className="aim-demand-summary">
                  <div className="aim-demand-item">
                    <span>BUYER</span>
                    <strong>{selectedRequest.buyer_name || 'Platform buyer'}</strong>
                  </div>
                  <div className="aim-demand-item">
                    <span>CROP</span>
                    <strong className="aim-crop-name">
                      <Leaf size={14} />
                      {selectedRequest.crop}
                    </strong>
                  </div>
                  <div className="aim-demand-item">
                    <span>REQUIRED QUANTITY</span>
                    <strong>{formatNumber(selectedRequest.quantity_kg)} kg</strong>
                  </div>
                  <div className="aim-demand-item">
                    <span>MAXIMUM PRICE</span>
                    <strong>{formatPrice(selectedRequest.max_price_per_kg)} / kg</strong>
                  </div>
                  <div className="aim-demand-item">
                    <span>QUALITY GRADE</span>
                    <strong>{selectedRequest.grade || 'Any grade'}</strong>
                  </div>
                  <div className="aim-demand-item">
                    <span>DELIVERY LOCATION</span>
                    <strong className="aim-location">
                      <MapPin size={14} />
                      {selectedRequest.delivery_location || 'Not specified'}
                    </strong>
                  </div>
                </div>

                <div className="aim-run-area">
                  <div>
                    <strong>Ready to analyse supply?</strong>
                    <p>The matching engine will check eligible farmer lots and calculate allocations.</p>
                  </div>
                  <button
                    className="aim-run-button"
                    onClick={runMatching}
                    disabled={matching}
                  >
                    {matching ? (
                      <>
                        <RefreshCw size={17} className="aim-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <BrainCircuit size={18} />
                        Run AI Matching
                        <ArrowUpRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </section>

      {/* ERROR */}
      {error && (
        <div className="aim-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss error">×</button>
        </div>
      )}

      {/* MATCHING LOADING */}
      {matching && (
        <div className="aim-processing">
          <div className="aim-processing-icon">
            <BrainCircuit size={24} />
          </div>
          <div>
            <strong>Analysing farmer supply</strong>
            <p>Checking crop, grade, quantity and maximum price constraints.</p>
          </div>
          <span className="aim-loader" />
        </div>
      )}

      {/* MATCHING RESULTS */}
      {result && (
        <section className="aim-results">

          <div className="aim-results-header">
            <div>
              <div className="aim-eyebrow">
                <Activity size={14} />
                MATCHING ANALYSIS
              </div>
              <h2>Supply allocation results</h2>
              <p>Buyer request #{selectedRequest?.id} · {selectedRequest?.crop}</p>
            </div>
            <span className={`aim-result-status ${result.fully_matched ? 'complete' : 'partial'}`}>
              {result.fully_matched ? (
                <><CheckCircle2 size={15} /> Fully matched</>
              ) : (
                <><AlertCircle size={15} /> Partial match</>
              )}
            </span>
          </div>

          {/* MATCH PROGRESS */}
          <div className="aim-match-progress-card">
            <div className="aim-progress-top">
              <div>
                <span>SUPPLY FULFILMENT</span>
                <strong>{matchPercentage.toFixed(1)}%</strong>
              </div>
              <span>{formatNumber(result.matched_kg)} of {formatNumber(result.requested_kg)} kg matched</span>
            </div>
            <div
              className="aim-progress-track"
              role="progressbar"
              aria-valuenow={matchPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Supply fulfilment percentage"
            >
              <div style={{ width: `${matchPercentage}%` }} />
            </div>
            <div className="aim-progress-bottom">
              <span><i className="aim-legend-matched" /> Matched supply</span>
              <span><i className="aim-legend-shortfall" /> Unfulfilled demand</span>
            </div>
          </div>

          {/* RESULT METRICS */}
          <div className="aim-result-metrics">
            <MetricCard
              label="Requested quantity"
              value={`${formatNumber(result.requested_kg)} kg`}
              helper="Buyer requirement"
              icon={Package}
            />
            <MetricCard
              label="Matched quantity"
              value={`${formatNumber(result.matched_kg)} kg`}
              helper="Eligible farmer supply"
              icon={CheckCircle2}
              variant="aim-card-green"
            />
            <MetricCard
              label="Supply shortfall"
              value={`${formatNumber(result.shortfall_kg)} kg`}
              helper={Number(result.shortfall_kg) > 0 ? 'Additional supply needed' : 'Demand covered'}
              icon={AlertCircle}
              variant={Number(result.shortfall_kg) > 0 ? 'aim-card-orange' : 'aim-card-green'}
            />
            <MetricCard
              label="Estimated procurement cost"
              value={formatPrice(result.total_estimated_cost)}
              helper="Based on allocated lot prices"
              icon={IndianRupee}
              variant="aim-card-blue"
            />
          </div>

          {/* ALLOCATIONS */}
          <section className="aim-allocation-card">
            <div className="aim-allocation-heading">
              <div>
                <h3>Farmer-wise supply allocation</h3>
                <p>Transparent breakdown of eligible farmer lots.</p>
              </div>
              <div className="aim-allocation-count">
                <Boxes size={15} />
                {allocationCount} {allocationCount === 1 ? 'lot' : 'lots'}
              </div>
            </div>

            {allocationCount > 0 ? (
              <>
                <div className="aim-table-wrap">
                  <table className="aim-table">
                    <thead>
                      <tr>
                        <th>FARMER / LOT</th>
                        <th>LOCATION</th>
                        <th>ALLOCATED QUANTITY</th>
                        <th>PRICE / KG</th>
                        <th>SUBTOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.allocations.map((allocation) => (
                        <tr key={allocation.lot_id}>
                          <td>
                            <div className="aim-farmer-cell">
                              <div className="aim-farmer-avatar">
                                {(allocation.farmer_name || 'F').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <strong>{allocation.farmer_name || 'Farmer'}</strong>
                                <small>Lot #{allocation.lot_id}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="aim-table-location">
                              <MapPin size={12} />
                              {allocation.farmer_location || '—'}
                            </span>
                          </td>
                          <td className="aim-allocation-quantity">
                            {formatNumber(allocation.allocated_kg)} kg
                          </td>
                          <td>{formatPrice(allocation.price_per_kg)}</td>
                          <td className="aim-subtotal">
                            {formatPrice(allocation.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="aim-allocation-total">
                  <span>Total estimated procurement</span>
                  <strong>{formatPrice(result.total_estimated_cost)}</strong>
                </div>
              </>
            ) : (
              <EmptyState
                icon={Boxes}
                title="No eligible farmer supply"
                description="No inventory lots currently satisfy the selected request's matching conditions."
              />
            )}
          </section>

          {/* MATCHING ENGINE NOTE */}
          <div className={`aim-engine-note ${result.fully_matched ? 'success' : 'warning'}`}>
            {result.fully_matched ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <div>
              <strong>Matching engine analysis</strong>
              <p>{result.matching_note || 'Allocation calculated using available eligible inventory.'}</p>
            </div>
          </div>

          <div className="aim-result-disclaimer">
            <Clock3 size={14} />
            <span>
              {lastCalculated
                ? `Calculated at ${lastCalculated.toLocaleTimeString('en-IN')}. `
                : ''}
              This is an estimated allocation preview, not a confirmed order.
              Inventory must be revalidated when an order is created.
            </span>
          </div>
        </section>
      )}
    </section>
  );
}
