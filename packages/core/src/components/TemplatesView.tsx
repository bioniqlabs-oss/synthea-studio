import React, { useState } from 'react';

interface Template {
  id: string;
  name: string;
  description: string;
  config: {
    population_size: number;
    age_range?: [number, number];
    gender?: 'M' | 'F' | 'ALL';
    modules?: string[];
  };
  tags: string[];
}

interface TemplatesViewProps {
  onUseTemplate?: (template: Template) => void;
}

const templates: Template[] = [
  {
    id: 'elderly-chronic',
    name: 'Elderly with Chronic Conditions',
    description: 'Population of elderly patients (65+) with common chronic conditions like diabetes, hypertension, and heart disease',
    config: {
      population_size: 100,
      age_range: [65, 90],
      modules: ['diabetes', 'hypertension', 'heart']
    },
    tags: ['elderly', 'chronic', 'medicare']
  },
  {
    id: 'pediatric-general',
    name: 'Pediatric General Practice',
    description: 'Children and adolescents (0-18) with typical pediatric conditions and vaccinations',
    config: {
      population_size: 150,
      age_range: [0, 18],
      modules: ['immunizations', 'asthma', 'allergies']
    },
    tags: ['pediatric', 'children', 'vaccinations']
  },
  {
    id: 'maternal-health',
    name: 'Maternal Health',
    description: 'Women of childbearing age (18-45) with pregnancy and maternal health conditions',
    config: {
      population_size: 75,
      age_range: [18, 45],
      gender: 'F',
      modules: ['pregnancy', 'contraceptives']
    },
    tags: ['maternal', 'pregnancy', 'women']
  },
  {
    id: 'mental-health',
    name: 'Mental Health Population',
    description: 'Adults with mental health conditions including depression, anxiety, and substance use',
    config: {
      population_size: 100,
      age_range: [18, 65],
      modules: ['depression', 'anxiety', 'substance_use']
    },
    tags: ['mental health', 'behavioral', 'psychiatry']
  },
  {
    id: 'emergency-dept',
    name: 'Emergency Department',
    description: 'Mixed population with acute conditions typically seen in emergency departments',
    config: {
      population_size: 200,
      modules: ['injuries', 'infections', 'cardiac_arrest']
    },
    tags: ['emergency', 'acute', 'trauma']
  },
  {
    id: 'covid-19',
    name: 'COVID-19 Pandemic',
    description: 'Population during COVID-19 pandemic with various outcomes',
    config: {
      population_size: 150,
      modules: ['covid19']
    },
    tags: ['covid', 'pandemic', 'infectious']
  }
];

export const TemplatesView: React.FC<TemplatesViewProps> = ({ onUseTemplate }) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const allTags = Array.from(new Set(templates.flatMap(t => t.tags))).sort();

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchTerm === '' || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => template.tags.includes(tag));
    
    return matchesSearch && matchesTags;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Population Templates</h2>
        <p className="text-gray-600">Pre-configured population templates to quickly generate common scenarios</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Template Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{template.config.population_size} patients</span>
                </div>
                
                {template.config.age_range && (
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Ages {template.config.age_range[0]}-{template.config.age_range[1]}</span>
                  </div>
                )}
                
                {template.config.gender && template.config.gender !== 'ALL' && (
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{template.config.gender === 'F' ? 'Female' : 'Male'} only</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1 mb-4">
                {template.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              <button
                onClick={() => onUseTemplate?.(template)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Use Template
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};