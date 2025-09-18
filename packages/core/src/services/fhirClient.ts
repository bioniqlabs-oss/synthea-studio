export class FHIRClient {
  private apiUrl: string;
  private mode: 'standalone' | 'embedded';

  constructor(apiUrl = 'http://localhost:8001', mode: 'standalone' | 'embedded' = 'standalone') {
    this.apiUrl = apiUrl;
    this.mode = mode;
  }

  private get baseUrl() {
    return this.mode === 'embedded' ? `${this.apiUrl}/fhir` : `${this.apiUrl}/fhir`;
  }

  async getResource(resourceType: string, id?: string, params?: Record<string, any>) {
    const url = new URL(`${this.baseUrl}/${resourceType}${id ? `/${id}` : ''}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch resource: ${response.statusText}`);
    }

    return response.json();
  }

  async searchResource(resourceType: string, params: Record<string, any>) {
    const url = new URL(`${this.baseUrl}/${resourceType}`);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to search resource: ${response.statusText}`);
    }

    return response.json();
  }

  async createResource(resourceType: string, resource: any) {
    const response = await fetch(`${this.baseUrl}/${resourceType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resource),
    });

    if (!response.ok) {
      throw new Error(`Failed to create resource: ${response.statusText}`);
    }

    return response.json();
  }

  async updateResource(resourceType: string, id: string, resource: any) {
    const response = await fetch(`${this.baseUrl}/${resourceType}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resource),
    });

    if (!response.ok) {
      throw new Error(`Failed to update resource: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteResource(resourceType: string, id: string) {
    const response = await fetch(`${this.baseUrl}/${resourceType}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete resource: ${response.statusText}`);
    }

    return { success: true };
  }

  async getCapabilityStatement() {
    const response = await fetch(`${this.baseUrl}/metadata`);

    if (!response.ok) {
      throw new Error(`Failed to fetch capability statement: ${response.statusText}`);
    }

    return response.json();
  }
}