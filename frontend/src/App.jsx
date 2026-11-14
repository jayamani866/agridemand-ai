import { useEffect, useState } from 'react'
import {
  Sprout, LayoutDashboard, Users, Package, ShoppingCart,
  BrainCircuit, Wallet, Settings, Bell, Search, ArrowUpRight,
  TrendingUp, MapPin, Leaf, ChevronRight, Menu, Sun, Moon,
  X, CalendarDays, Plus, Filter, Clock3,
  CheckCircle2, BarChart3, ImageOff
} from 'lucide-react'

import {
  getFarmers,
  getLots,
  getBuyerRequests,
} from './services/api'
import BuyerRequests from './admin/pages/BuyerRequests'
import AIMatching from './admin/pages/AIMatching'
import Orders from './admin/pages/Orders';
import Farmers from './admin/pages/Farmers';
import MarketIntelligence from './admin/pages/MarketIntelligence';
import Reports from './admin/pages/Reports';
import AdminSettings from './admin/pages/Settings';
import { useTheme } from './context/useTheme'
import './App.css'
const menu = [
  { name: 'Overview', icon: LayoutDashboard, group: 'WORKSPACE' },
  { name: 'Buyer Requests', icon: ShoppingCart, group: 'WORKSPACE' },
  { name: 'Farmer Inventory', icon: Package, group: 'WORKSPACE' },
  { name: 'AI Matching', icon: BrainCircuit, group: 'WORKSPACE' },
  { name: 'Orders', icon: Wallet, group: 'WORKSPACE' },
  { name: 'Farmers', icon: Users, group: 'WORKSPACE' },
  { name: 'Market Intelligence', icon: BarChart3, group: 'INSIGHTS' },
  { name: 'Reports', icon: TrendingUp, group: 'INSIGHTS' },
]
const crops = [
  {
    crop: 'Tomato',
    variety: 'Hybrid · Grade A',
    location: 'Salem, Tamil Nadu',
    quantity: '600 kg',
    price: '₹22',
    unit: '/ kg',
    status: 'Available',
    color: '#ef634f',
    image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=900&auto=format&fit=crop&q=85',
    description: 'Fresh, firm tomatoes sourced from local farmers. Suitable for wholesale procurement and food processing.',
    farmer: 'Demo Farmer 01',
    harvest: 'Recently harvested',
  },
  {
    crop: 'Onion',
    variety: 'Red Onion · Grade A',
    location: 'Salem, Tamil Nadu',
    quantity: '500 kg',
    price: '₹28',
    unit: '/ kg',
    status: 'Available',
    color: '#ad78c9',
    image: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=900&auto=format&fit=crop&q=85',
    description: 'Carefully sorted onions with consistent sizing for wholesale buyers.',
    farmer: 'Demo Farmer 02',
    harvest: 'Recently harvested',
  },
  {
    crop: 'Coconut',
    variety: 'Mature Coconut · Grade A',
    location: 'Dharmapuri, Tamil Nadu',
    quantity: '1,000 kg',
    price: '₹32',
    unit: '/ kg',
    status: 'Available',
    color: '#9aaf70',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=900&auto=format&fit=crop&q=85',
    description: 'Mature coconuts for food production and wholesale distribution.',
    farmer: 'Demo Farmer 03',
    harvest: 'Recently harvested',
  },
  {
    crop: 'Banana',
    variety: 'Fresh Banana · Grade A',
    location: 'Erode, Tamil Nadu',
    quantity: '600 kg',
    price: '₹18',
    unit: '/ kg',
    status: 'Available',
    color: '#d9ae42',
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=900&auto=format&fit=crop&q=85',
    description: 'Fresh bananas ready for local wholesale distribution and retail supply.',
    farmer: 'Demo Farmer 01',
    harvest: 'Recently harvested',
  },
]
// const availableStock = lots.reduce(
//   (total, lot) => total + Number(lot.available_kg || 0),
//   0
// )

// const metrics = [
//   {
//     label: 'Registered farmers',
//     value: loading ? '...' : String(farmers.length),
//     note: 'Registered farmer accounts',
//     icon: Users,
//     trend: 'Supply network',
//   },
//   {
//     label: 'Available produce',
//     value: loading
//       ? '...'
//       : `${availableStock.toLocaleString('en-IN')} kg`,
//     note: 'Across available lots',
//     icon: Package,
//     trend: 'Inventory',
//   },
//   {
//     label: 'Buyer requests',
//     value: loading ? '...' : String(buyerRequests.length),
//     note: 'Procurement demand',
//     icon: ShoppingCart,
//     trend: 'Demand',
//   },
//   {
//     label: 'Orders created',
//     value: '—',
//     note: 'Orders API not connected yet',
//     icon: Wallet,
//     trend: 'Procurement',
//   },
// ]
function CropImage({ crop, className = '' }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`crop-image ${className}`} style={{ '--crop-color': crop.color }}>
      {!failed ? (
        <img
          src={crop.image}
          alt={`${crop.crop} produce`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="crop-image-fallback">
          <ImageOff size={25} />
          <span>{crop.crop}</span>
        </div>
      )}
      <span className="image-grade">{crop.variety.split('·')[1]?.trim() || 'Fresh produce'}</span>
    </div>
  )
}
function App() {
  const [active, setActive] = useState('Overview')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [selectedCrop, setSelectedCrop] = useState(null)
  const [search, setSearch] = useState('')
  const { theme, toggleTheme } = useTheme()
  const dateLabel = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
  const goTo = (page) => {
    setActive(page)
    setSelectedCrop(null)
    setMobileMenu(false)
  }
  // const filteredCrops = crops.filter((crop) =>
  //   `${crop.crop} ${crop.location} ${crop.variety}`.toLowerCase().includes(search.toLowerCase())
  // )
  const [farmers, setFarmers] = useState([])
  const [lots, setLots] = useState([])
  const [buyerRequests, setBuyerRequests] = useState([])

  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      try {
        setLoading(true)

        const [farmerData, lotData, requestData] =
          await Promise.all([
            getFarmers(),
            getLots(),
            getBuyerRequests(),
          ])

        if (!cancelled) {
          setFarmers(farmerData)
          setLots(lotData)
          setBuyerRequests(requestData)
          setApiError('')
        }
      } catch (error) {
        if (!cancelled) {
          setApiError(error.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [])

      const availableStock = lots.reduce(
      (total, lot) => total + Number(lot.available_kg || 0),
      0
    )

    const metrics = [
      {
        label: 'Registered farmers',
        value: loading ? '...' : String(farmers.length),
        note: 'Registered farmer accounts',
        icon: Users,
        trend: 'Supply network',
      },
      {
        label: 'Available produce',
        value: loading
          ? '...'
          : `${availableStock.toLocaleString('en-IN')} kg`,
        note: 'Across available lots',
        icon: Package,
        trend: 'Inventory',
      },
      {
        label: 'Buyer requests',
        value: loading ? '...' : String(buyerRequests.length),
        note: 'Procurement demand',
        icon: ShoppingCart,
        trend: 'Demand',
      },
      {
        label: 'Orders created',
        value: '—',
        note: 'Orders API not connected yet',
        icon: Wallet,
        trend: 'Procurement',
      },
    ]

  const farmerById = new Map(
      farmers.map((farmer) => [farmer.id, farmer])
    )

    const inventoryCrops = lots
      .filter((lot) => Number(lot.available_kg) > 0)
      .map((lot) => {
        const cropName = String(lot.crop || '')
        const cropInfo = crops.find(
          (crop) => crop.crop.toLowerCase() === cropName.toLowerCase()
        )

        const farmer = farmerById.get(lot.farmer_id)

        return {
          id: lot.id,
          crop: cropName,
          variety: `${cropName} · Grade ${lot.grade}`,
          location: lot.location,
          quantity: `${Number(lot.available_kg).toLocaleString('en-IN')} kg`,
          price: `₹${lot.price_per_kg}`,
          unit: '/ kg',
          status: lot.status,
          color: cropInfo?.color || '#22a06b',
          image: cropInfo?.image || '',
          description: `Available ${cropName} produce from ${farmer?.name || 'Registered farmer'}.`,
          farmer: farmer?.name || 'Unknown farmer',
          harvest: 'Harvest date from backend',
        }
      })

    const filteredInventoryCrops = inventoryCrops.filter((crop) =>
      `${crop.crop} ${crop.location} ${crop.variety} ${crop.farmer}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )



  //dynamic  metrics block goes here 
  return (
    <div className="app-shell">
      {mobileMenu && <button className="mobile-overlay" onClick={() => setMobileMenu(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Sprout size={25} strokeWidth={2.2} /></div>
          <div>
            <div className="brand-name">AgriDemand<span> AI</span></div>
            <div className="brand-caption">Intelligent agriculture commerce</div>
          </div>
          <button className="mobile-close icon-button" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={19} /></button>
        </div>
        <div className="sidebar-scroll">
          <div className="nav-group">
            <p className="nav-label">WORKSPACE</p>
            {menu.filter((item) => item.group === 'WORKSPACE').map(({ name, icon: Icon }) => (
              <button key={name} onClick={() => goTo(name)} className={`nav-link ${active === name ? 'active' : ''}`}>
                <Icon size={18} strokeWidth={1.8} />
                <span>{name}</span>
                {active === name && <ChevronRight className="nav-chevron" size={16} />}
              </button>
            ))}
          </div>
          <div className="nav-group">
            <p className="nav-label">ANALYTICS</p>
            {menu.filter((item) => item.group === 'INSIGHTS').map(({ name, icon: Icon }) => (
              <button key={name} onClick={() => goTo(name)} className={`nav-link ${active === name ? 'active' : ''}`}>
                <Icon size={18} strokeWidth={1.8} />
                <span>{name}</span>
                {active === name && <ChevronRight className="nav-chevron" size={16} />}
              </button>
            ))}
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-promo">
            <div className="promo-icon"><Sprout size={19} /></div>
            <p className="promo-title">Better supply. Smarter decisions.</p>
            <p className="promo-copy">Connecting farmer supply with real buyer demand.</p>
            <div className="promo-status"><span /> Demo environment</div>
          </div>
          <button onClick={() => goTo('Settings')} className={`nav-link settings-link ${active === 'Settings' ? 'active' : ''}`}>
            <Settings size={18} /><span>Settings</span>
          </button>
          <div className="sidebar-footer">AGRIDEMAND AI <span>·</span> HACKATHON BUILD</div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-button icon-button" onClick={() => setMobileMenu(true)} aria-label="Open navigation"><Menu size={21} /></button>
            <div className="breadcrumb">
              <span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{selectedCrop ? selectedCrop.crop : active}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <label className="global-search">
              <Search size={17} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search produce..." />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button theme-button" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button>
            <button className="profile-button" aria-label="User profile">A</button>
          </div>
        </header>
        <div className="page-content">
          {apiError && (
            <div role="alert" style={{
              padding: '12px 16px',
              marginBottom: '16px',
              borderRadius: '8px',
              background: '#7f1d1d',
              color: '#ffffff',
            }}>
              Backend connection failed: {apiError}
            </div>
          )}
          {selectedCrop ? (
            <section className="crop-detail-page">
              <button className="back-link" onClick={() => setSelectedCrop(null)}>← Back to inventory</button>
              <div className="detail-grid">
                <div className="detail-photo-wrap">
                  <CropImage crop={selectedCrop} className="detail-photo" />
                  <div className="detail-photo-caption"><Leaf size={15} /> Fresh farmer-sourced produce</div>
                </div>
                <div className="detail-info">
                  <div className="eyebrow"><span className="eyebrow-dot" /> FARMER INVENTORY</div>
                  <h1>{selectedCrop.crop}</h1>
                  <p className="detail-variety">{selectedCrop.variety}</p>
                  <p className="detail-description">{selectedCrop.description}</p>
                  <div className="detail-price">{selectedCrop.price}<span>{selectedCrop.unit}</span></div>
                  <div className="detail-stock"><CheckCircle2 size={16} /> {selectedCrop.quantity} currently available</div>
                  <div className="detail-facts">
                    <div><span>Farmer</span><strong>{selectedCrop.farmer}</strong></div>
                    <div><span>Location</span><strong><MapPin size={14} /> {selectedCrop.location}</strong></div>
                    <div><span>Harvest status</span><strong>{selectedCrop.harvest}</strong></div>
                    <div><span>Quality</span><strong>{selectedCrop.variety}</strong></div>
                  </div>
                  <button className="primary-button detail-action" onClick={() => goTo('Buyer Requests')}><ShoppingCart size={17} /> Create buyer request <ArrowUpRight size={16} /></button>
                  <p className="detail-disclaimer">Demo inventory data · Confirm availability before procurement.</p>
                </div>
              </div>
            </section>
          ) : active === 'Overview' ? (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-dot" /> AGRICULTURAL PROCUREMENT INTELLIGENCE</div>
                  <h1>Agriculture, <span>in sync.</span></h1>
                  <p>One intelligent workspace to connect demand, supply and procurement.</p>
                  <div className="date-line"><CalendarDays size={14} /> {dateLabel}</div>
                </div>
                <button className="primary-button" onClick={() => goTo('Buyer Requests')}><Plus size={18} /> New buyer request</button>
              </section>
              <section className="metric-grid">
                {metrics.map(({ label, value, note, icon: Icon, trend }, index) => (
                  <article className="metric-card" key={label}>
                    <div className="metric-top"><span>{label}</span><div className={`metric-icon metric-icon-${index}`}><Icon size={19} /></div></div>
                    <div className="metric-value">{value}</div>
                    <div className="metric-bottom"><span>{note}</span><span className="metric-tag">{trend}</span></div>
                  </article>
                ))}
              </section>
              <section className="overview-grid">
                <article className="intelligence-card">
                  <div className="intelligence-orbit orbit-one" />
                  <div className="intelligence-orbit orbit-two" />
                  <div className="intelligence-content">
                    <div className="intelligence-label"><BrainCircuit size={18} /> AGRIDEMAND INTELLIGENCE</div>
                    <h2>From fragmented supply to <span>fulfilled demand.</span></h2>
                    <p>Our matching engine combines produce from multiple farmer lots to help fulfil a buyer’s requested quantity — with transparent allocation.</p>
                    <button className="intelligence-button" onClick={() => goTo('AI Matching')}>Explore AI matching <ArrowUpRight size={17} /></button>
                  </div>
                  <div className="intelligence-art"><Sprout size={112} strokeWidth={0.8} /></div>
                  <div className="intelligence-foot"><span><i /> DEMAND-FIRST PROCUREMENT</span><span>BUILT FOR AGRICULTURE</span></div>
                </article>
                <article className="latest-order-card">
                  <div className="section-kicker">RECENT ACTIVITY</div>
                  <div className="order-heading"><h3>Latest order</h3><span className="status-pending"><Clock3 size={12} /> Pending</span></div>
                  <div className="order-number">ORDER #001 <span>· Demo data</span></div>
                  <div className="order-crop">
                    <div className="mini-tomato"><span /></div>
                    <div><strong>Tomato</strong><p>2,000 kg · Grade A</p></div>
                    <ArrowUpRight size={17} />
                  </div>
                  <div className="order-total"><span>Order value</span><strong>₹43,300</strong></div>
                  <button className="text-action" onClick={() => goTo('Orders')}>View order details <ArrowUpRight size={15} /></button>
                </article>
              </section>
              <section className="inventory-section">
                <div className="section-heading">
                  <div><div className="section-kicker">SUPPLY NETWORK</div><h2>Explore available produce</h2><p>Browse sample produce lots from the farmer network.</p></div>
                  <button className="outline-button" onClick={() => goTo('Farmer Inventory')}>View all inventory <ArrowUpRight size={15} /></button>
                </div>
                <div className="crop-grid">
                  {crops.slice(0, 3).map((crop) => (
                    <button className="crop-card" key={crop.id} onClick={() => setSelectedCrop(crop)}>
                      <CropImage crop={crop} />
                      <div className="crop-card-body">
                        <div className="crop-card-title"><div><h3>{crop.crop}</h3><p>{crop.variety}</p></div><ArrowUpRight size={17} /></div>
                        <div className="crop-card-meta"><span><MapPin size={13} /> {crop.location.split(',')[0]}</span><span className="available-dot">Available</span></div>
                        <div className="crop-card-bottom"><strong>{crop.quantity}</strong><span>{crop.price}<small> / kg</small></span></div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : active === 'Farmer Inventory' ? (
            <section className="inventory-page">
              <div className="page-heading compact-heading">
                <div><div className="eyebrow"><span className="eyebrow-dot" /> SUPPLY MANAGEMENT</div><h1>Farmer <span>inventory.</span></h1><p>Explore available crops and their sample stock details.</p></div>
                <button className="primary-button" onClick={() => goTo('Buyer Requests')}><Plus size={18} /> Create demand</button>
              </div>
              <div className="inventory-toolbar"><div><strong>{filteredInventoryCrops.length} available lots</strong><span> Sample inventory</span></div><button className="outline-button"><Filter size={15} /> Filters</button></div>
              <div className="crop-grid inventory-crop-grid">
                
                {filteredInventoryCrops.length === 0 && (
                  <div className="empty-state">
                    No produce matches “{search}”. Try another search.
                  </div>
                )}
                </div>
                </section>
                ) : active === 'Buyer Requests' ? (
                  <BuyerRequests />
                ) : active === 'AI Matching' ? (
                  <AIMatching />
                ) : active === 'Orders' ? (
                  <Orders />
                ) : active === 'Farmers' ? (
                  <Farmers />
                ) : active === 'Market Intelligence' ? (
                  <MarketIntelligence />
                ) : active === 'Reports' ? (
                  <Reports />
                ) : active === 'Settings' ? (
                  <AdminSettings />
                ) : (
                  <section className="coming-page">
                    <div className="coming-icon">
                      {active === 'Farmers' ? (
                        <Users size={30} />
                      ) : active === 'Settings' ? (
                        <Settings size={30} />
                      ) : (
                        <BarChart3 size={30} />
                      )}
                    </div>

                    <div className="eyebrow">
                      <span className="eyebrow-dot" /> AGRIDEMAND AI WORKSPACE
                    </div>

                    <h1>{active}</h1>
                    <p>
                      This workspace is being connected to the live AgriDemand AI backend.
                      The next milestone is to make this workflow fully interactive and data-driven.
                    </p>

                    <div className="coming-status">
                      <span className="eyebrow-dot" /> UI foundation ready
                      <span>·</span> Backend integration pending
                    </div>

                    <button className="outline-button" onClick={() => goTo('Overview')}>
                      Return to overview <ArrowUpRight size={15} />
                    </button>
                  </section>
                )}

          <footer className="app-footer"><span>© 2026 AgriDemand AI <i /> Intelligent agricultural procurement</span><span><span className="footer-live-dot" /> Hackathon demo environment</span></footer>
        </div>
      </main>
    </div>
  )
}
export default App
