import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { templateApi, populationApi } from '../services/api';

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  useEffect(() => {
    templateApi.list().then(setTemplates);
  }, []);
  
  const createFromTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const template = await templateApi.load(templateId);
      const population = await populationApi.create(template);
      await populationApi.startGeneration(population.id);
      return population;
    },
    onSuccess: (data) => {
      navigate(`/population/${data.id}`);
    },
    onError: (error) => {
      console.error('Failed to create from template:', error);
      alert('Failed to create population from template');
    }
  });
  
  const templateDetails = {
    'diabetes-study': {
      features: [
        'Type 2 diabetes focus',
        'Common comorbidities included',
        'Age range: 40-75 years',
        'Includes hypertension & metabolic syndrome',
        'HbA1c tracking enabled'
      ],
      useCases: [
        'Clinical trial simulation',
        'Treatment pathway analysis',
        'Medication adherence studies',
        'Complication risk assessment'
      ]
    },
    'pediatric-asthma': {
      features: [
        'Pediatric population (5-17 years)',
        'Asthma and allergy conditions',
        'Environmental triggers tracked',
        'Emergency visit patterns',
        'School absence data'
      ],
      useCases: [
        'Pediatric care optimization',
        'School health programs',
        'Inhaler usage studies',
        'Allergy management protocols'
      ]
    },
    'general-population': {
      features: [
        'Diverse age distribution',
        'Typical disease prevalence',
        'Preventive care included',
        'All age groups (0-90)',
        'Mixed socioeconomic factors'
      ],
      useCases: [
        'Population health baseline',
        'Healthcare utilization analysis',
        'Public health planning',
        'General testing and validation'
      ]
    },
    'cardiovascular-risk': {
      features: [
        'High-risk cardiovascular patients',
        'Multiple risk factors',
        'Medication tracking',
        'Framingham scores',
        'Lifestyle factors included'
      ],
      useCases: [
        'Cardiac prevention programs',
        'Risk stratification studies',
        'Medication effectiveness',
        'Lifestyle intervention planning'
      ]
    }
  };
  
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Population Templates</h2>
        <p className="mt-1 text-sm text-gray-600">
          Pre-configured templates for common research scenarios
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {templates.map((template) => {
          const details = templateDetails[template.id as keyof typeof templateDetails];
          const isSelected = selectedTemplate === template.id;
          
          return (
            <div
              key={template.id}
              className={`bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-xl'
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">{template.thumbnail}</span>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {template.size} patients
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Selected
                    </span>
                  )}
                </div>
                
                <p className="mt-3 text-sm text-gray-600">
                  {template.description}
                </p>
                
                {details && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        Key Features
                      </h4>
                      <ul className="mt-1 text-xs text-gray-600 space-y-1">
                        {details.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-green-500 mr-1">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        Use Cases
                      </h4>
                      <ul className="mt-1 text-xs text-gray-600 space-y-1">
                        {details.useCases.map((useCase, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-blue-500 mr-1">•</span>
                            {useCase}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      createFromTemplate.mutate(template.id);
                    }}
                    disabled={createFromTemplate.isPending}
                    className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createFromTemplate.isPending ? 'Creating...' : 'Use Template'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Load template into form for customization
                      templateApi.load(template.id).then((data) => {
                        // Store in sessionStorage and navigate to new population form
                        sessionStorage.setItem('templateData', JSON.stringify(data));
                        navigate('/new');
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Customize
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900">
          💡 Template Tips
        </h3>
        <ul className="mt-2 text-sm text-blue-700 space-y-1">
          <li>• Templates provide pre-configured settings for common research scenarios</li>
          <li>• Use "Customize" to modify template settings before generation</li>
          <li>• All templates use Synthea's validated disease models</li>
          <li>• Generated populations include complete medical histories</li>
        </ul>
      </div>
    </div>
  );
}