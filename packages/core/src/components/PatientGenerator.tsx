import React, { useState } from 'react';
import { useGenerator } from '../hooks/useGenerator';
import { useSyntheaConfig } from '../contexts/SyntheaContext';

interface PatientGeneratorProps {
  onSuccess?: () => void;
}

export const PatientGenerator: React.FC<PatientGeneratorProps> = ({ onSuccess }) => {
  const config = useSyntheaConfig();
  const { generatePopulation, isGenerating } = useGenerator();

  const [formData, setFormData] = useState({
    name: `Population ${new Date().toISOString().split('T')[0]}`,
    description: 'Generated synthetic patient population',
    size: 10,
    config: {
      modules: [] as string[],
      age_range: [0, 100] as [number, number],
      gender_distribution: { M: 0.5, F: 0.5 },
      state: 'Massachusetts',
      city: '',
      export_fhir: true,
      export_csv: false,
      export_ccda: false,
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Submitting form with data:', formData);

    try {
      // Clean up config - remove empty strings for city/state
      const cleanConfig = {
        ...formData.config,
        city: formData.config.city?.trim() || undefined,
        state: formData.config.state?.trim() || 'Massachusetts',
      };

      const population = await generatePopulation({
        name: formData.name,
        description: formData.description,
        size: formData.size,
        config: cleanConfig,
      });

      console.log('Population created:', population);

      if (population) {
        config.callbacks.onPopulationCreated?.(population);
        onSuccess?.();
        // Reset form
        setFormData({
          name: `Population ${new Date().toISOString().split('T')[0]}`,
          description: 'Generated synthetic patient population',
          size: 10,
          config: {
            modules: [],
            age_range: [0, 100],
            gender_distribution: { M: 0.5, F: 0.5 },
            state: 'Massachusetts',
            city: '',
            export_fhir: true,
            export_csv: false,
            export_ccda: false,
          }
        });
      }
    } catch (error) {
      console.error('Failed to generate population:', error);
      alert(`Failed to generate population: ${error}`);
    }
  };

  const availableModules = [
    'allergies',
    'asthma',
    'cardiovascular_disease',
    'chronic_kidney_disease',
    'copd',
    'covid19',
    'dementia',
    'diabetes',
    'fibromyalgia',
    'hypertension',
    'metabolic_syndrome',
    'opioid_addiction',
    'pregnancy',
    'rheumatoid_arthritis',
    'total_joint_replacement',
  ];

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create New Population</h2>
        <p className="mt-1 text-sm text-gray-600">
          Configure and generate a new synthetic patient population
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow rounded-lg p-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Population Name
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Diabetes Study 2024"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Describe the purpose and characteristics of this population..."
              />
            </div>

            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700">
                Population Size
              </label>
              <input
                type="number"
                id="size"
                required
                min="1"
                max="10000"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: parseInt(e.target.value) || 1 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">Number of patients to generate (1-10000)</p>
            </div>
          </div>
        </div>

        {/* Demographics */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Demographics</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Age Range</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.config.age_range[0]}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      age_range: [parseInt(e.target.value) || 0, formData.config.age_range[1]]
                    }
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Min"
                />
                <span className="self-center">to</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.config.age_range[1]}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: {
                      ...formData.config,
                      age_range: [formData.config.age_range[0], parseInt(e.target.value) || 100]
                    }
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Max"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Gender Distribution</label>
              <div className="mt-1 flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.config.gender_distribution.M}
                    onChange={(e) => {
                      const male = parseFloat(e.target.value) || 0;
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          gender_distribution: { M: male, F: 1 - male }
                        }
                      });
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <span className="text-xs text-gray-500">Male</span>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.config.gender_distribution.F}
                    onChange={(e) => {
                      const female = parseFloat(e.target.value) || 0;
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          gender_distribution: { M: 1 - female, F: female }
                        }
                      });
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <span className="text-xs text-gray-500">Female</span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                State
              </label>
              <input
                type="text"
                id="state"
                value={formData.config.state}
                onChange={(e) => setFormData({
                  ...formData,
                  config: { ...formData.config, state: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Massachusetts"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                type="text"
                id="city"
                value={formData.config.city}
                onChange={(e) => setFormData({
                  ...formData,
                  config: { ...formData.config, city: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Boston"
              />
            </div>
          </div>
        </div>

        {/* Disease Modules */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Disease Modules</h3>
          <p className="text-sm text-gray-500 mb-3">Select which conditions to include in the population</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableModules.map((module) => (
              <label key={module} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.config.modules.includes(module)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          modules: [...formData.config.modules, module]
                        }
                      });
                    } else {
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          modules: formData.config.modules.filter(m => m !== module)
                        }
                      });
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {module.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Export Formats */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Export Formats</h3>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.config.export_fhir}
                onChange={(e) => setFormData({
                  ...formData,
                  config: { ...formData.config, export_fhir: e.target.checked }
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">FHIR (Fast Healthcare Interoperability Resources)</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.config.export_csv}
                onChange={(e) => setFormData({
                  ...formData,
                  config: { ...formData.config, export_csv: e.target.checked }
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">CSV (Comma-Separated Values)</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.config.export_ccda}
                onChange={(e) => setFormData({
                  ...formData,
                  config: { ...formData.config, export_ccda: e.target.checked }
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">C-CDA (Consolidated Clinical Document Architecture)</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => onSuccess?.()}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isGenerating || !formData.name.trim()}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Creating...' : 'Create Population'}
          </button>
        </div>
      </form>
    </div>
  );
};