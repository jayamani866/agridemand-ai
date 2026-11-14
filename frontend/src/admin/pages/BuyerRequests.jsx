
import { useEffect, useState } from 'react';
import './BuyerRequests.css';
import { Search, MapPin, RefreshCw, ShoppingCart } from 'lucide-react';

import { getBuyerRequests } from '../../shared/services/buyerRequestApi';

function BuyerRequests() {
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await getBuyerRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load buyer requests.');
    } finally {
      setLoading(false);
    }
  };

  
useEffect(() => {
  let isMounted = true;

    getBuyerRequests()
        .then((data) => {
        if (isMounted) {
            setRequests(Array.isArray(data) ? data : []);
        }
        })
        .catch((err) => {
        if (isMounted) {
            setError(err.message || 'Unable to load buyer requests.');
        }
        })
        .finally(() => {
        if (isMounted) {
            setLoading(false);
        }
        });

    return () => {
        isMounted = false;
    };
    }, []);


  const formatPrice = (price) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(price || 0));
    const filteredRequests = requests.filter((request) =>
    `${request.buyer_name} ${request.crop} ${request.delivery_location}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  
    return (
    <section className="buyer-requests-page">
        <div className="br-header">
        <div>
            <div className="br-eyebrow">
            <i />
            PROCUREMENT MANAGEMENT
            </div>
            <h1>Buyer Requests</h1>
            <p>Manage bulk procurement demand across the farmer network.</p>
        </div>

        <button className="br-refresh" onClick={loadRequests} disabled={loading}>
            <RefreshCw size={16} />
            {loading ? 'Loading...' : 'Refresh'}
        </button>
        </div>

        <div className="br-stats">
        <div className="br-stat-card">
            <div className="br-stat-label">Total buyer requests</div>
            <div className="br-stat-value">{requests.length}</div>
            <div className="br-stat-note">Registered procurement demands</div>
        </div>

        <div className="br-stat-card">
            <div className="br-stat-label">Total requested quantity</div>
            <div className="br-stat-value">
            {requests.reduce((sum, item) => sum + Number(item.quantity_kg || 0), 0).toLocaleString('en-IN')} kg
            </div>
            <div className="br-stat-note">Across all buyer requests</div>
        </div>

        <div className="br-stat-card">
            <div className="br-stat-label">Average maximum price</div>
            <div className="br-stat-value">
            {formatPrice(
                requests.length
                ? requests.reduce((sum, item) => sum + Number(item.max_price_per_kg || 0), 0) / requests.length
                : 0
            )}
            </div>
            <div className="br-stat-note">Maximum price per kg</div>
        </div>
        </div>

        <div className="br-toolbar">
        <div className="br-search">
            <Search size={17} />
            <input
            type="search"
            placeholder="Search buyer, crop or location..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            />
        </div>
        <div className="br-results">
            {requests.length} total requests
        </div>
        </div>

        {loading && <div className="br-loading">Loading buyer requests...</div>}

        {error && (
        <div className="br-error" role="alert">
            {error}
        </div>
        )}

        {!loading && !error && filteredRequests.length === 0 && (
        <div className="br-empty">
            <ShoppingCart size={30} />
            <p>No matching buyer requests found.</p>
        </div>
        )}

        {!loading && !error && filteredRequests.length > 0 && (
        <div className="br-grid">
            {filteredRequests.map((request) => (
            <article className="br-card" key={request.id}>
                <div className="br-card-top">
                <span className="br-request-id">REQUEST #{request.id}</span>
                <span className="br-status">● Submitted</span>
                </div>

                <h2 className="br-crop">{request.crop}</h2>

                <p className="br-buyer">
                Buyer: <strong>{request.buyer_name}</strong>
                </p>

                <div className="br-divider" />

                <div className="br-details">
                <div>
                    <div className="br-detail-label">Required quantity</div>
                    <div className="br-detail-value">
                    {Number(request.quantity_kg || 0).toLocaleString('en-IN')} kg
                    </div>
                </div>

                <div>
                    <div className="br-detail-label">Quality grade</div>
                    <div className="br-detail-value">{request.grade || 'Any'}</div>
                </div>

                <div>
                    <div className="br-detail-label">Maximum price / kg</div>
                    <div className="br-detail-value br-price">
                    {formatPrice(request.max_price_per_kg)}
                    </div>
                </div>
                </div>

                <div className="br-location">
                <MapPin size={16} />
                Delivery: {request.delivery_location}
                </div>
                <div className="br-card-action">
                <span>Procurement request #{request.id}</span>
                <button type="button" onClick={() => window.alert(`Request #${request.id}`)}>
                    View details →
                </button>
                </div>
            </article>
            ))}
        </div>
        )}
    </section>
    );

}

export default BuyerRequests;
