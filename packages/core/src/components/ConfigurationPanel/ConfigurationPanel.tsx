import React, { useState, useEffect } from 'react';
import { useSyntheaConfig } from '../../contexts/SyntheaContext';
import './ConfigurationPanel.css';

interface EHRSettings {
  fhir: {
    version: string;
    output_format: string;
    default_page_size: number;
    max_page_size: number;
  };
  simulator: {
    auto_import: boolean;
    default_population_size: number;
    enable_websocket: boolean;
  };
}

interface ConfigurationPanelProps {
  apiUrl?: string;
  mode?: 'standalone' | 'embedded';
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  apiUrl = '',
  mode = 'standalone',
}) => {
  const config = useSyntheaConfig();
  const baseUrl = apiUrl || config.apiUrl;
  const [settings, setSettings] = useState<EHRSettings>({
    fhir: {
      version: 'R4',
      output_format: 'json',
      default_page_size: 20,
      max_page_size: 100,
    },
    simulator: {
      auto_import: true,
      default_population_size: 10,
      enable_websocket: true,
    },
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch current settings
  const fetchSettings = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/config/settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  // Update settings
  const updateSettings = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const response = await fetch(`${baseUrl}/api/config/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div className="configuration-panel">
      <div className="config-header">
        <h2>System Configuration</h2>
        <p>Configure EHR Simulator settings</p>
      </div>

      <div className="config-sections">
        {/* FHIR Configuration */}
        <div className="config-section">
          <h3>FHIR Settings</h3>
          <div className="config-grid">
            <div className="config-item">
              <label htmlFor="fhir-version">FHIR Version</label>
              <select
                id="fhir-version"
                value={settings.fhir?.version || 'R4'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    fhir: { ...settings.fhir, version: e.target.value },
                  })
                }
                className="config-select"
              >
                <option value="R4">R4 (Current)</option>
                <option value="STU3">STU3</option>
                <option value="DSTU2">DSTU2</option>
              </select>
            </div>

            <div className="config-item">
              <label htmlFor="output-format">Output Format</label>
              <select
                id="output-format"
                value={settings.fhir?.output_format || 'json'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    fhir: { ...settings.fhir, output_format: e.target.value },
                  })
                }
                className="config-select"
              >
                <option value="json">JSON</option>
                <option value="xml">XML</option>
              </select>
            </div>

            <div className="config-item">
              <label htmlFor="default-page-size">Default Page Size</label>
              <input
                id="default-page-size"
                type="number"
                min="1"
                max="100"
                value={settings.fhir?.default_page_size || 20}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    fhir: {
                      ...settings.fhir,
                      default_page_size: parseInt(e.target.value) || 20,
                    },
                  })
                }
                className="config-input"
              />
            </div>

            <div className="config-item">
              <label htmlFor="max-page-size">Max Page Size</label>
              <input
                id="max-page-size"
                type="number"
                min="1"
                max="1000"
                value={settings.fhir?.max_page_size || 100}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    fhir: {
                      ...settings.fhir,
                      max_page_size: parseInt(e.target.value) || 100,
                    },
                  })
                }
                className="config-input"
              />
            </div>
          </div>
        </div>

        {/* Simulator Configuration */}
        <div className="config-section">
          <h3>Simulator Settings</h3>
          <div className="config-grid">
            <div className="config-item">
              <label htmlFor="auto-import">
                <input
                  id="auto-import"
                  type="checkbox"
                  checked={settings.simulator?.auto_import ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      simulator: {
                        ...settings.simulator,
                        auto_import: e.target.checked,
                      },
                    })
                  }
                  className="config-checkbox"
                />
                Auto-import generated patients
              </label>
            </div>

            <div className="config-item">
              <label htmlFor="default-pop-size">Default Population Size</label>
              <input
                id="default-pop-size"
                type="number"
                min="1"
                max="1000"
                value={settings.simulator?.default_population_size || 10}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    simulator: {
                      ...settings.simulator,
                      default_population_size: parseInt(e.target.value) || 10,
                    },
                  })
                }
                className="config-input"
              />
            </div>

            <div className="config-item">
              <label htmlFor="enable-websocket">
                <input
                  id="enable-websocket"
                  type="checkbox"
                  checked={settings.simulator?.enable_websocket ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      simulator: {
                        ...settings.simulator,
                        enable_websocket: e.target.checked,
                      },
                    })
                  }
                  className="config-checkbox"
                />
                Enable WebSocket updates
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="config-actions">
        <button
          onClick={fetchSettings}
          className="btn-secondary"
          disabled={loading}
        >
          Reset
        </button>
        <button
          onClick={updateSettings}
          className="btn-primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span className="save-success">✓ Settings saved</span>}
      </div>
    </div>
  );
}