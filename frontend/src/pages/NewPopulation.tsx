import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { populationApi } from '../services/api';
import type { PopulationCreate } from '../services/api';

export default function NewPopulation() {
  const navigate = useNavigate();
  
  // Check for template data in sessionStorage
  const templateDataStr = sessionStorage.getItem('templateData');
  const templateData = templateDataStr ? JSON.parse(templateDataStr) : null;
  if (templateDataStr) {
    sessionStorage.removeItem('templateData');
  }
  
  const [formData, setFormData] = useState<PopulationCreate>(templateData || {
    name: '',
    description: '',
    size: 100,
    config: {
      modules: [],
      age_range: [0, 90],
      gender_distribution: { M: 0.5, F: 0.5 },
      export_fhir: true,
      export_csv: false,
      export_ccda: false,
      state: 'Massachusetts',
    }
  });

  const createMutation = useMutation({
    mutationFn: populationApi.create,
    onSuccess: (data) => {
      // Start generation immediately
      populationApi.startGeneration(data.id).then(() => {
        navigate(`/population/${data.id}`);
      });
    },
    onError: (error) => {
      console.error('Failed to create population:', error);
      alert('Failed to create population');
    }
  });

  const availableModules = [
    'diabetes', 'hypertension', 'heart_disease', 'asthma', 
    'copd', 'cancer', 'metabolic_syndrome', 'allergies',
    'mental_health', 'childhood_obesity', 'stroke', 'atrial_fibrillation'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Please enter a population name');
      return;
    }
    createMutation.mutate(formData);
  };

  const updateConfig = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value
      }
    }));
  };

  const toggleModule = (module: string) => {
    const modules = formData.config.modules || [];
    const newModules = modules.includes(module)
      ? modules.filter(m => m !== module)
      : [...modules, module];
    updateConfig('modules', newModules);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Create New Population</h2>
        <p className="mt-1 text-sm text-gray-600">
          Configure and generate a new synthetic patient population
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow rounded-lg p-6">
        {/* Basic Info */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Population Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Diabetes Study Q1 2024"
                required
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
                placeholder="Describe the purpose of this population..."
              />
            </div>

            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700">
                Population Size
              </label>
              <input
                type="number"
                id="size"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: parseInt(e.target.value) })}
                min="1"
                max="10000"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Number of patients to generate (1-10,000)</p>
            </div>
          </div>
        </div>

        {/* Demographics */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Demographics</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Age Range</label>
              <div className="mt-1 grid grid-cols-2 gap-4">
                <input
                  type="number"
                  value={formData.config.age_range?.[0] || 0}
                  onChange={(e) => updateConfig('age_range', [parseInt(e.target.value), formData.config.age_range?.[1] || 90])}
                  min="0"
                  max="100"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Min age"
                />
                <input
                  type="number"
                  value={formData.config.age_range?.[1] || 90}
                  onChange={(e) => updateConfig('age_range', [formData.config.age_range?.[0] || 0, parseInt(e.target.value)])}
                  min="0"
                  max="100"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Max age"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Gender Distribution</label>
              <div className="mt-1 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Male %</label>
                  <input
                    type="range"
                    value={(formData.config.gender_distribution?.M || 0.5) * 100}
                    onChange={(e) => {
                      const male = parseInt(e.target.value) / 100;
                      updateConfig('gender_distribution', { M: male, F: 1 - male });
                    }}
                    min="0"
                    max="100"
                    className="block w-full"
                  />
                  <span className="text-sm text-gray-600">
                    {Math.round((formData.config.gender_distribution?.M || 0.5) * 100)}%
                  </span>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Female %</label>
                  <input
                    type="range"
                    value={(formData.config.gender_distribution?.F || 0.5) * 100}
                    disabled
                    min="0"
                    max="100"
                    className="block w-full"
                  />
                  <span className="text-sm text-gray-600">
                    {Math.round((formData.config.gender_distribution?.F || 0.5) * 100)}%
                  </span>
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
                value={formData.config.state || ''}
                onChange={(e) => updateConfig('state', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Massachusetts"
              />
            </div>
          </div>
        </div>

        {/* Disease Modules */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Disease Modules</h3>
          <p className="text-sm text-gray-600 mb-3">Select conditions to include in the population</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableModules.map(module => (
              <label key={module} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.config.modules?.includes(module) || false}
                  onChange={() => toggleModule(module)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">
                  {module.replace(/_/g, ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Export Formats */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Export Formats</h3>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.config.export_fhir}
                onChange={(e) => updateConfig('export_fhir', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">FHIR JSON Bundles</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.config.export_csv}
                onChange={(e) => updateConfig('export_csv', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">CSV Tables</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.config.export_ccda}
                onChange={(e) => updateConfig('export_ccda', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">C-CDA XML Documents</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? 'Creating...' : 'Create & Generate'}
          </button>
        </div>
      </form>
    </div>
  );
}