
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  IndianRupee,
  Package,
  RefreshCw,
  Sprout,
  TrendingUp,
  Users,
} from 'lucide-react';

import { getFarmers, getLots, getBuyerRequests } from '../../services/api';
import { getOrders } from '../../shared/services/ordersApi';
import './Reports.css';

const formatNumber = (value) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(
    Number(value) || 0
  );

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

// const safeDate = (value) => {
//   if (!value) return '—';
//   const date = new Date(value);
//   return Number.isNaN(date.getTime())
//     ? '—'
//     : date.toLocaleDateString('en-IN', {
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric',
//       });
// };

const downloadCsv = (filename, rows) => {
  if (!rows.length) return;

  const escapeCell = (value) =>
    `"${String(value ?? '').replace(/"/g, '""')}"`;

  const csv = rows.map((row) => row.map(escapeCell).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

function Reports() {
  const [farmers, setFarmers] = useState([]);
  const [lots, setLots] = useState([]);
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadReports = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const [farmerData, lotData, requestData, orderData] =
        await Promise.all([
          getFarmers(),
          getLots(),
          getBuyerRequests(),
          getOrders(),
        ]);

      setFarmers(Array.isArray(farmerData) ? farmerData : []);
      setLots(Array.isArray(lotData) ? lotData : []);
      setRequests(Array.isArray(requestData) ? requestData : []);
      setOrders(Array.isArray(orderData) ? orderData : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load report data from the backend.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchReports = async () => {
        setError('');

        try {
        const [farmerData, lotData, requestData, orderData] =
            await Promise.all([
            getFarmers(),
            getLots(),
            getBuyerRequests(),
            getOrders(),
            ]);

        if (cancelled) return;

        setFarmers(Array.isArray(farmerData) ? farmerData : []);
        setLots(Array.isArray(lotData) ? lotData : []);
        setRequests(Array.isArray(requestData) ? requestData : []);
        setOrders(Array.isArray(orderData) ? orderData : []);
        } catch (err) {
        if (!cancelled) {
            setError(
            err instanceof Error
                ? err.message
                : 'Unable to load report data from the backend.'
            );
        }
        } finally {
        if (!cancelled) setLoading(false);
        }
    };

    fetchReports();

    return () => {
        cancelled = true;
    };
    }, []);

  const stats = useMemo(() => {
    const availableStock = lots.reduce(
      (sum, lot) => sum + Math.max(0, Number(lot.available_kg) || 0),
      0
    );

    const totalListedStock = lots.reduce(
      (sum, lot) => sum + Math.max(0, Number(lot.quantity_kg) || 0),
      0
    );

    const orderValue = orders.reduce(
      (sum, order) => sum + (Number(order.total_amount) || 0),
      0
    );

    const completedOrders = orders.filter((order) =>
      ['completed', 'delivered', 'paid'].includes(
        String(order.status || '').toLowerCase()
      )
    ).length;

    return {
      farmerCount: farmers.length,
      lotCount: lots.length,
      availableStock,
      totalListedStock,
      requestCount: requests.length,
      orderCount: orders.length,
      orderValue,
      completedOrders,
    };
  }, [farmers, lots, requests, orders]);

  const cropReport = useMemo(() => {
    const grouped = new Map();

    lots.forEach((lot) => {
      const crop = String(lot.crop || 'Unknown').trim();
      const key = crop.toLowerCase();

      if (!grouped.has(key)) {
        grouped.set(key, {
          crop,
          lots: 0,
          available: 0,
          listed: 0,
          value: 0,
        });
      }

      const item = grouped.get(key);
      const available = Math.max(0, Number(lot.available_kg) || 0);
      const listed = Math.max(0, Number(lot.quantity_kg) || 0);
      const price = Math.max(0, Number(lot.price_per_kg) || 0);

      item.lots += 1;
      item.available += available;
      item.listed += listed;
      item.value += available * price;
    });

    return [...grouped.values()].sort(
      (a, b) => b.available - a.available
    );
  }, [lots]);

  const locationReport = useMemo(() => {
    const grouped = new Map();

    lots.forEach((lot) => {
      const location = String(lot.location || 'Location not specified').trim();

      if (!grouped.has(location)) {
        grouped.set(location, { location, lots: 0, available: 0 });
      }

      const item = grouped.get(location);
      item.lots += 1;
      item.available += Math.max(0, Number(lot.available_kg) || 0);
    });

    return [...grouped.values()].sort(
      (a, b) => b.available - a.available
    );
  }, [lots]);

  const maxCropStock = Math.max(
    1,
    ...cropReport.map((item) => item.available)
  );

  const maxLocationStock = Math.max(
    1,
    ...locationReport.map((item) => item.available)
  );

  const handleExport = () => {
    const rows = [
      ['AgriDemand AI - Procurement Report'],
      ['Generated on', new Date().toLocaleString('en-IN')],
      [],
      ['Platform Metric', 'Value'],
      ['Registered farmers', stats.farmerCount],
      ['Inventory lots', stats.lotCount],
      ['Available stock (kg)', stats.availableStock],
      ['Total listed stock (kg)', stats.totalListedStock],
      ['Buyer requests', stats.requestCount],
      ['Orders created', stats.orderCount],
      ['Order value (INR)', stats.orderValue],
      [],
      ['Crop', 'Inventory lots', 'Available stock (kg)', 'Listed stock (kg)', 'Indicative inventory value (INR)'],
      ...cropReport.map((item) => [
        item.crop,
        item.lots,
        item.available,
        item.listed,
        item.value,
      ]),
      [],
      ['Location', 'Inventory lots', 'Available stock (kg)'],
      ...locationReport.map((item) => [
        item.location,
        item.lots,
        item.available,
      ]),
    ];

    downloadCsv('agridemand-procurement-report.csv', rows);
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="reports-state">
        <div className="reports-loader" />
        <p>Preparing your procurement reports...</p>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="reports-heading">
        <div>
          <div className="reports-eyebrow">
            <span className="reports-live-dot" />
            AGRIDEMAND AI / ANALYTICS
          </div>
          <h1>Reports <span>& Analytics</span></h1>
          <p>
            A clear view of farmer supply, inventory, buyer demand and
            procurement performance.
          </p>
          <div className="reports-generated">
            <Clock3 size={14} />
            Data overview · {new Date().toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </div>
        </div>

        <div className="reports-actions">
          <button
            className="reports-button reports-button-secondary"
            onClick={() => loadReports(true)}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'reports-spin' : ''} />
            Refresh
          </button>
          <button className="reports-button reports-button-primary" onClick={handleExport}>
            <Download size={16} />
            Export CSV
          </button>
          <button className="reports-print-button" onClick={handlePrint} title="Print report">
            <FileSpreadsheet size={17} />
          </button>
        </div>
      </div>

      {error && (
        <div className="reports-error">
          <AlertCircle size={18} />
          <div>
            <strong>Some report data could not be loaded.</strong>
            <p>{error}</p>
          </div>
          <button onClick={() => loadReports(true)}>Try again</button>
        </div>
      )}

      <div className="reports-section-label">
        <span>PLATFORM PERFORMANCE</span>
        <span className="reports-live-label"><Activity size={13} /> Backend data</span>
      </div>

      <div className="reports-stats-grid">
        <article className="report-stat-card">
          <div className="report-stat-top">
            <span className="report-stat-icon green"><Users size={19} /></span>
            <span className="report-stat-caption">Supply network</span>
          </div>
          <strong>{formatNumber(stats.farmerCount)}</strong>
          <h3>Registered farmers</h3>
          <p>Farmer accounts in the platform</p>
        </article>

        <article className="report-stat-card">
          <div className="report-stat-top">
            <span className="report-stat-icon gold"><Package size={19} /></span>
            <span className="report-stat-caption">Live inventory</span>
          </div>
          <strong>{formatNumber(stats.availableStock)} <small>kg</small></strong>
          <h3>Available produce</h3>
          <p>{formatNumber(stats.lotCount)} inventory lots recorded</p>
        </article>

        <article className="report-stat-card">
          <div className="report-stat-top">
            <span className="report-stat-icon blue"><Sprout size={19} /></span>
            <span className="report-stat-caption">Buyer demand</span>
          </div>
          <strong>{formatNumber(stats.requestCount)}</strong>
          <h3>Buyer requests</h3>
          <p>Procurement requests created</p>
        </article>

        <article className="report-stat-card">
          <div className="report-stat-top">
            <span className="report-stat-icon purple"><IndianRupee size={19} /></span>
            <span className="report-stat-caption">Order pipeline</span>
          </div>
          <strong>{formatCurrency(stats.orderValue)}</strong>
          <h3>Total order value</h3>
          <p>{formatNumber(stats.orderCount)} orders recorded</p>
        </article>
      </div>

      <div className="reports-main-grid">
        <section className="reports-panel reports-crop-panel">
          <div className="reports-panel-heading">
            <div>
              <span className="reports-panel-kicker">SUPPLY BREAKDOWN</span>
              <h2>Crop-wise inventory</h2>
              <p>Available stock grouped by crop.</p>
            </div>
            <span className="reports-panel-icon"><BarChart3 size={20} /></span>
          </div>

          {cropReport.length === 0 ? (
            <div className="reports-empty">
              <Package size={25} />
              <strong>No inventory data yet</strong>
              <span>Farmer listings will appear here when added.</span>
            </div>
          ) : (
            <div className="reports-bars">
              {cropReport.map((item) => (
                <div className="reports-bar-item" key={item.crop}>
                  <div className="reports-bar-label">
                    <strong>{item.crop}</strong>
                    <span>{formatNumber(item.available)} kg</span>
                  </div>
                  <div className="reports-bar-track">
                    <div
                      className="reports-bar-fill"
                      style={{
                        width: `${Math.max(2, (item.available / maxCropStock) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="reports-bar-meta">
                    {item.lots} lots · {formatNumber(item.listed)} kg listed
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="reports-panel reports-summary-panel">
          <div className="reports-panel-heading">
            <div>
              <span className="reports-panel-kicker">PROCUREMENT OVERVIEW</span>
              <h2>Business summary</h2>
              <p>Current platform activity.</p>
            </div>
            <span className="reports-panel-icon"><TrendingUp size={20} /></span>
          </div>

          <div className="reports-summary-list">
            <div className="reports-summary-row">
              <span className="reports-summary-icon green"><Users size={17} /></span>
              <div><strong>Farmers onboarded</strong><small>Registered farmer accounts</small></div>
              <b>{formatNumber(stats.farmerCount)}</b>
            </div>
            <div className="reports-summary-row">
              <span className="reports-summary-icon gold"><Package size={17} /></span>
              <div><strong>Inventory lots</strong><small>Total produce listings</small></div>
              <b>{formatNumber(stats.lotCount)}</b>
            </div>
            <div className="reports-summary-row">
              <span className="reports-summary-icon blue"><Sprout size={17} /></span>
              <div><strong>Buyer demand</strong><small>Requests received</small></div>
              <b>{formatNumber(stats.requestCount)}</b>
            </div>
            <div className="reports-summary-row">
              <span className="reports-summary-icon purple"><CheckCircle2 size={17} /></span>
              <div><strong>Completed orders</strong><small>Marked completed, delivered or paid</small></div>
              <b>{formatNumber(stats.completedOrders)}</b>
            </div>
          </div>

          <div className="reports-value-card">
            <span>Total order value recorded</span>
            <strong>{formatCurrency(stats.orderValue)}</strong>
            <small>Based on orders currently stored in the backend</small>
          </div>
        </section>
      </div>

      <div className="reports-bottom-grid">
        <section className="reports-panel">
          <div className="reports-panel-heading">
            <div>
              <span className="reports-panel-kicker">GEOGRAPHIC DISTRIBUTION</span>
              <h2>Supply by location</h2>
              <p>Available inventory across recorded farmer locations.</p>
            </div>
            <span className="reports-panel-icon"><Sprout size={20} /></span>
          </div>

          {locationReport.length === 0 ? (
            <div className="reports-empty">
              <Sprout size={25} />
              <strong>No location data yet</strong>
              <span>Locations will appear when produce lots are listed.</span>
            </div>
          ) : (
            <div className="reports-location-list">
              {locationReport.map((item) => (
                <div className="reports-location-item" key={item.location}>
                  <div className="reports-location-info">
                    <strong>{item.location}</strong>
                    <span>{item.lots} lots</span>
                  </div>
                  <div className="reports-location-progress">
                    <div style={{ width: `${Math.max(2, (item.available / maxLocationStock) * 100)}%` }} />
                  </div>
                  <b>{formatNumber(item.available)} kg</b>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="reports-panel reports-stock-panel">
          <div className="reports-panel-heading">
            <div>
              <span className="reports-panel-kicker">INVENTORY HEALTH</span>
              <h2>Stock snapshot</h2>
              <p>Listed quantity versus currently available quantity.</p>
            </div>
            <span className="reports-panel-icon"><Activity size={20} /></span>
          </div>

          <div className="reports-stock-number">
            <strong>{formatNumber(stats.availableStock)} <small>kg</small></strong>
            <span>Available now</span>
          </div>
          <div className="reports-stock-track">
            <div
              style={{
                width: `${stats.totalListedStock > 0
                  ? Math.min(100, (stats.availableStock / stats.totalListedStock) * 100)
                  : 0}%`,
              }}
            />
          </div>
          <div className="reports-stock-legend">
            <span><i className="stock-dot available-dot" /> Available: {formatNumber(stats.availableStock)} kg</span>
            <span><i className="stock-dot listed-dot" /> Listed: {formatNumber(stats.totalListedStock)} kg</span>
          </div>
          <div className="reports-stock-footnote">
            <AlertCircle size={14} />
            Available stock is calculated from current lot balances. Listed stock is the original quantity recorded across lots.
          </div>
        </section>
      </div>

      <section className="reports-panel reports-table-panel">
        <div className="reports-panel-heading">
          <div>
            <span className="reports-panel-kicker">DETAILED INVENTORY</span>
            <h2>Crop performance table</h2>
            <p>Stock and indicative listing value by crop.</p>
          </div>
          <button className="reports-export-link" onClick={handleExport}>
            <ArrowDownToLine size={15} /> Download data
          </button>
        </div>

        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Crop</th>
                <th>Inventory lots</th>
                <th>Listed stock</th>
                <th>Available stock</th>
                <th>Indicative value</th>
              </tr>
            </thead>
            <tbody>
              {cropReport.length === 0 ? (
                <tr><td colSpan="5" className="reports-table-empty">No crop records available.</td></tr>
              ) : (
                cropReport.map((item) => (
                  <tr key={item.crop}>
                    <td><span className="reports-crop-name"><Sprout size={15} /> {item.crop}</span></td>
                    <td>{formatNumber(item.lots)}</td>
                    <td>{formatNumber(item.listed)} kg</td>
                    <td><strong>{formatNumber(item.available)} kg</strong></td>
                    <td>{formatCurrency(item.value)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="reports-disclaimer">
        <AlertCircle size={15} />
        <span>
          Report values are calculated from current backend records. Indicative inventory value uses farmer listing prices multiplied by available stock; it is not verified mandi pricing, realized revenue, or profit.
        </span>
      </div>
    </div>
  );
}

export default Reports;
