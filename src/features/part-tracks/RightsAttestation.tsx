// Rights attestation: basis picker + license number + explicit confirmation.
// Generation is server-gated (DB trigger); this is the capture UI.
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import * as api from './api';
import type { PartTrackRights, PartTrackRightsBasis } from './types';

const BASES: Array<{ value: PartTrackRightsBasis; label: string }> = [
  { value: 'own_work', label: 'My own work' },
  { value: 'public_domain', label: 'Public domain' },
  { value: 'ccli', label: 'CCLI Rehearsal License' },
  { value: 'onelicense', label: 'OneLicense Practice-Track License' },
  { value: 'publisher_permission', label: 'Direct publisher permission' },
];

const NEEDS_NUMBER = new Set<PartTrackRightsBasis>(['ccli', 'onelicense']);

interface Props {
  scoreId: string;
  rights: PartTrackRights | null;
  onAttested: () => void;
}

export function RightsAttestation({ scoreId, rights, onAttested }: Props) {
  const { user } = useAuth();
  const [basis, setBasis] = useState<PartTrackRightsBasis>(rights?.basis ?? 'own_work');
  const [licenseNumber, setLicenseNumber] = useState(rights?.license_number ?? '');
  const [confirmed, setConfirmed] = useState(Boolean(rights));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!NEEDS_NUMBER.has(basis) || licenseNumber) return;
    void api.getLatestLicenseNumber(basis).then((n) => {
      if (n) setLicenseNumber(n);
    });
  }, [basis, licenseNumber]);

  const needsNumber = NEEDS_NUMBER.has(basis);
  const canSave = confirmed && (!needsNumber || licenseNumber.trim().length > 0) && !saving;

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await api.attestRights(scoreId, basis, needsNumber ? licenseNumber.trim() : null, user.id);
      onAttested();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the attestation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Rights</p>
      <RadioGroup value={basis} onValueChange={(v) => setBasis(v as PartTrackRightsBasis)}>
        {BASES.map((b) => (
          <div key={b.value} className="flex items-center gap-2">
            <RadioGroupItem value={b.value} id={`pt-basis-${b.value}`} />
            <Label htmlFor={`pt-basis-${b.value}`} className="text-sm font-normal">
              {b.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
      {needsNumber && (
        <div className="space-y-1">
          <Label htmlFor="pt-license-number" className="text-xs">License number</Label>
          <Input
            id="pt-license-number"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            className="h-8 text-sm max-w-xs"
          />
        </div>
      )}
      <div className="flex items-start gap-2">
        <Checkbox
          id="pt-rights-confirm"
          checked={confirmed}
          onCheckedChange={(v) => setConfirmed(v === true)}
        />
        <Label htmlFor="pt-rights-confirm" className="text-xs font-normal leading-snug">
          I confirm this ensemble is licensed to create and share rehearsal recordings of this
          work with its students.
        </Label>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button size="sm" onClick={() => void save()} disabled={!canSave}>
        {rights ? 'Update attestation' : 'Save attestation'}
      </Button>
    </div>
  );
}
