import { ModuleConfig, ModuleCategory } from '@/types/modules';
import { moduleCategories } from '@/config/modules';

export class ModuleRegistry {
  private static modules: Map<string, ModuleConfig> = new Map();
  private static categories: Map<string, ModuleCategory> = new Map();

  static initialize() {
    // Initialize with default modules from config
    moduleCategories.forEach(category => {
      this.categories.set(category.id, category);
      category.modules.forEach(module => {
        this.modules.set(module.id, module);
      });
    });
  }

  static registerModule(module: ModuleConfig) {
    this.modules.set(module.id, module);
    
    // Add to category if it exists
    const category = this.categories.get(module.category);
    if (category) {
      const existingIndex = category.modules.findIndex(m => m.id === module.id);
      if (existingIndex >= 0) {
        category.modules[existingIndex] = module;
      } else {
        category.modules.push(module);
      }
    }
  }

  static unregisterModule(moduleId: string) {
    const module = this.modules.get(moduleId);
    if (module) {
      this.modules.delete(moduleId);
      
      // Remove from category
      const category = this.categories.get(module.category);
      if (category) {
        category.modules = category.modules.filter(m => m.id !== moduleId);
      }
    }
  }

  static getModule(moduleId: string): ModuleConfig | undefined {
    return this.modules.get(moduleId);
  }

  static getModules(): ModuleConfig[] {
    return Array.from(this.modules.values());
  }

  static getCategory(categoryId: string): ModuleCategory | undefined {
    return this.categories.get(categoryId);
  }

  static getCategories(): ModuleCategory[] {
    return Array.from(this.categories.values());
  }

  static getModulesByCategory(categoryId: string): ModuleConfig[] {
    const category = this.categories.get(categoryId);
    return category ? category.modules : [];
  }

  static hasPermission(moduleId: string, userPermissions: string[]): boolean {
    const module = this.modules.get(moduleId);
    if (!module || !module.requiredPermissions) return true;
    
    return module.requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
  }
}

// Initialize on import
ModuleRegistry.initialize();