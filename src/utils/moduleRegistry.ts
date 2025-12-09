import { UnifiedModule, UnifiedModuleCategory } from '@/types/unified-modules';
import { 
  UNIFIED_MODULES, 
  UNIFIED_MODULE_CATEGORIES,
  getUnifiedModuleById,
  getUnifiedCategoryById 
} from '@/config/unified-modules';
import { UserModuleAssignment } from '@/components/admin/UserModuleAssignment';
import { Settings } from 'lucide-react';

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
  private static initialized = false;

  static initialize() {
    if (this.initialized) return; // Prevent double initialization
    
    try {
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
      
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing ModuleRegistry:', error);
    }
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

// Delay initialization to allow all imports to complete
setTimeout(() => {
  ModuleRegistry.initialize();
}, 0);

// Register the UserModuleAssignment component as a special module
ModuleRegistry.registerModule({
  id: 'user-module-assignment',
  title: 'User Module Assignment',
  description: 'Assign specific modules to individual users',
  icon: Settings,
  iconColor: 'blue',
  category: 'administration',
  component: UserModuleAssignment,
  requiredPermissions: ['super-admin']
});

// Import and register additional modules
import { EnhancedContractManager } from '@/components/contracts/EnhancedContractManager';
import { FileText, GraduationCap, QrCode, ClipboardList } from 'lucide-react';

import GleeAcademy from '@/pages/GleeAcademy';
import { QRCodeManagementModule } from '@/components/modules/QRCodeManagementModule';
import { TestBuilder } from '@/components/test-builder/TestBuilder';

ModuleRegistry.registerModule({
  id: 'enhanced-contract-management',
  title: 'Enhanced Contract Management',
  description: 'Advanced contract management with integrated testing suite',
  icon: FileText,
  iconColor: 'purple',
  category: 'business',
  component: EnhancedContractManager,
  requiredPermissions: ['admin', 'super-admin']
});

// Register Glee Academy
ModuleRegistry.registerModule({
  id: 'glee-academy',
  title: 'Glee Academy',
  description: 'Music education platform with courses and private lessons',
  icon: GraduationCap,
  iconColor: 'blue',
  category: 'education',
  component: GleeAcademy,
  requiredPermissions: ['admin', 'super-admin']
});

// Register QR Code Management
ModuleRegistry.registerModule({
  id: 'qr-code-management',
  title: 'QR Code Management',
  description: 'Generate and manage attendance QR codes for any event or class',
  icon: QrCode,
  iconColor: 'purple',
  category: 'administration',
  component: QRCodeManagementModule,
  requiredPermissions: ['admin', 'super-admin', 'exec']
});

// Register Test Builder
ModuleRegistry.registerModule({
  id: 'test-builder',
  title: 'Test Builder',
  description: 'Create and manage tests for all Glee Academy courses with multimedia support',
  icon: ClipboardList,
  iconColor: 'indigo',
  category: 'education',
  component: TestBuilder,
  requiredPermissions: ['admin', 'super-admin']
});

// Register Glee Cam Manager
import { GleeCamManagerModule } from '@/components/dashboard/modules/GleeCamManagerModule';
import { Camera } from 'lucide-react';

ModuleRegistry.registerModule({
  id: 'glee-cam-manager',
  title: 'Glee Cam Manager',
  description: 'Manage Glee Cam categories and media content',
  icon: Camera,
  iconColor: 'blue',
  category: 'media',
  component: GleeCamManagerModule,
  requiredPermissions: ['admin', 'super-admin']
});