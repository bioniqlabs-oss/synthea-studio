/**
 * Service Health Monitoring Component
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../services/api';

export default function ServiceHealth() {
  // Fetch service health
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.getHealth,
    refetchInterval: 10000, // Check every 10 seconds
  });

  // Fetch service status
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: healthApi.getServices,
    refetchInterval: 10000,
  });

  // Fetch metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['metrics'],
    queryFn: healthApi.getMetrics,
    refetchInterval: 5000,
  });

  const isLoading = healthLoading || servicesLoading || metricsLoading;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ready':
        return 'bg-green-500';
      case 'degraded':
      case 'unhealthy':
        return 'bg-yellow-500';
      case 'unknown':
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ready':
        return '✓';
      case 'degraded':
      case 'unhealthy':
        return '!';
      case 'unknown':
      default:
        return '?';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Health */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
          <div className="flex items-center space-x-2">
            <span
              className={`inline-block w-3 h-3 rounded-full ${getStatusColor(
                health?.status || 'unknown'
              )}`}
            ></span>
            <span className="text-sm font-medium capitalize">
              {health?.status || 'Unknown'}
            </span>
          </div>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 rounded p-3">
              <p className="text-xs text-gray-500">Services Healthy</p>
              <p className="text-xl font-semibold">{metrics.services_healthy || 0}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-xs text-gray-500">Requests/sec</p>
              <p className="text-xl font-semibold">
                {metrics.requests_per_second?.toFixed(1) || '0.0'}
              </p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-xs text-gray-500">Avg Latency</p>
              <p className="text-xl font-semibold">
                {metrics.average_latency_ms?.toFixed(0) || '0'} ms
              </p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-xs text-gray-500">Error Rate</p>
              <p className="text-xl font-semibold">
                {((metrics.error_rate || 0) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Service Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Services</h2>
        <div className="space-y-3">
          {services?.services &&
            Object.entries(services.services).map(([name, service]: [string, any]) => (
              <div
                key={name}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${getStatusColor(
                      service.status
                    )}`}
                  >
                    {getStatusIcon(service.status)}
                  </div>
                  <div>
                    <p className="font-medium capitalize">{name}</p>
                    <p className="text-xs text-gray-500">{service.url}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium capitalize">{service.status}</p>
                  {service.last_check && (
                    <p className="text-xs text-gray-500">
                      Last check: {new Date(service.last_check).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            ))}

          {(!services?.services || Object.keys(services.services).length === 0) && (
            <p className="text-gray-500 text-center py-4">No services registered</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            onClick={() => window.open('/api/docs', '_blank')}
            className="p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
          >
            API Docs
          </button>
          <button
            onClick={() => window.open('http://localhost:5555', '_blank')}
            className="p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition"
          >
            Celery Monitor
          </button>
          <button
            onClick={() => window.location.reload()}
            className="p-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition"
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
}