import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ProviderAppointmentHub } from '@/components/appointments/ProviderAppointmentHub';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const ProviderAppointments = () => {
  const { providerId } = useParams();
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch provider details if providerId is specified
  useEffect(() => {
    const fetchProvider = async () => {
      if (!providerId) {
        setLoading(false);
        return;
      }

      try {
        // Map provider names to specific provider IDs or emails
        const providerMap: { [key: string]: string } = {
          'drew': 'drewroberts@spelman.edu',
          'soleil': 'soleilvailes@spelman.edu'
        };

        const targetEmail = providerMap[providerId.toLowerCase()] || providerId;

        // Fetch provider profile by email
        const { data: profiles, error } = await supabase
          .from('gw_profiles')
          .select('*')
          .eq('email', targetEmail)
          .limit(1);

        if (error) throw error;

        if (profiles && profiles.length > 0) {
          setProvider(profiles[0]);
        }
      } catch (error) {
        console.error('Error fetching provider:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [providerId]);

  if (loading) {
    return (
      <UniversalLayout showHeader={true} showFooter={false}>
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner size="lg" text="Loading provider details..." />
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="container mx-auto p-6">
        {providerId && provider && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold">
              {provider.full_name || provider.first_name || 'Provider'} - Appointments
            </h1>
            <p className="text-muted-foreground">
              Book an appointment with {provider.first_name || 'this provider'}
            </p>
          </div>
        )}
        <ProviderAppointmentHub />
      </div>
    </UniversalLayout>
  );
};

export default ProviderAppointments;