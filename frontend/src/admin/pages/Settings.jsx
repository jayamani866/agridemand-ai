
import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Bell,
  Check,
  CircleHelp,
  Cloud,
  Database,
  Leaf,
  Lock,
  RefreshCw,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Wifi,
} from 'lucide-react';
import './Settings.css';

const STORAGE_KEY = 'agridemand-admin-settings';

const defaultSettings = {
  platformName: 'AgriDemand AI',
  description: 'Intelligent agricultural commerce',
  contactEmail: '',
  contactPhone: '',
  emailNotifications: true,
  orderAlerts: true,
  buyerRequestAlerts: true,
  inventoryAlerts: true,
  lowStockThreshold: 100,
  defaultCurrency: 'INR',
  defaultUnit: 'kg',
  requireGrade: true,
};

function readSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved
      ? { ...defaultSettings, ...JSON.parse(saved) }
      : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function Settings() {
  const [settings, setSettings] = useState(readSettings);
  const [savedMessage, setSavedMessage] = useState('');
  const [health, setHealth] = useState('checking');
  const [healthMessage, setHealthMessage] = useState('Checking backend connection...');
  const [checking, setChecking] = useState(false);

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSavedMessage('');
  };

  const saveSettings = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSavedMessage('Your preferences have been saved on this browser.');
    } catch {
      setSavedMessage('Unable to save settings in this browser.');
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSavedMessage('Settings restored to their default values.');
    } catch {
      setSavedMessage('Unable to reset browser settings.');
    }
  };

  const checkBackend = useCallback(async () => {
    setChecking(true);
    setHealth('checking');
    setHealthMessage('Checking backend connection...');

    try {
      const response = await fetch('http://127.0.0.1:8002/health');
      if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
      }

      const data = await response.json();
      setHealth('online');
      setHealthMessage(
        data.status ? `Backend response: ${data.status}` : 'Backend is responding.'
      );
    } catch (error) {
      setHealth('offline');
      setHealthMessage(
        error instanceof Error ? error.message : 'Backend connection failed.'
      );
    } finally {
      setChecking(false);
    }
  }, []);

  
  useEffect(() => {
    let cancelled = false;

    const fetchBackendStatus = async () => {
        try {
        const response = await fetch('http://127.0.0.1:8002/health');

        if (!response.ok) {
            throw new Error(`Backend returned HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!cancelled) {
            setHealth('online');
            setHealthMessage(
            data.status
                ? `Backend response: ${data.status}`
                : 'Backend is responding.'
            );
        }
        } catch (error) {
        if (!cancelled) {
            setHealth('offline');
            setHealthMessage(
            error instanceof Error
                ? error.message
                : 'Backend connection failed.'
            );
        }
        }
    };

    fetchBackendStatus();

    return () => {
        cancelled = true;
    };
    }, []);


  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <div className="settings-eyebrow">
            <span />
            AGRIDEMAND AI / CONFIGURATION
          </div>
          <h1>Platform <span>Settings</span></h1>
          <p>Manage your workspace preferences and platform configuration.</p>
        </div>

        <div className="settings-header-actions">
          <button
            className="settings-btn settings-reset-btn"
            onClick={resetSettings}
          >
            <RotateCcw size={15} />
            Reset
          </button>
          <button
            className="settings-btn settings-save-btn"
            onClick={saveSettings}
          >
            <Save size={16} />
            Save changes
          </button>
        </div>
      </div>

      {savedMessage && (
        <div className="settings-feedback">
          <Check size={16} />
          {savedMessage}
        </div>
      )}

      <div className="settings-layout">
        <aside className="settings-side-nav">
          <span className="settings-nav-label">CONFIGURATION</span>
          <a href="#platform-profile"><UserRound size={16} /> Platform profile</a>
          <a href="#notifications"><Bell size={16} /> Notifications</a>
          <a href="#inventory-rules"><SlidersHorizontal size={16} /> Inventory rules</a>
          <a href="#appearance"><SettingsIcon size={16} /> Appearance</a>
          <a href="#system-status"><Activity size={16} /> System status</a>

          <div className="settings-help-card">
            <CircleHelp size={19} />
            <strong>Need help?</strong>
            <p>Review your platform configuration before launching.</p>
          </div>
        </aside>

        <div className="settings-content">
          <section className="settings-card" id="platform-profile">
            <div className="settings-card-heading">
              <div className="settings-heading-icon green">
                <UserRound size={19} />
              </div>
              <div>
                <h2>Platform profile</h2>
                <p>Basic information about your AgriDemand workspace.</p>
              </div>
            </div>

            <div className="settings-form-grid">
              <label className="settings-field">
                <span>Platform name</span>
                <input
                  value={settings.platformName}
                  onChange={(event) => updateSetting('platformName', event.target.value)}
                  placeholder="Enter platform name"
                  maxLength={80}
                />
              </label>

              <label className="settings-field">
                <span>Contact email</span>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(event) => updateSetting('contactEmail', event.target.value)}
                  placeholder="admin@example.com"
                />
              </label>

              <label className="settings-field">
                <span>Contact phone</span>
                <input
                  type="tel"
                  value={settings.contactPhone}
                  onChange={(event) => updateSetting('contactPhone', event.target.value)}
                  placeholder="Enter contact number"
                />
              </label>

              <label className="settings-field">
                <span>Platform description</span>
                <input
                  value={settings.description}
                  onChange={(event) => updateSetting('description', event.target.value)}
                  placeholder="Describe your platform"
                  maxLength={120}
                />
              </label>
            </div>
          </section>

          <section className="settings-card" id="notifications">
            <div className="settings-card-heading">
              <div className="settings-heading-icon purple">
                <Bell size={19} />
              </div>
              <div>
                <h2>Notification preferences</h2>
                <p>Choose which activity alerts you want to enable.</p>
              </div>
            </div>

            <div className="settings-options">
              <div className="settings-option">
                <div>
                  <strong>Email notifications</strong>
                  <p>Master preference for email notification settings.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.emailNotifications}
                  className={`settings-switch ${settings.emailNotifications ? 'is-on' : ''}`}
                  onClick={() => updateSetting('emailNotifications', !settings.emailNotifications)}
                >
                  <span />
                </button>
              </div>

              <div className="settings-option">
                <div>
                  <strong>Order alerts</strong>
                  <p>Receive alerts when new orders are created.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.orderAlerts}
                  className={`settings-switch ${settings.orderAlerts ? 'is-on' : ''}`}
                  onClick={() => updateSetting('orderAlerts', !settings.orderAlerts)}
                >
                  <span />
                </button>
              </div>

              <div className="settings-option">
                <div>
                  <strong>Buyer request alerts</strong>
                  <p>Get notified when buyers submit procurement requests.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.buyerRequestAlerts}
                  className={`settings-switch ${settings.buyerRequestAlerts ? 'is-on' : ''}`}
                  onClick={() => updateSetting('buyerRequestAlerts', !settings.buyerRequestAlerts)}
                >
                  <span />
                </button>
              </div>

              <div className="settings-option">
                <div>
                  <strong>Inventory alerts</strong>
                  <p>Enable low-stock notification preferences.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.inventoryAlerts}
                  className={`settings-switch ${settings.inventoryAlerts ? 'is-on' : ''}`}
                  onClick={() => updateSetting('inventoryAlerts', !settings.inventoryAlerts)}
                >
                  <span />
                </button>
              </div>
            </div>
          </section>

          <section className="settings-card" id="inventory-rules">
            <div className="settings-card-heading">
              <div className="settings-heading-icon gold">
                <Leaf size={19} />
              </div>
              <div>
                <h2>Inventory configuration</h2>
                <p>Set default units and inventory alert preferences.</p>
              </div>
            </div>

            <div className="settings-form-grid">
              <label className="settings-field">
                <span>Default currency</span>
                <select
                  value={settings.defaultCurrency}
                  onChange={(event) => updateSetting('defaultCurrency', event.target.value)}
                >
                  <option value="INR">INR – Indian Rupee</option>
                </select>
              </label>

              <label className="settings-field">
                <span>Default inventory unit</span>
                <select
                  value={settings.defaultUnit}
                  onChange={(event) => updateSetting('defaultUnit', event.target.value)}
                >
                  <option value="kg">Kilogram (kg)</option>
                  <option value="tonne">Metric tonne</option>
                  <option value="quintal">Quintal</option>
                </select>
              </label>

              <label className="settings-field">
                <span>Low-stock threshold (kg)</span>
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  value={settings.lowStockThreshold}
                  onChange={(event) =>
                    updateSetting('lowStockThreshold', Math.max(1, Number(event.target.value) || 1))
                  }
                />
                <small>Preference only; backend alerts are not configured yet.</small>
              </label>
            </div>

            <div className="settings-option settings-grade-option">
              <div>
                <strong>Require produce grade</strong>
                <p>Prefer grade information when creating inventory listings.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.requireGrade}
                className={`settings-switch ${settings.requireGrade ? 'is-on' : ''}`}
                onClick={() => updateSetting('requireGrade', !settings.requireGrade)}
              >
                <span />
              </button>
            </div>
          </section>

          <section className="settings-card" id="appearance">
            <div className="settings-card-heading">
              <div className="settings-heading-icon blue">
                <SettingsIcon size={19} />
              </div>
              <div>
                <h2>Appearance</h2>
                <p>Choose the visual theme for your workspace.</p>
              </div>
            </div>

            <div className="settings-appearance-info">
              <div className="settings-theme-preview dark-preview">
                <span />
                <span />
                <span />
              </div>
              <div>
                <strong>Dark / Light mode</strong>
                <p>Use the theme control in the top navigation bar to switch the entire application theme.</p>
              </div>
              <span className="settings-managed-label">Header control</span>
            </div>
          </section>

          <section className="settings-card" id="system-status">
            <div className="settings-card-heading">
              <div className="settings-heading-icon green">
                <Activity size={19} />
              </div>
              <div>
                <h2>System status</h2>
                <p>Check the availability of your local application services.</p>
              </div>
            </div>

            <div className="settings-system-row">
              <div className="settings-system-icon"><Database size={18} /></div>
              <div className="settings-system-info">
                <strong>Backend API</strong>
                <p>http://127.0.0.1:8002/health</p>
              </div>
              <span className={`settings-status-pill ${health}`}>
                <i />
                {health === 'online' ? 'Online' : health === 'offline' ? 'Offline' : 'Checking'}
              </span>
            </div>

            <div className="settings-system-row">
              <div className="settings-system-icon"><Wifi size={18} /></div>
              <div className="settings-system-info">
                <strong>Frontend application</strong>
                <p>Current browser session</p>
              </div>
              <span className="settings-status-pill online"><i /> Active</span>
            </div>

            <div className="settings-system-row">
              <div className="settings-system-icon"><ShieldCheck size={18} /></div>
              <div className="settings-system-info">
                <strong>Authentication</strong>
                <p>Secure admin authentication is not configured yet.</p>
              </div>
              <span className="settings-status-pill pending"><i /> Pending</span>
            </div>

            <div className="settings-health-footer">
              <span className="settings-health-message">
                <Cloud size={14} />
                {healthMessage}
              </span>
              <button
                className="settings-check-btn"
                onClick={checkBackend}
                disabled={checking}
              >
                <RefreshCw size={14} className={checking ? 'settings-spin' : ''} />
                Check again
              </button>
            </div>
          </section>

          <div className="settings-bottom-note">
            <Lock size={14} />
            Preferences are stored locally in this browser. They are not yet synchronized across admin devices or user accounts.
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
