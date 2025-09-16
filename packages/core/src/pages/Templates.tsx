import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { createPopulation, startGeneration } from '../services/api';
import { useSyntheaConfig } from '../contexts/SyntheaContext';

const templates = [
  {
    id: 'diabetes-study',
    name: 'Diabetes Study Population',
    description: 'Population focused on Type 2 diabetes with common comorbidities',
    icon: '🩺',
    config: {
      size: 100,
      modules: ['diabetes', 'hypertension', 'metabolic_syndrome'],
      age_range: [40, 75] as [number, number],
      gender_distribution: { M: 0.5, F: 0.5 },
      export_fhir: true,
    },
    features: [
      'Type 2 diabetes focus',
      'Common comorbidities included',
      'Age range: 40-75 years',
      'Includes hypertension & metabolic syndrome',
    ],
  },
  {
    id: 'pediatric-asthma',
    name: 'Pediatric Asthma Study',
    description: 'Children and adolescents with asthma and allergies',
    icon: '👶',
    config: {
      size: 50,
      modules: ['asthma', 'allergies'],
      age_range: [5, 17] as [number, number],
      gender_distribution: { M: 0.5, F: 0.5 },
      export_fhir: true,
    },
    features: [
      'Pediatric population (5-17 years)',
      'Asthma and allergy conditions',
      'School-age children focus',
      'Inhaler prescription patterns',
    ],
  },
  {
    id: 'elderly-care',
    name: 'Elderly Care Population',
    description: 'Geriatric population with multiple chronic conditions',
    icon: '👴',
    config: {
      size: 75,
      modules: ['dementia', 'hypertension', 'cardiovascular_disease', 'chronic_kidney_disease'],
      age_range: [65, 95] as [number, number],
      gender_distribution: { M: 0.45, F: 0.55 },
      export_fhir: true,
    },
    features: [
      'Geriatric focus (65+ years)',
      'Multiple chronic conditions',
      'Dementia and cognitive decline',
      'Polypharmacy patterns',
    ],
  },
  {
    id: 'covid-impact',
    name: 'COVID-19 Impact Study',
    description: 'Population for studying COVID-19 impact across demographics',
    icon: '🦠',
    config: {
      size: 200,
      modules: ['covid19', 'asthma', 'cardiovascular_disease', 'diabetes'],
      age_range: [18, 80] as [number, number],
      gender_distribution: { M: 0.5, F: 0.5 },
      export_fhir: true,
    },
    features: [
      'COVID-19 infection patterns',
      'Risk factor analysis',
      'Comorbidity impact',
      'Vaccination data included',
    ],
  },
  {
    id: 'maternal-health',
    name: 'Maternal Health Study',
    description: 'Women of childbearing age with pregnancy-related conditions',
    icon: '🤰',
    config: {
      size: 100,
      modules: ['pregnancy', 'diabetes', 'hypertension'],
      age_range: [18, 45] as [number, number],
      gender_distribution: { M: 0, F: 1 },
      export_fhir: true,
    },
    features: [
      'Women only (18-45 years)',
      'Pregnancy complications',
      'Gestational diabetes',
      'Prenatal care tracking',
    ],
  },
  {
    id: 'general-population',
    name: 'General Population',
    description: 'Diverse population with various common conditions',
    icon: '👥',
    config: {
      size: 150,
      modules: [],
      age_range: [0, 100] as [number, number],
      gender_distribution: { M: 0.5, F: 0.5 },
      export_fhir: true,
    },
    features: [
      'All age groups',
      'Natural disease distribution',
      'Baseline population health',
      'General demographic mix',
    ],
  },
];

export default function Templates() {
  const navigate = useNavigate();
  const config = useSyntheaConfig();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const createFromTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      const populationData = {
        name: `${template.name} - ${new Date().toLocaleDateString()}`,
        description: template.description,
        size: template.config.size,
        config: template.config,
      };

      const population = await createPopulation(config.apiUrl, populationData);
      await startGeneration(config.apiUrl, population.id);
      return population;
    },
    onSuccess: (data) => {
      navigate(`/population/${data.id}`);
    },
    onError: (error) => {
      alert(`Failed to create from template: ${error}`);
    }
  });

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Population Templates</h2>
        <p className="mt-1 text-sm text-gray-600">
          Quick-start templates for common research scenarios
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedTemplate(template.id === selectedTemplate ? null : template.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <span className="text-3xl mr-3">{template.icon}</span>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-gray-500">Population Size:</span>
                <span className="ml-2 font-medium">{template.config.size} patients</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Age Range:</span>
                <span className="ml-2 font-medium">
                  {template.config.age_range[0]}-{template.config.age_range[1]} years
                </span>
              </div>
            </div>

            {selectedTemplate === template.id && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Features:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {template.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    createFromTemplate.mutate(template.id);
                  }}
                  disabled={createFromTemplate.isPending}
                  className="mt-4 w-full px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {createFromTemplate.isPending ? 'Creating...' : 'Use This Template'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 mb-4">
          Need a custom configuration?
        </p>
        <button
          onClick={() => navigate('/new')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Create Custom Population
        </button>
      </div>
    </div>
  );
}