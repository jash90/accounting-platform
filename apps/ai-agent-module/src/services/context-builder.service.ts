import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ModuleContextRequest {
  moduleId: string;
  permissions: string[];
  userId: string;
}

@Injectable()
export class ContextBuilderService {
  // Map of module IDs to their API endpoints
  private moduleEndpoints: Map<string, string> = new Map([
    ['client-management', 'http://localhost:3001/api/v1'],
    ['invoice-management', 'http://localhost:3002/api/v1'],
    ['expense-tracking', 'http://localhost:3003/api/v1'],
    ['reporting', 'http://localhost:3004/api/v1']
  ]);

  constructor(private httpService: HttpService) {}

  async getModuleContext(
    moduleId: string,
    permissions: string[],
    userId: string
  ): Promise<Record<string, any>> {
    try {
      const baseUrl = this.moduleEndpoints.get(moduleId);

      if (!baseUrl) {
        console.warn(`Unknown module ID: ${moduleId}`);
        return {};
      }

      const context: Record<string, any> = {};

      // Fetch data based on permissions
      for (const permission of permissions) {
        const data = await this.fetchPermissionData(
          baseUrl,
          moduleId,
          permission,
          userId
        );

        if (data) {
          context[permission] = data;
        }
      }

      return context;
    } catch (error) {
      console.error(`Error building context for module ${moduleId}:`, error);
      return {};
    }
  }

  private async fetchPermissionData(
    baseUrl: string,
    moduleId: string,
    permission: string,
    userId: string
  ): Promise<any> {
    try {
      let endpoint: string;

      // Map permissions to API endpoints
      switch (permission) {
        case 'read_clients':
          endpoint = `${baseUrl}/clients`;
          break;
        case 'read_invoices':
          endpoint = `${baseUrl}/invoices`;
          break;
        case 'read_expenses':
          endpoint = `${baseUrl}/expenses`;
          break;
        case 'read_reports':
          endpoint = `${baseUrl}/reports`;
          break;
        case 'read_analytics':
          endpoint = `${baseUrl}/analytics`;
          break;
        default:
          console.warn(`Unknown permission: ${permission}`);
          return null;
      }

      // Make HTTP request to fetch data
      const response = await firstValueFrom(
        this.httpService.get(endpoint, {
          headers: {
            'X-User-ID': userId,
            'X-Agent-Request': 'true'
          },
          timeout: 5000 // 5 second timeout
        })
      );

      return response.data;
    } catch (error) {
      console.error(`Error fetching ${permission} data:`, error);
      return null;
    }
  }

  async getUserContext(userId: string): Promise<Record<string, any>> {
    try {
      // Fetch user profile and preferences
      // This would typically call a user service
      return {
        id: userId,
        // Additional user context can be added here
        timezone: 'UTC',
        locale: 'en-US',
        preferences: {}
      };
    } catch (error) {
      console.error(`Error fetching user context for ${userId}:`, error);
      return { id: userId };
    }
  }

  getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  setNestedValue(obj: Record<string, any>, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();

    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);

    if (lastKey) {
      target[lastKey] = value;
    }
  }
}
