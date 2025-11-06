import { useState } from 'react';
import { ContactsImportWizard } from '@/components/contacts/ContactsImportWizard';
import { ContactsList } from '@/components/contacts/ContactsList';
import { ContactDetail } from '@/components/contacts/ContactDetail';

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
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Glee Club Contacts Management</h1>
        <p className="text-muted-foreground mt-2">
          Import, manage, and track your Glee Club contact database
        </p>
      </div>

      <ContactsImportWizard />

      <ContactsList onViewContact={(id) => setSelectedContactId(id)} />
    </div>
  );
};

export default GleeClubContactsManagement;
