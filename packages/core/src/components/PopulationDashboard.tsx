import React, { useState } from 'react';
import { PopulationManager } from './PopulationManager';
import { PatientGenerator } from './PatientGenerator';
import { ExportPanel } from './ExportPanel';
import { StatisticsView } from './StatisticsView';
import { TemplatesView } from './TemplatesView';
import { PopulationDetailsModal } from './PopulationDetailsModal';
import { AboutView } from './AboutView';
import { useSyntheaConfig } from '../contexts/SyntheaContext';

export const PopulationDashboard: React.FC = () => {
  const config = useSyntheaConfig();
  const [activeTab, setActiveTab] = useState<'statistics' | 'populations' | 'templates' | 'generate' | 'export' | 'about'>('statistics');
  const [selectedPopulationId, setSelectedPopulationId] = useState<string | null>(null);

  const tabs = [
    { id: 'statistics', label: 'Dashboard', show: true },
    { id: 'populations', label: 'Populations', show: true },
    { id: 'templates', label: 'Templates', show: config.features.allowCreate },
    { id: 'generate', label: 'Generate', show: config.features.allowCreate },
    { id: 'export', label: 'Export', show: config.features.allowExport },
    { id: 'about', label: 'About', show: true },
  ];

  return (
    <div className="synthea-dashboard">
      {config.features.showNavigation && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.filter(tab => tab.show).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="p-6">
        {activeTab === 'statistics' && (
          <StatisticsView onSelectPopulation={setSelectedPopulationId} />
        )}
        {activeTab === 'populations' && (
          <PopulationManager onSelectPopulation={setSelectedPopulationId} />
        )}
        {activeTab === 'templates' && config.features.allowCreate && (
          <TemplatesView onUseTemplate={() => setActiveTab('generate')} />
        )}
        {activeTab === 'generate' && config.features.allowCreate && (
          <PatientGenerator onSuccess={() => setActiveTab('populations')} />
        )}
        {activeTab === 'export' && config.features.allowExport && (
          <ExportPanel />
        )}
        {activeTab === 'about' && (
          <AboutView />
        )}
      </div>

      {selectedPopulationId && (
        <PopulationDetailsModal
          populationId={selectedPopulationId}
          onClose={() => setSelectedPopulationId(null)}
        />
      )}
    </div>
  );
};