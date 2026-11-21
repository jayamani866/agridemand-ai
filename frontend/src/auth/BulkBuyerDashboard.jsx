
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sprout, LogOut, RefreshCw, Plus, Search, BrainCircuit,
  Package, MapPin, CheckCircle2, AlertCircle, Boxes,
  IndianRupee, Truck, Leaf, ArrowUpRight, Clock3,
  ChevronRight, ShoppingBasket, ClipboardList, RotateCw,
  CircleCheck, Timer, Warehouse, TrendingUp
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { getMatchingResults } from '../shared/services/matchingApi';
import './BulkBuyerDashboard.css';

const API = 'http://127.0.0.1:8002';
const CROPS = [
  'tomato', 'onion', 'coconut', 'banana',
  'turmeric', 'rice', 'groundnut'
];

const number = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2
  });

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const pretty = (value = '') =>
  String(value).charAt(0).toUpperCase() + String(value).slice(1);

export default function BulkBuyerDashboard() {
  const { user, logout } = useAuth();

  const [activePage, setActivePage] = useState('demands');
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [result, setResult] = useState(null);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [matching, setMatching] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    crop: 'tomato',
    quantity_kg: '',
    grade: 'A',
    max_price_per_kg: '',
    delivery_location: ''
  });

  const apiRequest = useCallback(async (path, options = {}) => {
    const token = localStorage.getItem('agridemand_access_token');

    if (!token) {
      throw new Error('Your session has expired. Please login again.');
    }

    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        typeof data.detail === 'string'
          ? data.detail
          : `Request failed (${response.status})`
      );
    }

    return data;
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest('/api/requests');
      const ownRequests = Array.isArray(data) ? data : [];

      setRequests(ownRequests);

      setSelectedId((old) =>
        ownRequests.some((item) => String(item.id) === String(old))
          ? old
          : ownRequests.length
            ? String(ownRequests[0].id)
            : ''
      );
    } catch (err) {
      setError(err.message || 'Unable to load demands.');
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setError('');

    try {
      const data = await apiRequest('/api/orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load orders.');
    } finally {
      setOrdersLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (activePage === 'orders') {
      loadOrders();
    }
  }, [activePage, loadOrders]);

  const selectedRequest = useMemo(
    () => requests.find((item) => String(item.id) === String(selectedId)) || null,
    [requests, selectedId]
  );

  const totalDemand = requests.reduce(
    (sum, item) => sum + Number(item.quantity_kg || 0),
    0
  );

  const totalOrderValue = orders.reduce(
    (sum, item) => sum + Number(item.total_amount || 0),
    0
  );

  const matchPercent = result && Number(result.requested_kg) > 0
    ? Math.min(
        100,
        Number(result.matched_kg) / Number(result.requested_kg) * 100
      )
    : 0;

  const filteredRequests = requests.filter((item) =>
    `${item.crop} ${item.delivery_location} ${item.id}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  async function createDemand(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    setResult(null);

    try {
      const created = await apiRequest('/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          buyer_name: user?.full_name || 'Bulk Buyer',
          crop: form.crop.trim().toLowerCase(),
          quantity_kg: Number(form.quantity_kg),
          grade: form.grade,
          max_price_per_kg: Number(form.max_price_per_kg),
          delivery_location: form.delivery_location.trim()
        })
      });

      setForm({
        crop: 'tomato',
        quantity_kg: '',
        grade: 'A',
        max_price_per_kg: '',
        delivery_location: ''
      });

      await loadRequests();
      setSelectedId(String(created.id));
      setNotice(`Demand #${created.id} created successfully.`);
      setActivePage('matching');
    } catch (err) {
      setError(err.message || 'Could not create demand.');
    } finally {
      setSaving(false);
    }
  }

  async function runMatching() {
    if (!selectedRequest) {
      setError('Select a procurement demand first.');
      return;
    }

    setMatching(true);
    setError('');
    setNotice('');
    setResult(null);

    try {
      const data = await getMatchingResults(selectedRequest.id);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Matching failed.');
    } finally {
      setMatching(false);
    }
  }

  async function createProcurementOrder() {
    if (!selectedRequest || !result?.fully_matched) {
      setError('Only fully matched demands can be ordered.');
      return;
    }

    const alreadyOrdered = orders.some(
      (order) => Number(order.request_id) === Number(selectedRequest.id)
    );

    if (alreadyOrdered) {
      setError('An order already exists for this demand.');
      setActivePage('orders');
      return;
    }

    const confirmed = window.confirm(
      `Confirm procurement order for ${number(result.requested_kg)} kg of ${selectedRequest.crop} for ${money(result.total_estimated_cost)}?`
    );

    if (!confirmed) return;

    setCreatingOrder(true);
    setError('');
    setNotice('');

    try {
      const order = await apiRequest(
        `/api/requests/${selectedRequest.id}/orders?payment_method=${paymentMethod}`,
        { method: 'POST' }
      );

      setNotice(`Order #${order.id} created successfully. Payment is pending.`);
      await loadOrders();
      setActivePage('orders');
    } catch (err) {
      setError(err.message || 'Order creation failed.');
    } finally {
      setCreatingOrder(false);
    }
  }

  function selectRequest(id) {
    setSelectedId(String(id));
    setResult(null);
    setError('');
    setNotice('');
  }

  function navigate(page) {
    setActivePage(page);
    setError('');
    setNotice('');
  }

  const pageInfo = {
    demands: {
      eyebrow: 'PROCUREMENT MANAGEMENT',
      title: 'My demands',
      description: 'Create and manage your agricultural procurement requirements.'
    },
    matching: {
      eyebrow: 'INTELLIGENT SUPPLY ENGINE',
      title: 'AI supply matching',
      description: 'Analyse farmer inventory and build a consolidated supply allocation.'
    },
    orders: {
      eyebrow: 'PROCUREMENT OPERATIONS',
      title: 'Order tracking',
      description: 'Monitor confirmed procurement orders and farmer-wise allocations.'
    }
  }[activePage];

  return (
    <div className="bb-app">
      <aside className="bb-sidebar">
        <div className="bb-brand">
          <div className="bb-brand-icon"><Sprout size={25} /></div>
          <div>
            <strong>AgriDemand <span>AI</span></strong>
            <small>BULK BUYER PORTAL</small>
          </div>
        </div>

        <div className="bb-user">
          <div className="bb-avatar">
            {(user?.full_name || 'B').charAt(0).toUpperCase()}
          </div>
          <div className="bb-user-copy">
            <strong>{user?.full_name || 'Bulk Buyer'}</strong>
            <small>Buyer workspace</small>
          </div>
          <i />
        </div>

        <div className="bb-nav-label">PROCUREMENT</div>

        <button
          className={`bb-nav-item ${activePage === 'demands' ? 'active' : ''}`}
          onClick={() => navigate('demands')}
        >
          <Package size={18} /> My demands
          <ChevronRight size={15} />
        </button>

        <button
          className={`bb-nav-item ${activePage === 'matching' ? 'active' : ''}`}
          onClick={() => navigate('matching')}
        >
          <BrainCircuit size={18} /> AI supply matching
          <ChevronRight size={15} />
        </button>

        <button
          className={`bb-nav-item ${activePage === 'orders' ? 'active' : ''}`}
          onClick={() => navigate('orders')}
        >
          <Truck size={18} /> Order tracking
          <ChevronRight size={15} />
        </button>

        <div className="bb-sidebar-bottom">
          <div className="bb-sidebar-promo">
            <div className="bb-promo-icon"><Sprout size={21} /></div>
            <strong>Procure smarter.</strong>
            <p>Connect your demand with available farmer supply.</p>
            <span><i /> Live procurement workspace</span>
          </div>
          <button className="bb-logout" onClick={logout}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      <main className="bb-main">
        <header className="bb-topbar">
          <div className="bb-breadcrumb">
            <span>Workspace</span><b>/</b>
            <strong>{pageInfo.title}</strong>
          </div>
          <span className="bb-live"><i /> Live workspace</span>
        </header>

        <div className="bb-content">
          <section className="bb-heading">
            <div>
              <span className="bb-eyebrow">{pageInfo.eyebrow}</span>
              <h1>{pageInfo.title}</h1>
              <p>{pageInfo.description}</p>
            </div>

            <button
              className="bb-secondary-btn"
              onClick={activePage === 'orders' ? loadOrders : loadRequests}
              disabled={loading || ordersLoading}
            >
              <RefreshCw
                size={16}
                className={(loading || ordersLoading) ? 'bb-spin' : ''}
              />
              Refresh
            </button>
          </section>

          {error && (
            <div className="bb-alert error">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {notice && (
            <div className="bb-alert success">
              <CheckCircle2 size={18} /> {notice}
            </div>
          )}

          <section className="bb-stats">
            <article className="bb-stat">
              <div><span>My demands</span><Package size={18} /></div>
              <strong>{loading ? '—' : requests.length}</strong>
              <small>Procurement requirements</small>
            </article>

            <article className="bb-stat">
              <div><span>Total requested</span><Boxes size={18} /></div>
              <strong>{number(totalDemand)} kg</strong>
              <small>Across all demands</small>
            </article>

            <article className="bb-stat">
              <div><span>Procurement orders</span><Truck size={18} /></div>
              <strong>{orders.length}</strong>
              <small>{money(totalOrderValue)} total order value</small>
            </article>
          </section>

          {activePage === 'demands' && (
            <section className="bb-page-grid">
              <section className="bb-panel bb-form-panel">
                <div className="bb-panel-heading">
                  <div className="bb-panel-icon"><Plus size={20} /></div>
                  <div>
                    <h2>Create procurement demand</h2>
                    <p>Define what your business needs from farmers.</p>
                  </div>
                </div>

                <form onSubmit={createDemand} className="bb-form">
                  <label>Crop type</label>
                  <select
                    value={form.crop}
                    onChange={(e) => setForm({ ...form, crop: e.target.value })}
                  >
                    {CROPS.map((crop) => (
                      <option key={crop} value={crop}>{pretty(crop)}</option>
                    ))}
                  </select>

                  <label>Required quantity (kg)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="e.g. 2000"
                    value={form.quantity_kg}
                    onChange={(e) => setForm({ ...form, quantity_kg: e.target.value })}
                    required
                  />

                  <label>Quality grade</label>
                  <select
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  >
                    <option value="A">Grade A — Premium</option>
                    <option value="B">Grade B — Standard</option>
                    <option value="C">Grade C — Economy</option>
                    <option value="Any">Any grade</option>
                  </select>

                  <label>Maximum price (₹ / kg)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 28"
                    value={form.max_price_per_kg}
                    onChange={(e) => setForm({ ...form, max_price_per_kg: e.target.value })}
                    required
                  />

                  <label>Delivery location</label>
                  <div className="bb-location-input">
                    <MapPin size={17} />
                    <input
                      type="text"
                      minLength="2"
                      maxLength="120"
                      placeholder="e.g. Chennai, Tamil Nadu"
                      value={form.delivery_location}
                      onChange={(e) => setForm({ ...form, delivery_location: e.target.value })}
                      required
                    />
                  </div>

                  <button className="bb-primary-btn" disabled={saving}>
                    {saving
                      ? <><RefreshCw size={17} className="bb-spin" /> Creating demand...</>
                      : <><Plus size={17} /> Submit procurement demand</>}
                  </button>
                  <small className="bb-form-note">
                    Your demand will be checked against available farmer inventory.
                  </small>
                </form>
              </section>

              <section className="bb-panel bb-demand-panel">
                <div className="bb-panel-heading bb-demand-heading">
                  <div>
                    <h2>Your procurement requests</h2>
                    <p>{requests.length} demands linked to your account</p>
                  </div>
                  <div className="bb-count">{requests.length} total</div>
                </div>

                <div className="bb-search">
                  <Search size={17} />
                  <input
                    placeholder="Search crop, destination or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {loading ? (
                  <div className="bb-empty">
                    <RefreshCw className="bb-spin" size={24} />
                    Loading procurement demands...
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="bb-empty">
                    <ShoppingBasket size={32} />
                    <strong>No procurement demands found</strong>
                    <p>Create your first demand using the form.</p>
                  </div>
                ) : (
                  <div className="bb-request-list">
                    {filteredRequests.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={`bb-request-card ${String(item.id) === String(selectedId) ? 'selected' : ''}`}
                        onClick={() => selectRequest(item.id)}
                      >
                        <div className="bb-request-top">
                          <strong>{pretty(item.crop)}</strong>
                          <span>#{item.id}</span>
                        </div>
                        <div className="bb-request-meta">
                          <span><Boxes size={14} /> {number(item.quantity_kg)} kg</span>
                          <span><IndianRupee size={14} /> {number(item.max_price_per_kg)} / kg</span>
                          <span><MapPin size={14} /> {item.delivery_location}</span>
                        </div>
                        <small>Grade {item.grade || 'Any'} · Select to analyse supply</small>
                      </button>
                    ))}
                  </div>
                )}

                {selectedRequest && (
                  <div className="bb-selected-demand">
                    <div>
                      <span>SELECTED DEMAND</span>
                      <strong>{pretty(selectedRequest.crop)} · {number(selectedRequest.quantity_kg)} kg</strong>
                      <small>Maximum {money(selectedRequest.max_price_per_kg)} / kg</small>
                    </div>
                    <button onClick={() => navigate('matching')}>
                      Analyse supply <ArrowUpRight size={16} />
                    </button>
                  </div>
                )}
              </section>
            </section>
          )}

          {activePage === 'matching' && (
            <section className="bb-matching-page">
              <section className="bb-panel bb-matching-toolbar">
                <div>
                  <span className="bb-eyebrow">DEMAND SELECTION</span>
                  <h2>Select a procurement demand</h2>
                  <p>Choose one of your saved demands to analyse available supply.</p>
                </div>

                <select
                  value={selectedId}
                  onChange={(e) => selectRequest(e.target.value)}
                  disabled={!requests.length}
                >
                  {!requests.length && <option value="">No demands available</option>}
                  {requests.map((item) => (
                    <option key={item.id} value={item.id}>
                      #{item.id} · {pretty(item.crop)} · {number(item.quantity_kg)} kg
                    </option>
                  ))}
                </select>
              </section>

              {selectedRequest ? (
                <section className="bb-panel bb-demand-summary">
                  <div className="bb-summary-icon"><BrainCircuit size={24} /></div>
                  <div className="bb-summary-main">
                    <span className="bb-eyebrow">SELECTED PROCUREMENT</span>
                    <h2>{pretty(selectedRequest.crop)} · {number(selectedRequest.quantity_kg)} kg</h2>
                    <p>
                      Grade {selectedRequest.grade || 'Any'} · Delivery to {selectedRequest.delivery_location}
                    </p>
                  </div>
                  <div className="bb-summary-price">
                    <small>Maximum price</small>
                    <strong>{money(selectedRequest.max_price_per_kg)}<small> / kg</small></strong>
                  </div>
                  <button
                    className="bb-primary-btn bb-run-btn"
                    onClick={runMatching}
                    disabled={matching}
                  >
                    {matching
                      ? <><RefreshCw size={17} className="bb-spin" /> Analysing supply...</>
                      : <><BrainCircuit size={18} /> Run AI matching</>}
                  </button>
                </section>
              ) : (
                <div className="bb-empty bb-large-empty">
                  <Package size={34} />
                  <strong>Create a demand before matching</strong>
                  <p>Your saved procurement requirements will appear here.</p>
                  <button className="bb-primary-btn" onClick={() => navigate('demands')}>
                    Create demand <ArrowUpRight size={16} />
                  </button>
                </div>
              )}

              {result && selectedRequest && (
                <section className="bb-results">
                  <div className="bb-results-title">
                    <div>
                      <span className="bb-eyebrow">MATCHING ENGINE · DEMAND #{selectedRequest.id}</span>
                      <h2>Supply allocation analysis</h2>
                      <p>{pretty(selectedRequest.crop)} procurement · {selectedRequest.delivery_location}</p>
                    </div>
                    <span className={`bb-status ${result.fully_matched ? 'good' : result.matched_kg > 0 ? 'partial' : 'none'}`}>
                      {result.fully_matched ? 'Fully matched' : result.matched_kg > 0 ? 'Partial match' : 'No eligible stock'}
                    </span>
                  </div>

                  <div className="bb-progress">
                    <div>
                      <span>Supply fulfilment</span>
                      <strong>{matchPercent.toFixed(1)}%</strong>
                    </div>
                    <div className="bb-progress-track">
                      <span style={{ width: `${matchPercent}%` }} />
                    </div>
                  </div>

                  <div className="bb-result-stats">
                    <article><small>Requested</small><strong>{number(result.requested_kg)} kg</strong></article>
                    <article><small>Matched</small><strong>{number(result.matched_kg)} kg</strong></article>
                    <article><small>Shortfall</small><strong>{number(result.shortfall_kg)} kg</strong></article>
                    <article><small>Estimated cost</small><strong>{money(result.total_estimated_cost)}</strong></article>
                  </div>

                  <div className="bb-allocation">
                    <div className="bb-section-heading">
                      <div>
                        <h3>Farmer-wise allocation</h3>
                        <p>Inventory selected by price, crop, grade and availability.</p>
                      </div>
                      <span>{result.allocations?.length || 0} farmer lots</span>
                    </div>

                    {result.allocations?.length ? (
                      <div className="bb-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Farmer</th>
                              <th>Location</th>
                              <th>Quantity</th>
                              <th>Price / kg</th>
                              <th>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.allocations.map((item) => (
                              <tr key={item.lot_id}>
                                <td>
                                  <strong>{item.farmer_name || 'Farmer'}</strong>
                                  <small>Lot #{item.lot_id}</small>
                                </td>
                                <td>{item.farmer_location || '—'}</td>
                                <td>{number(item.allocated_kg)} kg</td>
                                <td>{money(item.price_per_kg)}</td>
                                <td><strong>{money(item.subtotal)}</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bb-empty">
                        <Warehouse size={30} />
                        <strong>No eligible farmer inventory</strong>
                        <p>Try adjusting the maximum price or quality grade.</p>
                      </div>
                    )}

                    <div className="bb-total">
                      <span>Total estimated procurement</span>
                      <strong>{money(result.total_estimated_cost)}</strong>
                    </div>
                  </div>

                  <div className="bb-order-action">
                    <div>
                      <CheckCircle2 size={21} />
                      <div>
                        <strong>
                          {result.fully_matched
                            ? 'Your demand is fully matched'
                            : 'More supply is required'}
                        </strong>
                        <small>
                          {result.fully_matched
                            ? 'Inventory will be revalidated when you create the order.'
                            : `Shortfall: ${number(result.shortfall_kg)} kg. Partial orders are disabled.`}
                        </small>
                      </div>
                    </div>
                    <div className="bb-payment-selection">
                      <label htmlFor="bulk-payment-method">Payment Method</label>
                      <select
                        id="bulk-payment-method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option value="cod">Cash on Delivery (COD)</option>
                      </select>
                    </div>

                    <button
                      className="bb-primary-btn"
                      disabled={!result.fully_matched || creatingOrder}
                      onClick={createProcurementOrder}
                    >
                      {creatingOrder
                        ? <><RefreshCw size={17} className="bb-spin" /> Creating order...</>
                        : <><ClipboardList size={17} /> Create procurement order</>}
                    </button>
                  </div>
                </section>
              )}

              {!result && selectedRequest && (
                <div className="bb-empty bb-large-empty">
                  <TrendingUp size={34} />
                  <strong>Ready to analyse farmer supply</strong>
                  <p>Run the matching engine to see available quantities, farmer allocations and estimated procurement cost.</p>
                </div>
              )}
            </section>
          )}

          {activePage === 'orders' && (
            <section className="bb-orders-page">
              <div className="bb-order-overview">
                <article>
                  <div className="bb-overview-icon"><ClipboardList size={20} /></div>
                  <small>Total orders</small>
                  <strong>{orders.length}</strong>
                </article>
                <article>
                  <div className="bb-overview-icon"><IndianRupee size={20} /></div>
                  <small>Total order value</small>
                  <strong>{money(totalOrderValue)}</strong>
                </article>
                <article>
                  <div className="bb-overview-icon"><Timer size={20} /></div>
                  <small>Pending payment</small>
                  <strong>{orders.filter((o) => o.status === 'pending_payment').length}</strong>
                </article>
              </div>

              <section className="bb-panel bb-orders-panel">
                <div className="bb-panel-heading bb-demand-heading">
                  <div>
                    <span className="bb-eyebrow">ORDER MANAGEMENT</span>
                    <h2>Your procurement orders</h2>
                    <p>Confirmed inventory reservations and order status.</p>
                  </div>
                  <button
                    className="bb-secondary-btn"
                    onClick={loadOrders}
                    disabled={ordersLoading}
                  >
                    <RotateCw size={16} className={ordersLoading ? 'bb-spin' : ''} />
                    Refresh orders
                  </button>
                </div>

                {ordersLoading ? (
                  <div className="bb-empty">
                    <RefreshCw size={24} className="bb-spin" />
                    Loading your orders...
                  </div>
                ) : orders.length === 0 ? (
                  <div className="bb-empty bb-large-empty">
                    <Truck size={36} />
                    <strong>No procurement orders yet</strong>
                    <p>Complete AI matching and create your first fully matched order.</p>
                    <button className="bb-primary-btn" onClick={() => navigate('matching')}>
                      Go to AI matching <ArrowUpRight size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="bb-order-list">
                    {orders.map((order) => (
                      <article className="bb-order-card" key={order.id}>
                        <div className="bb-order-card-top">
                          <div className="bb-order-id">
                            <div className="bb-order-icon"><Package size={20} /></div>
                            <div>
                              <span>PROCUREMENT ORDER</span>
                              <strong>#{order.id}</strong>
                            </div>
                          </div>
                          <span className={`bb-status ${order.status === 'paid' ? 'good' : 'partial'}`}>
                            {pretty(String(order.status || 'pending').replaceAll('_', ' '))}
                          </span>
                        </div>

                        <div className="bb-order-details">
                          <div>
                            <small>Crop</small>
                            <strong>{pretty(order.crop || 'Produce')}</strong>
                          </div>
                          <div>
                            <small>Quantity</small>
                            <strong>{number(order.requested_quantity_kg)} kg</strong>
                          </div>
                          <div>
                            <small>Delivery location</small>
                            <strong><MapPin size={14} /> {order.delivery_location || '—'}</strong>
                          </div>
                          <div>
                            <small>Order value</small>
                            <strong>{money(order.total_amount)}</strong>
                          </div>
                        </div>
                        <div className="bb-payment-note">
                          Payment Method: {pretty(order.payment_method || 'Not selected')}
                          <br />
                          Payment Status: {pretty(order.payment_status || 'Pending')}
                        </div>

                        <div className="bb-order-farmers">
                          <div className="bb-section-heading">
                            <div>
                              <h3>Farmer allocations</h3>
                              <p>Supply reserved for this order</p>
                            </div>
                            <span>{order.items?.length || 0} lots</span>
                          </div>

                          {order.items?.length ? order.items.map((item) => (
                            <div className="bb-order-farmer" key={item.id}>
                              <div className="bb-farmer-avatar"><Sprout size={17} /></div>
                              <div className="bb-farmer-copy">
                                <strong>{item.farmer_name || `Farmer #${item.farmer_id}`}</strong>
                                <small>{item.farmer_location || 'Location unavailable'} · Lot #{item.lot_id}</small>
                              </div>
                              <div className="bb-farmer-quantity">
                                <strong>{number(item.quantity_kg)} kg</strong>
                                <small>{money(item.price_per_kg)} / kg</small>
                              </div>
                              <strong className="bb-farmer-subtotal">{money(item.subtotal)}</strong>
                              <div className="bb-item-tracking">
                                {(() => {
                                  const steps = [
                                    { status: 'pending', title: 'Order placed', description: 'Your procurement order has been created.' },
                                    { status: 'accepted', title: 'Order accepted', description: 'The farmer has accepted your order.' },
                                    { status: 'preparing', title: 'Preparing order', description: 'Your produce is being prepared.' },
                                    { status: 'dispatched', title: 'Out for delivery', description: 'Your order is on its way.' },
                                    { status: 'delivered', title: 'Delivered', description: 'Your order has been delivered.' },
                                  ];

                                  const statuses = steps.map((step) => step.status);
                                  const currentIndex = Math.max(
                                    0,
                                    statuses.indexOf(item.status || 'pending')
                                  );

                                  return (
                                    <div className="bb-tracking-card">
                                      <div className="bb-tracking-heading">
                                        <div>
                                          <span>ORDER TRACKING</span>
                                          <strong>Order #{order.id} Progress</strong>
                                        </div>
                                        <small>{currentIndex + 1} of 5 steps</small>
                                      </div>

                                      <div className="bb-tracking-timeline">
                                        {steps.map((step, index) => {
                                          const completed = index <= currentIndex;
                                          const event = (item.status_history || []).find(
                                            (entry) => entry.status === step.status
                                          );

                                          return (
                                            <div
                                              key={step.status}
                                              className={`bb-timeline-step ${completed ? 'is-complete' : ''}`}
                                            >
                                              <div className="bb-timeline-marker">
                                                {completed ? '✓' : ''}
                                              </div>

                                              <div className="bb-timeline-content">
                                                <strong>{step.title}</strong>
                                                <p>{step.description}</p>
                                                {event?.created_at && (
                                                  <small>
                                                    {new Date(event.created_at).toLocaleString('en-IN')}
                                                  </small>
                                                )}
                                                {event?.note && <small>{event.note}</small>}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            
                          )) : (
                            <p className="bb-muted">No allocation details returned by the server.</p>
                          )}
                        </div>

                        <div className="bb-order-footer">
                          <span><Clock3 size={15} /> {order.created_at ? new Date(order.created_at).toLocaleString('en-IN') : 'Date unavailable'}</span>
                          <span>Request #{order.request_id}</span>
                        </div>

                        {order.status === 'pending_payment' && (
                          <div className="bb-payment-note">
                            <Timer size={16} />
                            Payment pending. This order is not marked as paid.
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </section>
          )}

          <footer className="bb-footer">
            © 2026 AgriDemand AI
            <span>Demand-first agricultural procurement</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
