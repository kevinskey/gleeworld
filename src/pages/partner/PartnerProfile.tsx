import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useMyPartner, useUpdateMyPartner } from '@/lib/partner/api';
import { LogoUploadField } from '@/components/partner/LogoUploadField';

export default function PartnerProfile() {
  const { data: partner } = useMyPartner();
  const update = useUpdateMyPartner();
  const [form, setForm] = useState({
    display_name: '', bio: '', website_url: '', contact_email: '', logo_storage_path: null as string | null,
  });

  useEffect(() => {
    if (partner) setForm({
      display_name: partner.display_name,
      bio: partner.bio ?? '',
      website_url: partner.website_url ?? '',
      contact_email: partner.contact_email ?? '',
      logo_storage_path: partner.logo_storage_path,
    });
  }, [partner]);

  if (!partner) return null;

  const save = () => update.mutate({
    display_name: form.display_name,
    bio: form.bio || null,
    website_url: form.website_url || null,
    contact_email: form.contact_email || null,
    logo_storage_path: form.logo_storage_path,
  }, {
    onSuccess: () => toast.success('Profile saved'),
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-1">
          <Label className="text-xs">Logo</Label>
          <LogoUploadField
            partnerId={partner.id}
            currentPath={form.logo_storage_path}
            onUploaded={(path) => setForm({ ...form, logo_storage_path: path })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pp-name" className="text-xs">Display name *</Label>
          <Input id="pp-name" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pp-bio" className="text-xs">Bio</Label>
          <Textarea id="pp-bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="pp-web" className="text-xs">Website</Label>
            <Input id="pp-web" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pp-email" className="text-xs">Contact email</Label>
            <Input id="pp-email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </div>
        </div>
        <Button disabled={update.isPending || !form.display_name.trim()} onClick={save}>Save</Button>
      </CardContent>
    </Card>
  );
}
