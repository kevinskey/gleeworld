import { UnifiedModule, UnifiedModuleCategory } from '@/types/unified-modules';
import { 
  UNIFIED_MODULES, 
  UNIFIED_MODULE_CATEGORIES,
  getUnifiedModuleById,
  getUnifiedCategoryById 
} from '@/config/unified-modules';

// Legacy interface mappings for backward compatibility
interface LegacyModuleConfig {
  id: string;
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  category: string;
  isNew?: boolean;
  requiredPermissions?: string[];
  component: React.ComponentType<any>;
  fullPageComponent?: React.ComponentType<any>;
}

interface LegacyModuleCategory {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  modules: LegacyModuleConfig[];
}

export class ModuleRegistry {
  private static modules: Map<string, LegacyModuleConfig> = new Map();
  private static categories: Map<string, LegacyModuleCategory> = new Map();

  static initialize() {
    // Initialize with unified modules
    UNIFIED_MODULE_CATEGORIES.forEach(category => {
      const legacyCategory: LegacyModuleCategory = {
        id: category.id,
        title: category.title,
        description: category.description,
        icon: category.icon,
        color: category.color,
        modules: []
      };
      this.categories.set(category.id, legacyCategory);
    });

    UNIFIED_MODULES.forEach(module => {
      const legacyModule: LegacyModuleConfig = {
        id: module.id,
        title: module.title,
        description: module.description,
        icon: module.icon,
        iconColor: module.iconColor,
        category: module.category,
        isNew: module.isNew,
        requiredPermissions: module.requiredRoles,
        component: module.component,
        fullPageComponent: module.fullPageComponent
      };
      
      this.modules.set(module.id, legacyModule);
      
      // Add to category
      const category = this.categories.get(module.category);
      if (category) {
        category.modules.push(legacyModule);
      }
    });
  }

  static registerModule(module: LegacyModuleConfig) {
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

  static getModule(moduleId: string): LegacyModuleConfig | undefined {
    return this.modules.get(moduleId);
  }

  static getModules(): LegacyModuleConfig[] {
    return Array.from(this.modules.values());
  }

  static getCategory(categoryId: string): LegacyModuleCategory | undefined {
    return this.categories.get(categoryId);
  }

  static getCategories(): LegacyModuleCategory[] {
    return Array.from(this.categories.values());
  }

  static getModulesByCategory(categoryId: string): LegacyModuleConfig[] {
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