
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import BulkBuyerDashboard from './BulkBuyerDashboard';
const API = 'http://127.0.0.1:8001';

const CROPS = [
  'tomato', 'onion', 'coconut', 'banana', 'turmeric',
  'rice', 'groundnut', 'maize', 'millet', 'ragi',
  'sugarcane', 'cotton', 'potato', 'brinjal', 'chilli',
  'green chilli', 'drumstick', 'okra', 'beans', 'carrot',
  'cabbage', 'cauliflower', 'garlic', 'ginger',
  'black gram', 'green gram', 'red gram', 'chickpea',
  'corn', 'mango', 'papaya', 'guava', 'watermelon',
  'lemon', 'tapioca', 'sesame', 'sunflower',
  'pepper', 'cardamom', 'cashew', 'arecanut',
  'jasmine', 'rose', 'marigold'
];

const NAV = [
  { id: 'overview', icon: '◫', label: 'Overview', group: 'WORKSPACE' },
  { id: 'inventory', icon: '▤', label: 'My Inventory', group: 'WORKSPACE' },
  { id: 'demand', icon: '◈', label: 'Buyer Demand', group: 'WORKSPACE' },
  { id: 'insights', icon: '⌁', label: 'Demand Insights', group: 'ANALYTICS' },
  { id: 'profile', icon: '◎', label: 'Farm Profile', group: 'ACCOUNT' },
];

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const number = (value) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(Number(value || 0));

function Icon({ children }) {
  return <span className="ag-icon" aria-hidden="true">{children}</span>;
}

function StatCard({ label, value, note, icon, accent }) {
  return (
    <article className={`ag-stat ${accent || ''}`}>
      <div className="ag-stat-top">
        <span>{label}</span>
        <span className="ag-stat-icon"><Icon>{icon}</Icon></span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function EmptyState({ icon = '▤', title, description, action, onAction }) {
  return (
    <div className="ag-empty">
      <div className="ag-empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <button className="ag-btn ag-btn-primary" onClick={onAction}>{action}</button>}
    </div>
  );
}

export default function RoleDashboard() {
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [lots, setLots] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activePage, setActivePage] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [cropFilter, setCropFilter] = useState('all');
  const [mobileMenu, setMobileMenu] = useState(false);

  const [onboarding, setOnboarding] = useState({
    phone: '',
    location: '',
  });

  const [lotForm, setLotForm] = useState({
    crop: 'tomato',
    quantity_kg: '',
    grade: 'A',
    price_per_kg: '',
    location: '',
  });

  const token = localStorage.getItem('agridemand_access_token');

  const request = useCallback(async (endpoint, options = {}) => {
    const response = await fetch(`${API}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
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
  }, [token]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const farmer = await request('/api/farmers/me');
      setProfile(farmer);
      setLotForm((old) => ({ ...old, location: farmer.location || '' }));

      const results = await Promise.allSettled([
        request('/api/lots'),
        request('/api/requests'),
      ]);

      if (results[0].status === 'fulfilled') {
        const allLots = Array.isArray(results[0].value) ? results[0].value : [];
        setLots(allLots.filter((lot) => Number(lot.farmer_id) === Number(farmer.id)));
      } else {
        setLots([]);
        setError(`Could not load inventory: ${results[0].reason.message}`);
      }

      if (results[1].status === 'fulfilled') {
        setRequests(Array.isArray(results[1].value) ? results[1].value : []);
      } else {
        setRequests([]);
      }
    } catch (err) {
      if (err.message.toLowerCase().includes('farmer profile not created yet')) {
        setProfile(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (user?.role === 'farmer') loadDashboard();
    else setLoading(false);
  }, [user, loadDashboard]);

  const availableStock = useMemo(
    () => lots.reduce((sum, lot) => sum + Number(lot.available_kg || 0), 0),
    [lots]
  );

  const inventoryValue = useMemo(
    () => lots.reduce(
      (sum, lot) => sum + Number(lot.available_kg || 0) * Number(lot.price_per_kg || 0),
      0
    ),
    [lots]
  );

  const cropCount = useMemo(
    () => new Set(lots.map((lot) => lot.crop)).size,
    [lots]
  );

  const demandByCrop = useMemo(() => {
    const map = {};
    requests.forEach((item) => {
      const crop = String(item.crop || 'other').toLowerCase();
      map[crop] = (map[crop] || 0) + Number(item.quantity_kg || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [requests]);

  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      const matchesSearch = `${lot.crop} ${lot.grade} ${lot.location || ''}`
        .toLowerCase().includes(search.toLowerCase());
      const matchesCrop = cropFilter === 'all' || lot.crop === cropFilter;
      return matchesSearch && matchesCrop;
    });
  }, [lots, search, cropFilter]);

  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      const matchesSearch = `${item.crop} ${item.delivery_location} ${item.buyer_name}`
        .toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [requests, search]);

  async function createProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const farmer = await request('/api/farmers/me', {
        method: 'POST',
        body: JSON.stringify(onboarding),
      });
      setProfile(farmer);
      setLotForm((old) => ({ ...old, location: farmer.location || '' }));
      setToast('Your farm profile is ready!');
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addLot(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setToast('');

    try {
      await request('/api/lots', {
        method: 'POST',
        body: JSON.stringify({
          ...lotForm,
          crop: lotForm.crop.trim().toLowerCase(),
          quantity_kg: Number(lotForm.quantity_kg),
          price_per_kg: Number(lotForm.price_per_kg),
        }),
      });

      setToast('Your produce has been listed successfully.');
      setLotForm((old) => ({
        ...old,
        quantity_kg: '',
        price_per_kg: '',
      }));
      await loadDashboard();
      setActivePage('inventory');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function navigate(page) {
    setActivePage(page);
    setMobileMenu(false);
    setSearch('');
    setError('');
  }

  if (loading) {
    return (
      <main className="ag-loading">
        <div className="ag-loader" />
        <h2>Preparing your farm workspace</h2>
        <p>Loading your latest farm data...</p>
        <style>{css}</style>
      </main>
    );
  }

  if (user?.role === 'bulk_buyer') {
    return <BulkBuyerDashboard />;
  }

  if (user?.role !== 'farmer') {
    return (
      <main className="ag-loading">
        <h2>Consumer workspace is coming next</h2>
        <p>Welcome, {user?.full_name}</p>
        <button className="ag-btn ag-btn-primary" onClick={logout}>
          Sign out
        </button>
        <style>{css}</style>
      </main>
    );
  }

  const pageTitle = {
    overview: 'Farm overview',
    inventory: 'My inventory',
    demand: 'Buyer demand',
    insights: 'Demand insights',
    profile: 'Farm profile',
  }[activePage];

  const pageSubtitle = {
    overview: 'Your farm at a glance. Make better decisions with demand-led insights.',
    inventory: 'Manage the produce you have available for buyers.',
    demand: 'Explore procurement requirements submitted by buyers.',
    insights: 'Understand what buyers are requesting on the platform.',
    profile: 'Manage your farmer contact and farm location details.',
  }[activePage];

  return (
    <div className="ag-app">
      <style>{css}</style>

      {mobileMenu && (
        <button
          className="ag-mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`ag-sidebar ${mobileMenu ? 'ag-sidebar-open' : ''}`}>
        <div className="ag-brand">
          <div className="ag-brand-mark">A<span>+</span></div>
          <div>
            <strong>AgriDemand</strong>
            <small>FARMER PORTAL</small>
          </div>
          <button className="ag-close-menu" onClick={() => setMobileMenu(false)}>×</button>
        </div>

        <div className="ag-farm-chip">
          <div className="ag-avatar">{(profile?.name || user?.full_name || 'F').charAt(0).toUpperCase()}</div>
          <div className="ag-farm-chip-copy">
            <strong>{profile?.name || user?.full_name}</strong>
            <span>Verified account session</span>
          </div>
          <span className="ag-online-dot" />
        </div>

        {['WORKSPACE', 'ANALYTICS', 'ACCOUNT'].map((group) => (
          <div className="ag-nav-group" key={group}>
            <div className="ag-nav-label">{group}</div>
            {NAV.filter((item) => item.group === group).map((item) => (
              <button
                key={item.id}
                className={`ag-nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => navigate(item.id)}
              >
                <Icon>{item.icon}</Icon>
                <span>{item.label}</span>
                {item.id === 'inventory' && lots.length > 0 && (
                  <small className="ag-nav-count">{lots.length}</small>
                )}
              </button>
            ))}
          </div>
        ))}

        <div className="ag-sidebar-bottom">
          <div className="ag-help-card">
            <span className="ag-help-icon">✦</span>
            <strong>Grow with demand</strong>
            <p>List your harvest so buyers can discover your produce.</p>
            <button onClick={() => navigate('inventory')}>Manage inventory →</button>
          </div>
          <button className="ag-signout" onClick={logout}>
            <Icon>↪</Icon> Sign out
          </button>
          <div className="ag-version">AGRIDEMAND AI · FARMER WORKSPACE</div>
        </div>
      </aside>

      <main className="ag-main">
        <header className="ag-topbar">
          <div className="ag-top-left">
            <button className="ag-menu-toggle" onClick={() => setMobileMenu(true)}>☰</button>
            <div className="ag-breadcrumb">Workspace <span>/</span> {pageTitle}</div>
          </div>
          <div className="ag-top-right">
            <span className="ag-live"><i /> Live workspace</span>
            <div className="ag-top-avatar">{(profile?.name || user?.full_name || 'F').charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <div className="ag-content">
          <div className="ag-page-heading">
            <div>
              <div className="ag-eyebrow">FARMER WORKSPACE</div>
              <h1>{pageTitle}</h1>
              <p>{pageSubtitle}</p>
            </div>
            {profile && (
              <button className="ag-btn ag-btn-primary" onClick={() => navigate('inventory')}>
                <span>＋</span> Add produce
              </button>
            )}
          </div>

          {error && (
            <div className="ag-alert ag-alert-error">
              <span>!</span><p>{error}</p>
              <button onClick={() => setError('')}>×</button>
            </div>
          )}

          {toast && (
            <div className="ag-alert ag-alert-success">
              <span>✓</span><p>{toast}</p>
              <button onClick={() => setToast('')}>×</button>
            </div>
          )}

          {!profile ? (
            <section className="ag-onboarding">
              <div className="ag-onboard-visual">
                <div className="ag-onboard-orbit">✳</div>
                <div className="ag-onboard-art">🌱</div>
                <div className="ag-eyebrow">YOUR FARM. YOUR FUTURE.</div>
                <h2>Start your digital farm journey.</h2>
                <p>Create your farmer profile to list your harvest and connect with buyers looking for produce.</p>
                <div className="ag-onboard-points">
                  <span>✓ List available produce</span>
                  <span>✓ Discover buyer demand</span>
                  <span>✓ Reach more buyers</span>
                </div>
              </div>
              <form className="ag-onboard-form" onSubmit={createProfile}>
                <div className="ag-eyebrow">ONE-TIME SETUP</div>
                <h2>Complete your profile</h2>
                <p>Tell us where your farm is located and how buyers can reach you.</p>
                <label>Farmer name</label>
                <input value={user?.full_name || ''} disabled />
                <label>Mobile number</label>
                <input
                  type="tel"
                  required
                  minLength={8}
                  maxLength={20}
                  placeholder="Enter your phone number"
                  value={onboarding.phone}
                  onChange={(e) => setOnboarding({ ...onboarding, phone: e.target.value })}
                />
                <label>Farm location</label>
                <input
                  required
                  minLength={2}
                  placeholder="e.g. Dharmapuri, Tamil Nadu"
                  value={onboarding.location}
                  onChange={(e) => setOnboarding({ ...onboarding, location: e.target.value })}
                />
                <button className="ag-btn ag-btn-primary ag-btn-wide" disabled={saving}>
                  {saving ? 'Creating profile...' : 'Create my farmer profile →'}
                </button>
                <small className="ag-form-note">Your profile details are used to identify your farm on the platform.</small>
              </form>
            </section>
          ) : (
            <>
              {activePage === 'overview' && (
                <>
                  <div className="ag-welcome-banner">
                    <div>
                      <span className="ag-banner-tag">FARM SNAPSHOT</span>
                      <h2>Good to see you, {profile.name?.split(' ')[0] || 'Farmer'} <span>✳</span></h2>
                      <p>Your farm is connected. Keep your inventory up to date to be discoverable by buyers.</p>
                    </div>
                    <div className="ag-banner-illustration">🌾</div>
                  </div>

                  <div className="ag-stats-grid">
                    <StatCard label="Available stock" value={`${number(availableStock)} kg`} note="Across your listed produce" icon="▤" accent="green" />
                    <StatCard label="Active listings" value={lots.length} note={`${cropCount} different crop types`} icon="◫" />
                    <StatCard label="Buyer requests" value={requests.length} note="Requests on the platform" icon="◈" accent="blue" />
                    <StatCard label="Indicative stock value" value={money(inventoryValue)} note="Available quantity × your listed price" icon="₹" accent="gold" />
                  </div>

                  <div className="ag-section-heading">
                    <div><h2>Farm activity</h2><p>Your current inventory and platform demand.</p></div>
                    <button className="ag-text-btn" onClick={() => navigate('inventory')}>View inventory →</button>
                  </div>

                  <div className="ag-overview-grid">
                    <section className="ag-panel ag-panel-large">
                      <div className="ag-panel-heading">
                        <div><h3>Recently listed produce</h3><p>Your latest inventory records</p></div>
                        <span className="ag-panel-icon">▤</span>
                      </div>
                      {lots.length === 0 ? (
                        <EmptyState icon="🌱" title="Your inventory is waiting" description="Add your first crop listing to make your produce visible to buyers." action="Add your first crop" onAction={() => navigate('inventory')} />
                      ) : (
                        <div className="ag-table-wrap">
                          <table className="ag-table">
                            <thead><tr><th>PRODUCE</th><th>GRADE</th><th>AVAILABLE</th><th>PRICE / KG</th></tr></thead>
                            <tbody>
                              {lots.slice(0, 5).map((lot) => (
                                <tr key={lot.id}>
                                  <td><div className="ag-crop-cell"><span className="ag-crop-emoji">🌿</span><strong>{lot.crop}</strong></div></td>
                                  <td><span className="ag-grade">{lot.grade}</span></td>
                                  <td>{number(lot.available_kg)} kg</td>
                                  <td className="ag-price">{money(lot.price_per_kg)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>

                    <section className="ag-panel">
                      <div className="ag-panel-heading">
                        <div><h3>Buyer demand</h3><p>Most requested crops</p></div>
                        <span className="ag-panel-icon">◈</span>
                      </div>
                      {demandByCrop.length === 0 ? (
                        <EmptyState icon="⌁" title="No demand data yet" description="Buyer requirements will appear here when requests are submitted." />
                      ) : (
                        <div className="ag-demand-list">
                          {demandByCrop.slice(0, 5).map(([crop, quantity], index) => {
                            const max = demandByCrop[0][1] || 1;
                            return (
                              <div className="ag-demand-item" key={crop}>
                                <div className="ag-demand-row"><strong>{crop}</strong><span>{number(quantity)} kg</span></div>
                                <div className="ag-progress"><i style={{ width: `${Math.max(5, quantity / max * 100)}%` }} /></div>
                              </div>
                            );
                          })}
                          <button className="ag-text-btn ag-demand-link" onClick={() => navigate('demand')}>Explore buyer requests →</button>
                        </div>
                      )}
                    </section>
                  </div>

                  <div className="ag-info-strip">
                    <span>✦</span>
                    <div><strong>Sell smarter with demand-led farming</strong><p>Keep your crop quantity and asking price current so buyers can assess available supply.</p></div>
                    <button onClick={() => navigate('demand')}>Explore demand →</button>
                  </div>
                </>
              )}

              {activePage === 'inventory' && (
                <>
                  <div className="ag-stats-grid ag-stats-compact">
                    <StatCard label="Total listings" value={lots.length} note="Your produce records" icon="▤" />
                    <StatCard label="Available stock" value={`${number(availableStock)} kg`} note="Current available quantity" icon="◫" accent="green" />
                    <StatCard label="Crop varieties" value={cropCount} note="Different crop types" icon="✿" />
                  </div>

                  <div className="ag-inventory-layout">
                    <section className="ag-panel ag-add-panel">
                      <div className="ag-panel-heading">
                        <div><h3>Add new produce</h3><p>List a harvest lot for buyers.</p></div>
                        <span className="ag-panel-icon">＋</span>
                      </div>
                      <form className="ag-form" onSubmit={addLot}>
                        <label>Crop type</label>

                        <input
                          type="text"
                          list="ag-crop-suggestions"
                          required
                          minLength={2}
                          maxLength={40}
                          placeholder="Search or type your crop name..."
                          value={lotForm.crop}
                          onChange={(e) =>
                            setLotForm({ ...lotForm, crop: e.target.value })
                          }
                        />

                        <datalist id="ag-crop-suggestions">
                          {[...new Set([
                            ...CROPS,
                            ...lots.map((lot) => lot.crop)
                          ])].sort().map((crop) => (
                            <option key={crop} value={crop}>
                              {crop}
                            </option>
                          ))}
                        </datalist>

                        <small className="ag-form-note">
                          Select a suggested crop or type any crop name to add a new variety.
                        </small>
                        <label>Available quantity (kg)</label>
                        <input type="number" min="0.1" step="0.1" required placeholder="e.g. 500" value={lotForm.quantity_kg} onChange={(e) => setLotForm({ ...lotForm, quantity_kg: e.target.value })} />
                        <label>Produce grade</label>
                        <select value={lotForm.grade} onChange={(e) => setLotForm({ ...lotForm, grade: e.target.value })}>
                          <option value="A">Grade A — Premium</option>
                          <option value="B">Grade B — Standard</option>
                          <option value="C">Grade C — Economy</option>
                        </select>
                        <label>Your asking price (₹ / kg)</label>
                        <input type="number" min="0.01" step="0.01" required placeholder="e.g. 25" value={lotForm.price_per_kg} onChange={(e) => setLotForm({ ...lotForm, price_per_kg: e.target.value })} />
                        <div className="ag-location-note"><span>⌖</span> Farm location: <strong>{profile.location}</strong></div>
                        <button className="ag-btn ag-btn-primary ag-btn-wide" disabled={saving}>{saving ? 'Publishing...' : '＋ Publish produce listing'}</button>
                        <small className="ag-form-note">Your listing will use your saved farm location.</small>
                      </form>
                    </section>

                    <section className="ag-panel ag-inventory-panel">
                      <div className="ag-panel-heading">
                        <div><h3>Listed produce</h3><p>{lots.length} inventory records</p></div>
                        <span className="ag-panel-icon">▤</span>
                      </div>
                      <div className="ag-toolbar">
                        <input className="ag-search" placeholder="Search crops..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        <select value={cropFilter} onChange={(e) => setCropFilter(e.target.value)}>
                          <option value="all">All crops</option>
                          {CROPS.map((crop) => <option key={crop} value={crop}>{crop}</option>)}
                        </select>
                      </div>
                      {filteredLots.length === 0 ? (
                        <EmptyState icon="🌱" title={lots.length ? 'No matching produce' : 'No listings yet'} description={lots.length ? 'Try changing your search or filter.' : 'Your published produce will appear here.'} />
                      ) : (
                        <div className="ag-table-wrap">
                          <table className="ag-table">
                            <thead><tr><th>PRODUCE</th><th>GRADE</th><th>LISTED</th><th>AVAILABLE</th><th>PRICE / KG</th></tr></thead>
                            <tbody>
                              {filteredLots.map((lot) => (
                                <tr key={lot.id}>
                                  <td><div className="ag-crop-cell"><span className="ag-crop-emoji">🌿</span><strong>{lot.crop}</strong></div></td>
                                  <td><span className="ag-grade">{lot.grade}</span></td>
                                  <td>{number(lot.quantity_kg)} kg</td>
                                  <td><span className="ag-stock">{number(lot.available_kg)} kg</span></td>
                                  <td className="ag-price">{money(lot.price_per_kg)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div className="ag-table-foot">Inventory is refreshed from your account data.</div>
                    </section>
                  </div>
                </>
              )}

              {activePage === 'demand' && (
                <section className="ag-panel">
                  <div className="ag-panel-heading">
                    <div><h3>Procurement requests</h3><p>Buyer requirements currently recorded on the platform.</p></div>
                    <span className="ag-panel-icon">◈</span>
                  </div>
                  <div className="ag-toolbar">
                    <input className="ag-search" placeholder="Search crop, buyer or destination..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    <span className="ag-result-count">{filteredRequests.length} requests</span>
                  </div>
                  {filteredRequests.length === 0 ? (
                    <EmptyState icon="⌁" title="No buyer requests found" description="When buyers submit crop requirements, they will appear here." />
                  ) : (
                    <div className="ag-demand-grid">
                      {filteredRequests.map((item) => (
                        <article className="ag-request-card" key={item.id}>
                          <div className="ag-request-top"><span className="ag-request-tag">BUYER REQUIREMENT</span><span className="ag-grade">{item.grade || 'Not specified'}</span></div>
                          <h3>{item.crop}</h3>
                          <div className="ag-request-quantity">{number(item.quantity_kg)} <small>kg required</small></div>
                          <div className="ag-request-details">
                            <div><span>Buyer</span><strong>{item.buyer_name || 'Platform buyer'}</strong></div>
                            <div><span>Maximum price</span><strong>{item.max_price_per_kg ? `${money(item.max_price_per_kg)} / kg` : 'Not specified'}</strong></div>
                            <div><span>Delivery location</span><strong>{item.delivery_location || 'Not specified'}</strong></div>
                          </div>
                          <div className="ag-request-footer">Request #{item.id}</div>
                        </article>
                      ))}
                    </div>
                  )}
                  <div className="ag-note">These are platform buyer requests. A matching or order is not implied by viewing a request.</div>
                </section>
              )}

              {activePage === 'insights' && (
                <>
                  <div className="ag-insight-intro">
                    <span>✦</span>
                    <div><strong>Platform demand snapshot</strong><p>These insights are calculated from buyer requests currently available in the platform database. They are not external market forecasts.</p></div>
                  </div>
                  <div className="ag-stats-grid ag-stats-compact">
                    <StatCard label="Buyer requests" value={requests.length} note="Current platform requests" icon="◈" accent="blue" />
                    <StatCard label="Requested quantity" value={`${number(requests.reduce((s, r) => s + Number(r.quantity_kg || 0), 0))} kg`} note="Total quantity requested" icon="▤" accent="green" />
                    <StatCard label="Crops in demand" value={demandByCrop.length} note="Unique requested crop types" icon="✿" />
                  </div>
                  <section className="ag-panel">
                    <div className="ag-panel-heading"><div><h3>Demand by crop</h3><p>Aggregated quantities from buyer requests.</p></div><span className="ag-panel-icon">⌁</span></div>
                    {demandByCrop.length === 0 ? (
                      <EmptyState icon="⌁" title="Demand data is not available yet" description="Crop demand analytics will appear after buyers submit procurement requests." />
                    ) : (
                      <div className="ag-insight-bars">
                        {demandByCrop.map(([crop, quantity], index) => (
                          <div className="ag-insight-row" key={crop}>
                            <div className="ag-insight-label"><strong>{crop}</strong><span>{number(quantity)} kg</span></div>
                            <div className="ag-progress ag-progress-large"><i style={{ width: `${Math.max(3, quantity / demandByCrop[0][1] * 100)}%` }} /></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                  <div className="ag-note">No live mandi prices, price predictions or external demand forecasts are connected in this version.</div>
                </>
              )}

              {activePage === 'profile' && (
                <div className="ag-profile-layout">
                  <section className="ag-panel ag-profile-card">
                    <div className="ag-profile-avatar">{(profile.name || 'F').charAt(0).toUpperCase()}</div>
                    <h2>{profile.name}</h2>
                    <p>Farmer account</p>
                    <span className="ag-profile-status"><i /> Profile active</span>
                  </section>
                  <section className="ag-panel ag-profile-details">
                    <div className="ag-panel-heading"><div><h3>Farm information</h3><p>Your registered farmer profile details.</p></div><span className="ag-panel-icon">◎</span></div>
                    <div className="ag-detail-row"><span>Full name</span><strong>{profile.name}</strong></div>
                    <div className="ag-detail-row"><span>Phone number</span><strong>{profile.phone || 'Not provided'}</strong></div>
                    <div className="ag-detail-row"><span>Farm location</span><strong>{profile.location}</strong></div>
                    <div className="ag-detail-row"><span>Farmer ID</span><strong>#{profile.id}</strong></div>
                    <div className="ag-detail-row"><span>Account email</span><strong>{user?.email || '—'}</strong></div>
                    <div className="ag-note">Profile editing is not connected to the current backend API. Contact platform support if these details need correction.</div>
                  </section>
                </div>
              )}
            </>
          )}

          <footer className="ag-footer">
            <span>© {new Date().getFullYear()} AgriDemand AI</span>
            <span>Built for a more connected agricultural supply chain.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap');
.ag-app{--bg:#f5f7f3;--surface:#fff;--surface2:#f8faf7;--ink:#17251d;--muted:#7c8b80;--line:#e6ece5;--green:#16794b;--green2:#1e9a60;--pale:#eaf5ed;min-height:100vh;background:var(--bg);color:var(--ink);font-family:'DM Sans',sans-serif;display:flex}
.ag-app *{box-sizing:border-box}
.ag-sidebar{width:258px;flex-shrink:0;background:#10271d;color:#eaf5ed;min-height:100vh;padding:26px 17px 18px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto;z-index:20}
.ag-brand{display:flex;align-items:center;gap:11px;padding:0 9px 27px;border-bottom:1px solid #294235}
.ag-brand-mark{width:39px;height:39px;border-radius:12px;background:#b5efc9;color:#123b26;display:grid;place-items:center;font:800 19px Manrope}
.ag-brand-mark span{color:#16804b}
.ag-brand strong{display:block;font:800 17px Manrope;letter-spacing:-.5px}
.ag-brand small{display:block;color:#8fae9b;font-size:9px;letter-spacing:1.8px;margin-top:3px}
.ag-farm-chip{display:flex;align-items:center;gap:10px;padding:17px 8px 23px}
.ag-avatar,.ag-top-avatar{width:36px;height:36px;border-radius:11px;background:#d0efda;color:#175b39;display:grid;place-items:center;font-weight:800}
.ag-farm-chip-copy{min-width:0;flex:1}
.ag-farm-chip-copy strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ag-farm-chip-copy span{display:block;color:#91ad9a;font-size:10px;margin-top:3px}
.ag-online-dot,.ag-live i,.ag-profile-status i{width:7px;height:7px;border-radius:50%;background:#4bd58a;display:inline-block}
.ag-nav-group{margin-bottom:22px}
.ag-nav-label{font-size:9px;font-weight:800;letter-spacing:1.5px;color:#789784;padding:0 11px 9px}
.ag-nav-item{width:100%;border:0;background:transparent;color:#a8c0b0;display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:9px;text-align:left;font:600 12px 'DM Sans';cursor:pointer;margin:2px 0;transition:.2s}
.ag-nav-item:hover{background:#1b3b2b;color:white}
.ag-nav-item.active{background:#214d35;color:#d5f8df;box-shadow:inset 3px 0 #70d99a}
.ag-icon{width:19px;display:inline-grid;place-items:center;font-size:17px}
.ag-nav-count{margin-left:auto;background:#315b40;color:#c7f2d2;padding:3px 7px;border-radius:20px;font-size:10px}
.ag-sidebar-bottom{margin-top:auto}
.ag-help-card{background:#1a3b2a;border:1px solid #31543d;border-radius:12px;padding:15px;margin:0 2px 18px}
.ag-help-icon{color:#9be5b2;font-size:18px}
.ag-help-card strong{display:block;font-size:12px;margin-top:8px}
.ag-help-card p{font-size:10px;color:#a8c0b0;line-height:1.6;margin:6px 0 12px}
.ag-help-card button{border:0;background:none;color:#a9edbf;font:700 10px 'DM Sans';padding:0;cursor:pointer}
.ag-signout{width:100%;border:0;border-top:1px solid #294235;background:none;color:#b0c7b7;text-align:left;padding:16px 10px 12px;display:flex;gap:11px;align-items:center;cursor:pointer;font:600 12px 'DM Sans'}
.ag-version{color:#698776;font-size:8px;letter-spacing:1px;padding:5px 10px}
.ag-main{min-width:0;flex:1}
.ag-topbar{height:68px;background:rgba(255,255,255,.88);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 38px;position:sticky;top:0;z-index:10;backdrop-filter:blur(12px)}
.ag-top-left,.ag-top-right{display:flex;align-items:center;gap:18px}
.ag-breadcrumb{font-size:11px;color:#6c7c70}
.ag-breadcrumb span{padding:0 8px;color:#b4c1b7}
.ag-live{font-size:10px;color:#64766a;display:flex;align-items:center;gap:7px}
.ag-live i{width:6px;height:6px}
.ag-top-avatar{width:32px;height:32px;border-radius:50%;font-size:12px}
.ag-menu-toggle,.ag-close-menu{display:none}
.ag-content{max-width:1500px;margin:0 auto;padding:34px 38px 22px}
.ag-page-heading{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:25px}
.ag-eyebrow{font-size:9px;font-weight:800;letter-spacing:1.7px;color:#258252;margin-bottom:8px}
.ag-page-heading h1{font:800 27px Manrope;letter-spacing:-1px;margin:0;color:#1b2d21}
.ag-page-heading p{font-size:12px;color:#849187;margin:8px 0 0}
.ag-btn{border:0;border-radius:8px;padding:11px 16px;font:700 11px 'DM Sans';cursor:pointer;transition:.2s}
.ag-btn:disabled{opacity:.6;cursor:not-allowed}
.ag-btn-primary{background:#16794b;color:white;box-shadow:0 5px 12px #16794b1b}
.ag-btn-primary:hover:not(:disabled){background:#11643d;transform:translateY(-1px)}
.ag-btn-primary span{font-size:16px;margin-right:5px}
.ag-btn-wide{width:100%;padding:13px}
.ag-alert{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:9px;margin-bottom:16px;font-size:12px}
.ag-alert p{margin:0;flex:1}
.ag-alert>span{font-weight:900}
.ag-alert button{border:0;background:none;font-size:18px;cursor:pointer;color:inherit}
.ag-alert-error{background:#fff0ed;border:1px solid #f4d0c9;color:#a53c2d}
.ag-alert-success{background:#e9f7ed;border:1px solid #cdebd5;color:#176b3c}
.ag-welcome-banner{background:linear-gradient(110deg,#143d29,#1b6841);border-radius:14px;padding:25px 29px;display:flex;align-items:center;justify-content:space-between;color:#fff;position:relative;overflow:hidden;margin-bottom:20px}
.ag-welcome-banner:after{content:'';position:absolute;width:240px;height:240px;border:1px solid #ffffff16;border-radius:50%;right:55px;top:-135px;box-shadow:0 0 0 30px #ffffff08,0 0 0 60px #ffffff06}
.ag-banner-tag{font-size:8px;font-weight:800;letter-spacing:1.7px;color:#a8e5b9}
.ag-welcome-banner h2{font:800 21px Manrope;margin:9px 0 6px;letter-spacing:-.5px}
.ag-welcome-banner h2 span{color:#9fe5b1}
.ag-welcome-banner p{font-size:11px;color:#c2deca;margin:0;max-width:560px;line-height:1.6}
.ag-banner-illustration{font-size:57px;position:relative;z-index:1;margin-right:35px;filter:drop-shadow(0 9px 9px #061d12)}
.ag-stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:27px}
.ag-stats-compact{grid-template-columns:repeat(3,minmax(0,1fr))}
.ag-stat{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:17px 18px;min-width:0;box-shadow:0 2px 7px #1b392009}
.ag-stat-top{display:flex;justify-content:space-between;align-items:center;color:#77857a;font-size:10px;font-weight:600}
.ag-stat-icon{width:31px;height:31px;border-radius:9px;background:#f0f5f0;color:#477958;display:grid;place-items:center}
.ag-stat-icon .ag-icon{font-size:16px}
.ag-stat strong{display:block;font:800 23px Manrope;letter-spacing:-.7px;margin:11px 0 4px;color:#1c3223;overflow-wrap:anywhere}
.ag-stat small{font-size:9px;color:#9aa59c}
.ag-stat.green .ag-stat-icon{background:#e5f5e9;color:#16804b}
.ag-stat.blue .ag-stat-icon{background:#eaf2fb;color:#4778b5}
.ag-stat.gold .ag-stat-icon{background:#fbf3e3;color:#a77b2c}
.ag-section-heading{display:flex;align-items:center;justify-content:space-between;margin:5px 0 14px}
.ag-section-heading h2{font:800 15px Manrope;margin:0}
.ag-section-heading p{font-size:10px;color:#8a978d;margin:5px 0 0}
.ag-text-btn{border:0;background:none;color:#187b4a;font:700 10px 'DM Sans';cursor:pointer;padding:7px}
.ag-overview-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(280px,1fr);gap:15px}
.ag-panel{background:#fff;border:1px solid var(--line);border-radius:12px;padding:19px;min-width:0;box-shadow:0 2px 7px #1b392007}
.ag-panel-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.ag-panel-heading h3{font:800 13px Manrope;margin:0;color:#26372b}
.ag-panel-heading p{font-size:10px;color:#929d94;margin:5px 0 0}
.ag-panel-icon{width:31px;height:31px;border-radius:9px;background:#edf6ef;color:#277c4a;display:grid;place-items:center;font-size:16px}
.ag-table-wrap{width:100%;overflow-x:auto}
.ag-table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap}
.ag-table th{font-size:8px;letter-spacing:.8px;color:#9aa59d;font-weight:800;padding:11px 9px;border-bottom:1px solid #edf0ed}
.ag-table td{padding:13px 9px;border-bottom:1px solid #f0f2f0;font-size:10px;color:#617064}
.ag-table tbody tr:last-child td{border-bottom:0}
.ag-table td strong{color:#334438;font-size:10px;text-transform:capitalize}
.ag-crop-cell{display:flex;align-items:center;gap:8px}
.ag-crop-emoji{width:26px;height:26px;border-radius:7px;background:#eff6ee;display:grid;place-items:center;font-size:13px}
.ag-grade{display:inline-block;padding:4px 7px;background:#edf6ef;color:#247746;border-radius:5px;font-size:9px;font-weight:800}
.ag-price{font-weight:800;color:#1e7044!important}
.ag-demand-list{padding:2px 0}
.ag-demand-item{margin:14px 0}
.ag-demand-row{display:flex;justify-content:space-between;margin-bottom:7px;font-size:10px}
.ag-demand-row strong{text-transform:capitalize;color:#34483a}
.ag-demand-row span{color:#76877a;font-weight:700}
.ag-progress{height:6px;border-radius:20px;background:#edf1ed;overflow:hidden}
.ag-progress i{display:block;height:100%;border-radius:20px;background:linear-gradient(90deg,#3aa86b,#8dd7a4)}
.ag-demand-link{margin-top:10px;padding-left:0}
.ag-empty{padding:28px 12px;text-align:center}
.ag-empty-icon{font-size:27px;color:#7ba78a;margin-bottom:8px}
.ag-empty h3{font:800 12px Manrope;margin:0;color:#35473a}
.ag-empty p{font-size:10px;color:#89968c;line-height:1.6;max-width:300px;margin:7px auto 14px}
.ag-info-strip,.ag-insight-intro{display:flex;align-items:center;gap:13px;background:#edf6ef;border:1px solid #dceee0;border-radius:10px;padding:14px 17px;margin-top:17px}
.ag-info-strip>span,.ag-insight-intro>span{color:#23834d;font-size:20px}
.ag-info-strip div,.ag-insight-intro div{flex:1}
.ag-info-strip strong,.ag-insight-intro strong{font-size:11px;color:#28563a}
.ag-info-strip p,.ag-insight-intro p{font-size:9px;color:#6e8a75;margin:4px 0 0;line-height:1.5}
.ag-info-strip button{border:0;background:none;color:#197b49;font:700 9px 'DM Sans';cursor:pointer;white-space:nowrap}
.ag-inventory-layout{display:grid;grid-template-columns:minmax(260px,.75fr) minmax(0,1.5fr);gap:15px;align-items:start}
.ag-form label,.ag-onboard-form label{display:block;font-size:10px;font-weight:700;color:#4c5d50;margin:13px 0 6px}
.ag-form input,.ag-form select,.ag-onboard-form input{width:100%;border:1px solid #dfe7df;background:#fbfcfa;border-radius:7px;padding:11px 12px;font:500 11px 'DM Sans';color:#27392c;outline:none}
.ag-form input:focus,.ag-form select:focus,.ag-onboard-form input:focus{border-color:#62ae7c;box-shadow:0 0 0 3px #52a87316}
.ag-form select,.ag-toolbar select{cursor:pointer}
.ag-location-note{background:#f1f6f1;color:#75867a;border-radius:7px;padding:10px;margin:14px 0;font-size:9px}
.ag-location-note strong{color:#365a40}
.ag-location-note span{margin-right:5px}
.ag-form-note{display:block;color:#9aa59d;font-size:9px;margin-top:10px;line-height:1.5}
.ag-toolbar{display:flex;gap:9px;align-items:center;margin-bottom:13px}
.ag-search{flex:1;min-width:100px;border:1px solid #e3eae3;background:#fbfcfa;border-radius:7px;padding:10px 12px;font:500 10px 'DM Sans';outline:none}
.ag-search:focus{border-color:#64ad7c}
.ag-toolbar select{border:1px solid #e3eae3;background:#fbfcfa;border-radius:7px;padding:10px;font:500 10px 'DM Sans';color:#536357}
.ag-stock{font-weight:700;color:#327a4c}
.ag-table-foot{border-top:1px solid #edf0ed;padding-top:12px;margin-top:9px;color:#9aa59d;font-size:9px}
.ag-result-count{font-size:9px;color:#87958a;white-space:nowrap}
.ag-demand-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.ag-request-card{border:1px solid #e6ece5;border-radius:10px;padding:16px;background:#fff;transition:.2s}
.ag-request-card:hover{border-color:#b8d9c1;transform:translateY(-2px);box-shadow:0 7px 20px #1b39200a}
.ag-request-top{display:flex;align-items:center;justify-content:space-between}
.ag-request-tag{font-size:8px;letter-spacing:1px;color:#21804c;font-weight:800}
.ag-request-card h3{font:800 17px Manrope;text-transform:capitalize;margin:15px 0 2px}
.ag-request-quantity{font:800 22px Manrope;color:#1b7042}
.ag-request-quantity small{font:500 10px 'DM Sans';color:#849187}
.ag-request-details{border-top:1px solid #edf0ed;margin-top:14px;padding-top:10px;display:grid;gap:9px}
.ag-request-details div{display:flex;justify-content:space-between;gap:10px}
.ag-request-details span{font-size:9px;color:#8b988e}
.ag-request-details strong{font-size:9px;color:#405345;text-align:right}
.ag-request-footer{border-top:1px solid #edf0ed;margin-top:12px;padding-top:10px;font-size:9px;color:#98a39a}
.ag-note{background:#f6f8f5;border-radius:7px;padding:11px 13px;margin-top:14px;color:#87948a;font-size:9px;line-height:1.6}
.ag-insight-bars{max-width:720px}
.ag-insight-row{margin:18px 0}
.ag-insight-label{display:flex;justify-content:space-between;margin-bottom:8px}
.ag-insight-label strong{text-transform:capitalize;font-size:11px;color:#35483a}
.ag-insight-label span{font-size:10px;color:#75867a;font-weight:700}
.ag-progress-large{height:10px}
.ag-profile-layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:15px;align-items:start}
.ag-profile-card{text-align:center;padding:29px 15px}
.ag-profile-avatar{width:64px;height:64px;border-radius:20px;background:#e4f4e8;color:#197848;display:grid;place-items:center;font:800 27px Manrope;margin:0 auto 14px}
.ag-profile-card h2{font:800 17px Manrope;margin:0}
.ag-profile-card>p{font-size:10px;color:#8c998f}
.ag-profile-status{display:inline-flex;align-items:center;gap:7px;background:#eaf6ed;color:#287647;border-radius:20px;padding:7px 11px;font-size:9px;font-weight:700;margin-top:9px}
.ag-profile-status i{width:6px;height:6px}
.ag-detail-row{display:flex;justify-content:space-between;gap:15px;padding:14px 3px;border-bottom:1px solid #eff2ef}
.ag-detail-row span{font-size:10px;color:#849187}
.ag-detail-row strong{font-size:10px;color:#34473a;text-align:right;overflow-wrap:anywhere}
.ag-onboarding{display:grid;grid-template-columns:1fr 1fr;max-width:950px;margin:15px auto;background:#fff;border:1px solid var(--line);border-radius:15px;overflow:hidden;box-shadow:0 12px 40px #1b39200a}
.ag-onboard-visual{background:linear-gradient(145deg,#123b27,#1e7046);color:#fff;padding:35px;display:flex;flex-direction:column;justify-content:center;min-height:440px;position:relative;overflow:hidden}
.ag-onboard-visual:after{content:'';position:absolute;width:300px;height:300px;border:1px solid #ffffff20;border-radius:50%;right:-140px;bottom:-120px;box-shadow:0 0 0 30px #ffffff08,0 0 0 60px #ffffff05}
.ag-onboard-orbit{font-size:20px;color:#a9e9bb}
.ag-onboard-art{font-size:65px;margin:22px 0}
.ag-onboard-visual .ag-eyebrow{color:#a9e9bb}
.ag-onboard-visual h2{font:800 25px Manrope;line-height:1.25;max-width:350px;margin:0 0 10px}
.ag-onboard-visual p{font-size:11px;color:#c1dfca;line-height:1.7;max-width:340px}
.ag-onboard-points{display:grid;gap:10px;margin-top:17px;font-size:10px;color:#d7f0dd}
.ag-onboard-form{padding:38px}
.ag-onboard-form h2{font:800 21px Manrope;margin:0;color:#203428}
.ag-onboard-form>p{font-size:10px;color:#87948a;line-height:1.6;margin:8px 0 20px}
.ag-onboard-form input:disabled{background:#f1f5f1;color:#8a968d}
.ag-onboard-form .ag-btn{margin-top:20px}
.ag-footer{display:flex;justify-content:space-between;gap:12px;padding:22px 2px 5px;color:#a0aaa2;font-size:9px}
.ag-loading{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;background:#f5f7f3;color:#23372a;font-family:'DM Sans',sans-serif}
.ag-loading h2{font:800 18px Manrope;margin:15px 0 5px}
.ag-loading p{font-size:11px;color:#849187}
.ag-loader{width:30px;height:30px;border:3px solid #dceade;border-top-color:#18804d;border-radius:50%;animation:agspin .8s linear infinite}
@keyframes agspin{to{transform:rotate(360deg)}}
.ag-mobile-backdrop{display:none}
@media(max-width:1100px){.ag-sidebar{width:230px}.ag-content{padding:28px 25px}.ag-topbar{padding:0 25px}.ag-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ag-overview-grid{grid-template-columns:1fr}.ag-inventory-layout{grid-template-columns:1fr}}
@media(max-width:720px){.ag-sidebar{position:fixed;left:-270px;top:0;width:258px;transition:left .25s;box-shadow:12px 0 35px #07170d20}.ag-sidebar-open{left:0}.ag-mobile-backdrop{display:block;position:fixed;inset:0;background:#07170d70;border:0;z-index:19}.ag-close-menu{display:block;margin-left:auto;background:none;border:0;color:white;font-size:24px}.ag-menu-toggle{display:block;border:0;background:none;color:#36533e;font-size:20px;cursor:pointer}.ag-topbar{height:58px;padding:0 16px}.ag-content{padding:23px 15px}.ag-page-heading{align-items:flex-start;flex-direction:column}.ag-page-heading h1{font-size:23px}.ag-page-heading>.ag-btn{width:100%}.ag-welcome-banner{padding:20px}.ag-welcome-banner h2{font-size:18px}.ag-banner-illustration{font-size:38px;margin-right:0}.ag-stats-grid,.ag-stats-compact{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ag-stat{padding:13px}.ag-stat strong{font-size:19px}.ag-panel{padding:14px}.ag-demand-grid{grid-template-columns:1fr}.ag-profile-layout{grid-template-columns:1fr}.ag-onboarding{grid-template-columns:1fr}.ag-onboard-visual{min-height:auto;padding:25px}.ag-onboard-art{font-size:42px;margin:10px 0}.ag-onboard-visual h2{font-size:21px}.ag-onboard-form{padding:24px}.ag-info-strip{align-items:flex-start;flex-wrap:wrap}.ag-info-strip button{margin-left:30px}.ag-footer{flex-direction:column}.ag-toolbar{flex-wrap:wrap}.ag-search{flex-basis:100%}}
@media(max-width:390px){.ag-stats-grid,.ag-stats-compact{grid-template-columns:1fr}.ag-live{display:none}.ag-topbar{padding:0 12px}.ag-content{padding:18px 11px}}
`;
