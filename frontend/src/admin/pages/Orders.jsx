
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  ShoppingBag,
  IndianRupee,
  Package,
  Clock3,
  CheckCircle2,

  ChevronDown,
  ChevronUp,
  MapPin,
  Users,
  AlertCircle,
  CalendarDays,
  ArrowUpRight,
  Sprout,
} from 'lucide-react';

import { getOrders } from '../../shared/services/ordersApi';
import './Orders.css';

const currency = (amount, code = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const quantity = (value) =>
  `${Number(value || 0).toLocaleString('en-IN')} kg`;

const dateLabel = (value) => {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const statusLabel = (status) =>
  String(status || 'unknown')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState(null);

  
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
        const data = await getOrders();
        setOrders(data);
    } catch (err) {
        setError(err.message || 'Unable to load orders.');
    } finally {
        setLoading(false);
    }
    }, []);

    useEffect(() => {
    let cancelled = false;

    getOrders()
        .then((data) => {
        if (!cancelled) {
            setOrders(data);
        }
        })
        .catch((err) => {
        if (!cancelled) {
            setError(err.message || 'Unable to load orders.');
        }
        })
        .finally(() => {
        if (!cancelled) {
            setLoading(false);
        }
        });

    return () => {
        cancelled = true;
    };
    }, []);


  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !search ||
        [
          order.id,
          order.request_id,
          order.buyer_name,
          order.crop,
          order.delivery_location,
        ]
          .join(' ')
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        activeFilter === 'all' ||
        String(order.status).toLowerCase() === activeFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, activeFilter]);

  const totalValue = orders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0
  );

  const pendingCount = orders.filter(
    (order) => order.status === 'pending_payment'
  ).length;

  const paidCount = orders.filter(
    (order) => order.status === 'paid'
  ).length;

  const totalQuantity = orders.reduce(
    (sum, order) =>
      sum + Number(order.requested_quantity_kg || 0),
    0
  );

  const filters = [
    { label: 'All orders', value: 'all' },
    { label: 'Pending payment', value: 'pending_payment' },
    { label: 'Paid', value: 'paid' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <main className="orders-page">
      <header className="orders-header">
        <div>
          <div className="orders-eyebrow">
            <span className="orders-live-dot" />
            PROCUREMENT MANAGEMENT
          </div>

          <h1>
            Orders <span>& Fulfilment.</span>
          </h1>

          <p>
            Track procurement orders, farmer allocations and payment status.
          </p>
        </div>

        <button
          type="button"
          className="orders-refresh"
          onClick={loadOrders}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'orders-spinning' : ''} />
          {loading ? 'Refreshing...' : 'Refresh orders'}
        </button>
      </header>

      <section className="orders-metrics">
        <article className="orders-metric-card">
          <div className="orders-metric-top">
            <span>Total orders</span>
            <span className="orders-metric-icon green">
              <ShoppingBag size={19} />
            </span>
          </div>
          <strong>{orders.length}</strong>
          <small>Recorded procurement orders</small>
        </article>

        <article className="orders-metric-card">
          <div className="orders-metric-top">
            <span>Total order value</span>
            <span className="orders-metric-icon gold">
              <IndianRupee size={19} />
            </span>
          </div>
          <strong>{currency(totalValue)}</strong>
          <small>Combined order value</small>
        </article>

        <article className="orders-metric-card">
          <div className="orders-metric-top">
            <span>Requested quantity</span>
            <span className="orders-metric-icon blue">
              <Package size={19} />
            </span>
          </div>
          <strong>{quantity(totalQuantity)}</strong>
          <small>Across all recorded orders</small>
        </article>

        <article className="orders-metric-card">
          <div className="orders-metric-top">
            <span>Pending payment</span>
            <span className="orders-metric-icon orange">
              <Clock3 size={19} />
            </span>
          </div>
          <strong>{pendingCount}</strong>
          <small>{paidCount} paid orders</small>
        </article>
      </section>

      <section className="orders-workspace">
        <div className="orders-toolbar">
          <div>
            <h2>Order management</h2>
            <p>Review and manage procurement transactions.</p>
          </div>

          <span className="orders-record-count">
            {filteredOrders.length} orders
          </span>
        </div>

        <div className="orders-controls">
          <div className="orders-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search order, buyer or crop..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="orders-filters">
            {filters.map((filter) => (
              <button
                type="button"
                key={filter.value}
                className={
                  activeFilter === filter.value ? 'active' : ''
                }
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="orders-message">
            <RefreshCw size={22} className="orders-spinning" />
            <p>Loading live orders...</p>
          </div>
        )}

        {!loading && error && (
          <div className="orders-message orders-error" role="alert">
            <AlertCircle size={24} />
            <p>{error}</p>
            <button type="button" onClick={loadOrders}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filteredOrders.length === 0 && (
          <div className="orders-empty">
            <div className="orders-empty-icon">
              <ShoppingBag size={27} />
            </div>
            <h3>
              {orders.length === 0
                ? 'No orders yet'
                : 'No matching orders'}
            </h3>
            <p>
              {orders.length === 0
                ? 'Orders created from successful procurement requests will appear here.'
                : 'Try changing your search or status filter.'}
            </p>
          </div>
        )}

        {!loading && !error && filteredOrders.length > 0 && (
          <div className="orders-list">
            {filteredOrders.map((order) => {
              const isExpanded = expandedOrder === order.id;
              const items = Array.isArray(order.items) ? order.items : [];

              return (
                <article className="orders-card" key={order.id}>
                  <div className="orders-card-main">
                    <div className="orders-card-identity">
                      <div className="orders-product-icon">
                        <Sprout size={21} />
                      </div>

                      <div>
                        <span className="orders-id">
                          ORDER #{String(order.id).padStart(4, '0')}
                        </span>
                        <h3>{order.crop}</h3>
                        <p>Buyer: {order.buyer_name}</p>
                      </div>
                    </div>

                    <div className="orders-card-status">
                      <span
                        className={`orders-status ${String(order.status)
                          .toLowerCase()
                          .replaceAll('_', '-')}`}
                      >
                        {order.status === 'paid' ? (
                          <CheckCircle2 size={13} />
                        ) : (
                          <Clock3 size={13} />
                        )}
                        {statusLabel(order.status)}
                      </span>

                      <span className="orders-date">
                        <CalendarDays size={13} />
                        {dateLabel(order.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="orders-card-details">
                    <div>
                      <span>Requested quantity</span>
                      <strong>
                        {quantity(order.requested_quantity_kg)}
                      </strong>
                    </div>

                    <div>
                      <span>Order amount</span>
                      <strong className="orders-amount">
                        {currency(order.total_amount, order.currency)}
                      </strong>
                    </div>

                    <div>
                      <span>Farmer allocations</span>
                      <strong>
                        {new Set(items.map((item) => item.farmer_id)).size}{' '}
                        farmers
                      </strong>
                    </div>

                    <div>
                      <span>Delivery location</span>
                      <strong className="orders-location">
                        <MapPin size={14} />
                        {order.delivery_location}
                      </strong>
                    </div>
                  </div>

                  <div className="orders-card-footer">
                    <span>
                      <Package size={14} />
                      {items.length} lot allocations
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedOrder(isExpanded ? null : order.id)
                      }
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? 'Hide details' : 'View allocations'}
                      {isExpanded ? (
                        <ChevronUp size={15} />
                      ) : (
                        <ChevronDown size={15} />
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="orders-allocation">
                      <div className="orders-allocation-heading">
                        <div>
                          <h4>Farmer-wise allocations</h4>
                          <p>
                            Lot-level procurement breakdown for this order.
                          </p>
                        </div>
                        <Users size={19} />
                      </div>

                      <div className="orders-table-wrap">
                        <table className="orders-table">
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
                            {items.map((item) => (
                              <tr key={item.id}>
                                <td>
                                  <strong>{item.farmer_name}</strong>
                                  <small>Lot #{item.lot_id}</small>
                                </td>
                                <td>{item.farmer_location}</td>
                                <td>{quantity(item.quantity_kg)}</td>
                                <td>{currency(item.price_per_kg)}</td>
                                <td>
                                  <strong>
                                    {currency(item.subtotal)}
                                  </strong>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="orders-total-row">
                        <span>Order total</span>
                        <strong>
                          {currency(order.total_amount, order.currency)}
                        </strong>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="orders-footer">
        <span>
          <span className="orders-live-dot" />
          Live backend data
        </span>
        <span>
          <ArrowUpRight size={13} />
          AgriDemand AI Procurement
        </span>
      </footer>
    </main>
  );
}

export default Orders;
