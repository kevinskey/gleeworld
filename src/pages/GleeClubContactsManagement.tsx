import { useState } from 'react';
import { ContactsImportWizard } from '@/components/contacts/ContactsImportWizard';
import { ContactsList } from '@/components/contacts/ContactsList';
import { ContactDetail } from '@/components/contacts/ContactDetail';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

const GleeClubContactsManagement = () => {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  if (selectedContactId) {
    return (
      <div className="container mx-auto p-6">
        <ContactDetail 
          contactId={selectedContactId} 
          onBack={() => setSelectedContactId(null)} 
        />
      </div>
    );
  }

  return (
    <DashboardPageShell
      title="Glee Club Contacts Management"
      subtitle="Import, manage, and track your Glee Club contact database"
    >
      <ContactsImportWizard />

      <ContactsList onViewContact={(id) => setSelectedContactId(id)} />
    </DashboardPageShell>
  );
};

export default GleeClubContactsManagement;
