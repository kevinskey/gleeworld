import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wrench, UserCog } from 'lucide-react';
import { AppointmentServiceManager } from '@/components/appointments/AppointmentServiceManager';
import { ServiceProviderManagementModule } from './ServiceProviderManagementModule';

/**
 * Appointments Hub — admin-side appointment configuration.
 *
 * Tabs:
 *   - Services  — appointment types, scheduler settings, badges
 *   - Providers — assign and manage users as service providers
 *
 * Member-side appointment views live in the separate `assignable-appointments`
 * module (My Appointments) since the audience is different.
 *
 * Replaces 2 separate module entries: service-management + service-provider-management.
 */
export const AppointmentsHub = () => {
  const [tab, setTab] = useState('services');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Appointments</h2>
        <p className="text-sm text-muted-foreground">
          Configure appointment services and manage who can be a provider.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="services" className="gap-1.5">
            <Wrench className="h-4 w-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-1.5">
            <UserCog className="h-4 w-4" />
            Providers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="m-0">
          <AppointmentServiceManager />
        </TabsContent>
        <TabsContent value="providers" className="m-0">
          <ServiceProviderManagementModule />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AppointmentsHub;
