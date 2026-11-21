import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sprout, ShoppingBasket, ShoppingCart, Package, UserRound,
  Search, MapPin, Plus, Minus, Trash2, RefreshCw, LogOut,
  ChevronRight, Leaf, Truck, ShieldCheck, CircleCheck, Clock3,
  Store, X, ArrowLeft, Menu
} from 'lucide-react';
import { useAuth } from './useAuth';
import './ConsumerDashboard.css';

const API = 'http://127.0.0.1:8002';

const money = value =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const emoji = crop => {
  const name = String(crop || '').toLowerCase();
  if (name.includes('tomato')) return '🍅';
  if (name.includes('onion')) return '🧅';
  if (name.includes('banana')) return '🍌';
  if (name.includes('coconut')) return '🥥';
  if (name.includes('mango')) return '🥭';
  if (name.includes('carrot')) return '🥕';
  if (name.includes('rice')) return '🌾';
  return '🥬';
};

const categories = ['All', 'Vegetables', 'Fruits', 'Staples', 'Other'];

function getCategory(crop) {
  const name = String(crop || '').toLowerCase();
  if (/tomato|onion|potato|carrot|brinjal|chilli|beans|okra/.test(name)) return 'Vegetables';
  if (/banana|mango|papaya|guava|orange|apple/.test(name)) return 'Fruits';
  if (/rice|maize|corn|millet|ragi|groundnut/.test(name)) return 'Staples';
  return 'Other';
}

export default function ConsumerDashboard() {
  const { user, logout } = useAuth();

  const [page, setPage] = useState('shop');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [trackingOrderId, setTrackingOrderId] = useState(null);
  const [cart, setCart] = useState({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('recommended');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pay_on_delivery');
  const paypalCaptureStarted = useRef(false);
  const [error, setError] = useState(() =>
    new URLSearchParams(window.location.search).get('paypal') === 'cancel'
      ? 'PayPal payment was cancelled.'
      : ''
  );
  const [notice, setNotice] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [address, setAddress] = useState({
    delivery_address: '',
    delivery_city: '',
    postal_code: '',
    phone: ''
  });
  const [addressSaved, setAddressSaved] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  const token = localStorage.getItem('agridemand_access_token');

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  }, [token]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api('/api/consumer/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadOrders = useCallback(async () => {
    setBusy(true);
    setError('');

    try {
      const data = await api('/api/consumer/orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [api]);

  const saveAddress = async () => {
    try {
      setAddressLoading(true);

      const saved = await api('/api/consumer/address', {
        method: 'PUT',
        body: JSON.stringify(address)
      });

      setAddress({
        delivery_address: saved.delivery_address,
        delivery_city: saved.delivery_city,
        postal_code: saved.postal_code,
        phone: saved.phone
      });

      setAddressSaved(true);
      setEditingAddress(false);
      setNotice('Delivery address saved successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setAddressLoading(false);
    }
  };
  useEffect(() => {
    let active = true;

    async function fetchProducts() {
      try {
        const data = await api('/api/consumer/products');
        if (active) {
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchProducts();

    return () => {
      active = false;
    };
  }, [api]);

  useEffect(() => {
    if (page !== 'checkout' && page !== 'profile') return;

    let active = true;

    async function fetchAddress() {
      try {
        const saved = await api('/api/consumer/address');

        if (active && saved) {
          setAddress({
            delivery_address: saved.delivery_address,
            delivery_city: saved.delivery_city,
            postal_code: saved.postal_code,
            phone: saved.phone
          });
          setAddressSaved(true);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setAddressLoading(false);
      }
    }

    fetchAddress();

    return () => {
      active = false;
    };
  }, [page, api]);

  useEffect(() => {
    if (page !== 'orders') return;

    let active = true;

    async function fetchOrders() {
      try {
        const data = await api('/api/consumer/orders');
        if (active) {
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setBusy(false);
      }
    }

    fetchOrders();

    return () => {
      active = false;
    };
  }, [page, api]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paypalOrderId = params.get('token');
    const paymentStatus = params.get('paypal');

    if (paymentStatus === 'cancel') {
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (!paypalOrderId || paypalCaptureStarted.current) return;

    paypalCaptureStarted.current = true;
    setBusy(true);
    setError('');
    setNotice('');

    api(`/api/paypal/capture/${encodeURIComponent(paypalOrderId)}`, {
        method: 'POST'
    })
        .then(async result => {
        setCart({});
        setNotice(`PayPal payment successful. Order #${result.order.id} placed.`);
        window.history.replaceState({}, '', window.location.pathname);
        setPage('orders');
        await loadOrders();
        })
        .catch(err => {
        setError(`PayPal payment verification failed: ${err.message}`);
        paypalCaptureStarted.current = false;
        })
        .finally(() => setBusy(false));
    }, [api, loadOrders]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const product = products.find(item => item.id === Number(id));
        return product ? { ...product, quantity } : null;
      })
      .filter(Boolean);
  }, [cart, products]);

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * Number(item.price_per_kg),
    0
  );

  const filteredProducts = useMemo(() => {
    let result = products.filter(product => {
      const matchesCategory =
        category === 'All' || getCategory(product.crop) === category;

      const text = `${product.crop} ${product.location} ${product.farmer_name}`.toLowerCase();

      return matchesCategory && text.includes(search.toLowerCase());
    });

    if (sort === 'low') {
      result = [...result].sort((a, b) => a.price_per_kg - b.price_per_kg);
    }

    if (sort === 'high') {
      result = [...result].sort((a, b) => b.price_per_kg - a.price_per_kg);
    }

    if (sort === 'stock') {
      result = [...result].sort((a, b) => b.available_kg - a.available_kg);
    }

    return result;
  }, [products, category, search, sort]);

  function updateCart(product, quantity) {
    const value = Math.max(
      0,
      Math.min(Number(product.available_kg), Number(quantity) || 0)
    );

    setCart(previous => {
      const next = { ...previous };

      if (value === 0) {
        delete next[product.id];
      } else {
        next[product.id] = value;
      }

      return next;
    });
  }

  function navigate(nextPage) {
    setPage(nextPage);
    setMobileMenu(false);
    setError('');
  }

  
  
  async function placeOrder(event) {
    event.preventDefault();

    if (!cartItems.length) {
      setError('Your basket is empty.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');

    try {
      
      const savedAddress = await api('/api/consumer/address', {
        method: 'PUT',
        body: JSON.stringify(address)
      });

      setAddress({
        delivery_address: savedAddress.delivery_address,
        delivery_city: savedAddress.delivery_city,
        postal_code: savedAddress.postal_code,
        phone: savedAddress.phone
      });

      setAddressSaved(true);
      setEditingAddress(false);

      const payload = {
        client_order_key: crypto.randomUUID(),
        delivery_address: savedAddress.delivery_address,
        delivery_city: savedAddress.delivery_city,
        postal_code: savedAddress.postal_code,
        phone: savedAddress.phone,
        payment_method: paymentMethod,
        items: cartItems.map(item => ({
          lot_id: item.id,
          quantity_kg: item.quantity
        }))
      };


      if (paymentMethod === 'paypal') {
        const result = await api('/api/paypal/create-order', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (!result.approval_url) {
          throw new Error('PayPal approval URL missing.');
        }

        window.location.assign(result.approval_url);
        return;
      }

      if (paymentMethod === 'razorpay') {
        const result = await api('/api/razorpay/create-order', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        if (!window.Razorpay) {
          throw new Error('Razorpay Checkout script is not loaded.');
        }

        const options = {
          key: result.key_id,
          amount: result.amount,
          currency: result.currency,
          name: 'AgriDemand AI',
          description: 'Fresh produce order',
          order_id: result.razorpay_order_id,

          handler: async function (response) {
            setBusy(true);
            try {
              const verified = await api('/api/razorpay/verify-payment', {
                method: 'POST',
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                })
              });

              if (verified.status !== 'completed') {
                throw new Error('Payment verification is pending.');
              }

              setCart({});
              setNotice(`Razorpay payment successful. Order #${verified.order_id} placed.`);
              setPage('orders');
              await loadOrders();
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          },

          modal: {
            ondismiss: () => setBusy(false)
          },

          theme: {
            color: '#16a34a'
          }
        };

        const checkout = new window.Razorpay(options);
        checkout.on('payment.failed', response => {
          setError(response.error?.description || 'Payment failed. Please retry.');
          setBusy(false);
        });

        checkout.open();
        return;
      }

      const order = await api('/api/consumer/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setCart({});
      setNotice(`Order #${order.id} placed. Payment is due on delivery.`);
      setPage('orders');
      await loadOrders();

    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }


  const navItems = [
    ['shop', 'Discover produce', ShoppingBasket],
    ['cart', 'Your basket', ShoppingCart],
    ['orders', 'Order history', Package],
    ['profile', 'Profile', UserRound]
  ];

  return (
    <div className="cp-shell">
      <aside className={`cp-side ${mobileMenu ? 'open' : ''}`}>
        <div className="cp-brand">
          <span><Sprout /></span>
          <b>AgriDemand <i>AI</i><small>FRESH FROM THE SOURCE</small></b>
          <button className="cp-close" onClick={() => setMobileMenu(false)}>
            <X />
          </button>
        </div>

        <div className="cp-user">
          <div>{(user?.full_name || 'C')[0].toUpperCase()}</div>
          <span><b>{user?.full_name || 'Consumer'}</b><small>Consumer account</small></span>
        </div>

        <small className="cp-caption">YOUR WORKSPACE</small>

        <nav>
          {navItems.map(([id, label, Icon]) => (
            <button
              key={id}
              className={page === id ? 'active' : ''}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              {label}
              {id === 'cart' && cartItems.length > 0 && (
                <em>{cartItems.length}</em>
              )}
            </button>
          ))}
        </nav>

        <div className="cp-note">
          <Leaf />
          <b>Good food. Fair sourcing.</b>
          <p>Shop produce listed directly by farmers across the network.</p>
        </div>

        <button className="cp-logout" onClick={logout}>
          <LogOut size={17} /> Sign out
        </button>
      </aside>

      {mobileMenu && (
        <button className="cp-scrim" onClick={() => setMobileMenu(false)} />
      )}

      <main className="cp-main">
        <header className="cp-top">
          <button className="cp-menu" onClick={() => setMobileMenu(true)}>
            <Menu />
          </button>
          <span>Workspace / <b>{navItems.find(item => item[0] === page)?.[1] || 'Checkout'}</b></span>
          <button onClick={page === 'orders' ? loadOrders : loadProducts}>
            <RefreshCw size={16} /> Refresh
          </button>
        </header>

        <div className="cp-content">
          {error && (
            <div className="cp-alert">
              {error}
              <button onClick={() => setError('')}><X size={15} /></button>
            </div>
          )}

          {notice && (
            <div className="cp-success">
              <CircleCheck size={16} />
              {notice}
              <button onClick={() => setNotice('')}><X size={15} /></button>
            </div>
          )}

          {page === 'shop' && (
            <>
              <section className="cp-hero">
                <div>
                  <small><Leaf size={13} /> FARM-FRESH MARKETPLACE</small>
                  <h1>Fresh choices.<br /><em>Closer to the source.</em></h1>
                  <p>
                    Discover quality produce listed by farmers.
                    Transparent prices, live availability, and a simpler way to shop.
                  </p>
                  <button onClick={() => document.getElementById('cp-catalogue')?.scrollIntoView({ behavior: 'smooth' })}>
                    Explore produce <ChevronRight size={17} />
                  </button>
                </div>
                <div className="cp-hero-emoji">🥬<span>🌿</span></div>
                <footer>
                  <span><ShieldCheck /> Farmer-listed inventory</span>
                  <span><Truck /> Delivery details at checkout</span>
                </footer>
              </section>

              <section id="cp-catalogue" className="cp-section">
                <div className="cp-heading">
                  <div>
                    <small>THE MARKET</small>
                    <h2>Explore fresh produce</h2>
                    <p>Live stock from registered farmers</p>
                  </div>
                  <label>{products.length} listings</label>
                </div>

                <div className="cp-tools">
                  <div className="cp-search">
                    <Search />
                    <input
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      placeholder="Search crop, farmer or location"
                    />
                  </div>

                  <select value={sort} onChange={event => setSort(event.target.value)}>
                    <option value="recommended">Recommended</option>
                    <option value="low">Price: low to high</option>
                    <option value="high">Price: high to low</option>
                    <option value="stock">Most available</option>
                  </select>
                </div>

                <div className="cp-cats">
                  {categories.map(item => (
                    <button
                      key={item}
                      className={category === item ? 'on' : ''}
                      onClick={() => setCategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="cp-empty">Loading live inventory...</div>
                ) : filteredProducts.length ? (
                  <div className="cp-grid">
                    {filteredProducts.map(product => (
                      <article className="cp-product" key={product.id}>
                        <div className="cp-art">
                          <span>{emoji(product.crop)}</span>
                          <small>GRADE {product.grade}</small>
                        </div>
                        <div className="cp-product-body">
                          <div className="cp-meta">
                            {getCategory(product.crop)}
                            <i /> {product.available_kg} kg available
                          </div>
                          <h3>{product.crop}</h3>
                          <p>
                            <Store size={13} /> {product.farmer_name}
                            <MapPin size={13} /> {product.location}
                          </p>
                          <div className="cp-product-foot">
                            <b>{money(product.price_per_kg)} <small>/ kg</small></b>
                            <button onClick={() => updateCart(product, (cart[product.id] || 0) + 1)}>
                              Add <Plus size={15} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="cp-empty">
                    <ShoppingBasket />
                    <h3>No matching produce</h3>
                    <p>Try a different search or category.</p>
                    <button onClick={() => { setSearch(''); setCategory('All'); }}>
                      Clear filters
                    </button>
                  </div>
                )}
              </section>
            </>
          )}

          {page === 'cart' && (
            <section className="cp-section">
              <div className="cp-heading">
                <div><small>YOUR SELECTION</small><h2>Your basket</h2></div>
              </div>

              {!cartItems.length ? (
                <div className="cp-empty">
                  <ShoppingCart />
                  <h3>Your basket is empty</h3>
                  <button onClick={() => navigate('shop')}>Browse produce</button>
                </div>
              ) : (
                <div className="cp-columns">
                  <div className="cp-cart">
                    {cartItems.map(item => (
                      <article key={item.id}>
                        <span className="cp-cart-emoji">{emoji(item.crop)}</span>
                        <div className="cp-cart-name">
                          <b>{item.crop}</b>
                          <small>{item.farmer_name} · {money(item.price_per_kg)}/kg</small>
                        </div>
                        <div className="cp-step">
                          <button onClick={() => updateCart(item, item.quantity - 1)}><Minus size={13} /></button>
                          <input
                            type="number"
                            min="0"
                            max={item.available_kg}
                            value={item.quantity}
                            onChange={event => updateCart(item, event.target.value)}
                          />
                          <button onClick={() => updateCart(item, item.quantity + 1)}><Plus size={13} /></button>
                        </div>
                        <b>{money(item.quantity * item.price_per_kg)}</b>
                        <button className="cp-trash" onClick={() => updateCart(item, 0)}><Trash2 size={16} /></button>
                      </article>
                    ))}
                  </div>

                  <aside className="cp-summary">
                    <small>ORDER SUMMARY</small>
                    <h3>Basket total</h3>
                    <p><span>Items ({cartItems.length})</span><b>{money(cartTotal)}</b></p>
                    <hr />
                    <h3><span>Subtotal</span><strong>{money(cartTotal)}</strong></h3>
                    <button onClick={() => navigate('checkout')}>
                      Continue to checkout <ChevronRight size={16} />
                    </button>
                  </aside>
                </div>
              )}
            </section>
          )}

          {page === 'checkout' && (
            <section className="cp-section">
              <button className="cp-back" onClick={() => navigate('cart')}>
                <ArrowLeft size={15} /> Back to basket
              </button>
              <div className="cp-heading">
                <div><small>ORDER PLACEMENT</small><h2>Delivery details</h2></div>
              </div>

              <div className="cp-columns">
                <form className="cp-form" onSubmit={placeOrder}>
                  {addressSaved && !editingAddress && (
                    <div className="cp-profile">
                      <section>
                        <small>SAVED DELIVERY ADDRESS</small>
                        <h3>{address.delivery_address}</h3>
                        <p>{address.delivery_city} - {address.postal_code}</p>
                        <p>{address.phone}</p>
                      </section>

                      <button
                        type="button"
                        onClick={() => setEditingAddress(true)}
                      >
                        Edit Address
                      </button>
                    </div>
                  )}
                  <label>Delivery address
                    <input required minLength="5" maxLength="250"
                      value={address.delivery_address}
                      onChange={event => setAddress({ ...address, delivery_address: event.target.value })} />
                  </label>
                  <label>City / town
                    <input required value={address.delivery_city}
                      onChange={event => setAddress({ ...address, delivery_city: event.target.value })} />
                  </label>
                  <label>Postal code
                    <input required pattern="[0-9]{5,10}" value={address.postal_code}
                      onChange={event => setAddress({ ...address, postal_code: event.target.value })} />
                  </label>
                  <label>Contact phone
                    <input
                        required
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        value={address.phone}
                      onChange={event => setAddress({ ...address, phone: event.target.value })} />
                  </label>
                  <div className="cp-pod">
                    <label>
                        <input
                        type="radio"
                        name="paymentMethod"
                        value="pay_on_delivery"
                        checked={paymentMethod === 'pay_on_delivery'}
                        onChange={() => setPaymentMethod('pay_on_delivery')}
                        />
                        <ShieldCheck />
                        <span>
                        <b>Cash on Delivery</b>
                        <small>Pay when your produce arrives.</small>
                        </span>
                    </label>

                    <label>
                        <input
                        type="radio"
                        name="paymentMethod"
                        value="paypal"
                        checked={paymentMethod === 'paypal'}
                        onChange={() => setPaymentMethod('paypal')}
                        />
                        <span>
                        <b>PayPal Sandbox</b>
                        <small>Secure online checkout (test mode).</small>
                        </span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="razorpay"
                        checked={paymentMethod === 'razorpay'}
                        onChange={() => setPaymentMethod('razorpay')}
                      />
                      <span>
                        <b>UPI / Debit Card / Credit Card</b>
                        <small>Secure Razorpay checkout (Test Mode).</small>
                      </span>
                    </label>
                    </div>
                  <button className="cp-primary" disabled={busy || !cartItems.length}>
                    {busy
                        ? 'Processing...'
                        : paymentMethod === 'paypal'
                        ? 'Continue to PayPal'
                        : 'Place order'}
                  </button>
                </form>

                <aside className="cp-summary">
                  <small>ORDER REVIEW</small>
                  <h3>{cartItems.length} product types</h3>
                  {cartItems.map(item => (
                    <p key={item.id}>
                      <span>{item.crop} × {item.quantity} kg</span>
                      <b>{money(item.quantity * item.price_per_kg)}</b>
                    </p>
                  ))}
                  <hr />
                  <h3><span>Total</span><strong>{money(cartTotal)}</strong></h3>
                </aside>
              </div>
            </section>
          )}

          
          {page === 'orders' && (
            <section className="cp-section">
              <div className="cp-heading">
                <div>
                  <small>YOUR PURCHASES</small>
                  <h2>Order history</h2>
                  <p>Track and manage your purchases</p>
                </div>
                <button className="cp-refresh" onClick={loadOrders} disabled={busy}>
                  <RefreshCw size={15} /> Refresh
                </button>
              </div>

              {busy && !orders.length ? (
                <div className="cp-empty">Loading orders...</div>
              ) : orders.length ? (
                <div className="cp-orders">
                  
                    
                  {orders.map(order => {
                    const statusProgress = {
                      placed: 0,
                      accepted: 1,
                      preparing: 2,
                      dispatched: 3,
                      delivered: 4,
                    };

                    const itemStatuses = (order.items || []).map(item =>
                      String(item.status || 'placed').toLowerCase()
                    );

                    // Show the least advanced item status until every item is complete.
                    const status = itemStatuses.length
                      ? itemStatuses.reduce((current, next) =>
                          (statusProgress[next] ?? 0) < (statusProgress[current] ?? 0)
                            ? next
                            : current
                        )
                      : 'placed';

                    const steps = [
                      { key: 'placed', label: 'Order placed', detail: 'Your order has been successfully created.' },
                      { key: 'accepted', label: 'Order accepted', detail: 'The farmer has accepted your order.' },
                      { key: 'preparing', label: 'Preparing order', detail: 'Your produce is being prepared.' },
                      { key: 'dispatched', label: 'Out for delivery', detail: 'Your order is on its way.' },
                      { key: 'delivered', label: 'Delivered', detail: 'Your order has been delivered.' }
                    ];

                    const statusIndex = statusProgress[status] ?? 0;
                    const cancelled = status === 'cancelled';
                    const expanded = trackingOrderId === order.id;

                    return (

                      <article className="cp-order-card" key={order.id}>
                        <header className="cp-order-header">
                          <div>
                            <small>ORDER #{order.id}</small>
                            <h3>{order.items.map(item => item.crop).join(', ')}</h3>
                          </div>
                          <b className={`cp-status ${cancelled ? 'is-cancelled' : ''}`}>
                            {status.replaceAll('_', ' ')}
                          </b>
                        </header>

                        <div className="cp-order-meta">
                          <span>
                            <Clock3 size={14} />
                            {new Date(order.created_at).toLocaleString('en-IN')}
                          </span>
                          <b>{money(order.total_amount)}</b>
                        </div>

                        <div className="cp-order-items">
                          {order.items.map(item => (
                            <p key={item.id}>
                              <span>{emoji(item.crop)} {item.crop} · {item.quantity_kg} kg</span>
                              <span>{item.farmer_name} · {money(item.subtotal)}</span>
                            </p>
                          ))}
                        </div>

                        <footer className="cp-order-address">
                          <MapPin size={14} />
                          {order.delivery_address}, {order.delivery_city} {order.postal_code}
                        </footer>

                        <button
                          type="button"
                          className="cp-track-button"
                          onClick={() => setTrackingOrderId(expanded ? null : order.id)}
                          aria-expanded={expanded}
                        >
                          <Package size={16} />
                          {expanded ? 'Hide tracking' : 'Track order'}
                          <ChevronRight
                            size={16}
                            className={expanded ? 'cp-track-chevron open' : 'cp-track-chevron'}
                          />
                        </button>

                        {expanded && (
                          <div className="cp-tracking-panel">
                            <div className="cp-tracking-heading">
                              <div>
                                <small>ORDER TRACKING</small>
                                <h3>Order #{order.id} progress</h3>
                              </div>
                              <span>{cancelled ? 'Cancelled' : `${statusIndex + 1} of 5 steps`}</span>
                            </div>

                            {cancelled ? (
                              <div className="cp-tracking-cancelled">
                                <X size={18} />
                                This order is marked as cancelled.
                              </div>
                            ) : (
                              <div className="cp-timeline">
                                {steps.map((step, index) => {
                                  const completed = index <= statusIndex;
                                  const current = index === statusIndex;

                                  return (
                                    <div
                                      className={`cp-timeline-step ${completed ? 'completed' : ''} ${current ? 'current' : ''}`}
                                      key={step.key}
                                    >
                                      <div className="cp-timeline-marker">
                                        {completed ? <CircleCheck size={17} /> : <span>{index + 1}</span>}
                                      </div>
                                      <div className="cp-timeline-content">
                                        <b>{step.label}</b>
                                        <p>{step.detail}</p>
                                        {current && (
                                          <small>
                                            {status === 'placed'
                                              ? 'Your order is placed. Waiting for the next status update.'
                                              : 'Current status from your order record.'}
                                          </small>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="cp-tracking-note">
                              <ShieldCheck size={15} />
                              Tracking information is based on the latest status recorded by the platform.
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="cp-empty">
                  <Package />
                  <h3>No orders yet</h3>
                  <button onClick={() => navigate('shop')}>Explore marketplace</button>
                </div>
              )}
            </section>
          )}


          {page === 'profile' && (
            <section className="cp-section">
              <div className="cp-heading"><div><small>ACCOUNT</small><h2>Your profile</h2></div></div>
              <div className="cp-profile">
                <div>{(user?.full_name || 'C')[0].toUpperCase()}</div>
                <section><small>CONSUMER ACCOUNT</small><h3>{user?.full_name}</h3><p>{user?.email}</p></section>
              </div>
              <div className="cp-form">
                <h3>Delivery Address</h3>

                {addressSaved && !editingAddress ? (
                  <>
                    <p>{address.delivery_address}</p>
                    <p>{address.delivery_city} - {address.postal_code}</p>
                    <p>{address.phone}</p>

                    <button
                      type="button"
                      onClick={() => setEditingAddress(true)}
                    >
                      Edit Address
                    </button>
                  </>
                ) : (
                  <>
                    <label>Delivery Address
                      <input
                        value={address.delivery_address}
                        onChange={e => setAddress({...address, delivery_address: e.target.value})}
                      />
                    </label>

                    <label>City
                      <input
                        value={address.delivery_city}
                        onChange={e => setAddress({...address, delivery_city: e.target.value})}
                      />
                    </label>

                    <label>Postal Code
                      <input
                        value={address.postal_code}
                        onChange={e => setAddress({...address, postal_code: e.target.value})}
                      />
                    </label>

                    <label>Phone
                      <input
                        value={address.phone}
                        onChange={e => setAddress({...address, phone: e.target.value})}
                      />
                    </label>

                    <button
                      type="button"
                      disabled={addressLoading}
                      onClick={saveAddress}
                    >
                      {addressLoading ? 'Saving...' : 'Save Address'}
                    </button>
                  </>
                )}
              </div>
              <button className="cp-signout" onClick={logout}><LogOut size={16} /> Sign out</button>
            </section>
          )}
        </div>

        <footer className="cp-footer">
          © 2026 AgriDemand AI
          <span>Demand-first agricultural commerce</span>
        </footer>
      </main>
    </div>
  );
}
