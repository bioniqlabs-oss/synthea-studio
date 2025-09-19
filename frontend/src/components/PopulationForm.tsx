/**
 * Population Form Component
 */

import React, { useState } from 'react';

interface PopulationFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function PopulationForm({ onSubmit, onCancel, isLoading }: PopulationFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    size: 10,
    config: {
      state: 'Massachusetts',
      city: '',
      export_fhir: true,
      export_csv: true,
      export_ccda: true,
      age_range: [0, 100],
      gender_distribution: { M: 0.5, F: 0.5 },
      modules: [] as string[],
      // Advanced options
      seed: '',
      clinician_seed: '',
      reference_date: '',
      end_date: '',
      overflow_population: 0,
    },
  });

  const availableModules = [
    'allergies',
    'cardiovascular_disease',
    'covid19',
    'diabetes',
    'lung_cancer',
    'metabolic_syndrome',
    'opioid_addiction',
    'rheumatoid_arthritis',
    'veteran',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleModuleToggle = (module: string) => {
    setFormData((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        modules: prev.config.modules.includes(module)
          ? prev.config.modules.filter((m) => m !== module)
          : [...prev.config.modules, module],
      },
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Population Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          placeholder="e.g., Boston Diabetes Study"
        />
      </div>

      {/* Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Population Size
        </label>
        <input
          type="number"
          value={formData.size}
          onChange={(e) => setFormData({ ...formData, size: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          min="1"
          max="10000"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Number of patients to generate (1-10000)</p>
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input
            type="text"
            value={formData.config.state}
            onChange={(e) =>
              setFormData({
                ...formData,
                config: { ...formData.config, state: e.target.value },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Massachusetts"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City (Optional)
          </label>
          <input
            type="text"
            value={formData.config.city}
            onChange={(e) =>
              setFormData({
                ...formData,
                config: { ...formData.config, city: e.target.value },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Boston"
          />
        </div>
      </div>

      {/* Age Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Age Range</label>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            value={formData.config.age_range[0]}
            onChange={(e) =>
              setFormData({
                ...formData,
                config: {
                  ...formData.config,
                  age_range: [parseInt(e.target.value), formData.config.age_range[1]],
                },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            max="100"
            placeholder="Min age"
          />
          <input
            type="number"
            value={formData.config.age_range[1]}
            onChange={(e) =>
              setFormData({
                ...formData,
                config: {
                  ...formData.config,
                  age_range: [formData.config.age_range[0], parseInt(e.target.value)],
                },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            max="100"
            placeholder="Max age"
          />
        </div>
      </div>

      {/* Export Formats */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Export Formats
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.config.export_fhir}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: { ...formData.config, export_fhir: e.target.checked },
                })
              }
              className="mr-2"
            />
            <span className="text-sm">FHIR R4 (JSON)</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.config.export_csv}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: { ...formData.config, export_csv: e.target.checked },
                })
              }
              className="mr-2"
            />
            <span className="text-sm">CSV</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.config.export_ccda}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: { ...formData.config, export_ccda: e.target.checked },
                })
              }
              className="mr-2"
            />
            <span className="text-sm">CCDA (XML)</span>
          </label>
        </div>
      </div>

      {/* Disease Modules */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Disease Modules (Optional)
        </label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
          {availableModules.map((module) => (
            <label key={module} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.config.modules.includes(module)}
                onChange={() => handleModuleToggle(module)}
                className="mr-2"
              />
              <span className="text-sm capitalize">{module.replace(/_/g, ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Advanced Options */}
      <div className="pt-4 border-t">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {showAdvanced ? '▼ Hide' : '▶ Show'} Advanced Options
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Random Seed
                </label>
                <input
                  type="text"
                  value={formData.config.seed}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, seed: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 12345"
                />
                <p className="text-xs text-gray-500 mt-1">For reproducible generation</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinician Seed
                </label>
                <input
                  type="text"
                  value={formData.config.clinician_seed}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, clinician_seed: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 67890"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Date
                </label>
                <input
                  type="date"
                  value={formData.config.reference_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, reference_date: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Start date for generation</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.config.end_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, end_date: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Overflow Population
              </label>
              <input
                type="number"
                value={formData.config.overflow_population}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, overflow_population: parseInt(e.target.value) || 0 },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Additional synthetic records beyond the target population
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Population'}
        </button>
      </div>
    </form>
  );
}