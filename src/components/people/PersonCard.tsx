import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, MessageCircle, Mail } from 'lucide-react';
import { useCreateDirectMessage } from '@/hooks/useMessaging';
import { displayName, initials, contactHrefs, sectionLabel } from '@/lib/people/contactActions';
import type { DirectoryPerson } from '@/hooks/usePeopleDirectory';

interface PersonCardProps {
  person: DirectoryPerson;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PersonCard: React.FC<PersonCardProps> = ({ person, open, onOpenChange }) => {
  const navigate = useNavigate();
  const createDirectMessage = useCreateDirectMessage();

  const name = displayName(person);
  const avatarSrc = person.headshot_url || person.avatar_url || null;
  const section = sectionLabel(person.voice_part);
  const roleOrTitle = person.title?.trim() || person.role?.trim() || null;
  const hrefs = contactHrefs(person);

  const handleMessage = async () => {
    if (!person.user_id || createDirectMessage.isPending) return;
    try {
      await createDirectMessage.mutateAsync(person.user_id);
      navigate('/messenger');
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="sr-only">{name}</SheetTitle>
          <div className="flex items-center gap-4">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={name}
                className="h-16 w-16 rounded-full object-cover bg-muted"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-base font-medium text-muted-foreground">
                {initials(person)}
              </div>
            )}
            <div className="flex flex-col gap-1 text-left">
              <span className="text-base font-semibold text-foreground">{name}</span>
              <div className="flex flex-wrap gap-1.5">
                {section && (
                  <Badge variant="outline" className="text-xs">
                    {section}
                  </Badge>
                )}
                {roleOrTitle && (
                  <Badge variant="outline" className="text-xs">
                    {roleOrTitle}
                  </Badge>
                )}
                {person.is_section_leader && (
                  <Badge variant="outline" className="text-xs">
                    Section leader
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button
            variant="outline"
            aria-label={`Message ${name}`}
            disabled={createDirectMessage.isPending}
            onClick={handleMessage}
            className="min-h-[44px] w-full flex-col gap-1 h-auto py-2"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs">Message</span>
          </Button>

          {hrefs.tel && (
            <a
              href={hrefs.tel}
              aria-label={`Call ${name}`}
              className="min-h-[44px] w-full flex flex-col items-center justify-center gap-1 border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
            >
              <Phone className="h-4 w-4" />
              <span className="text-xs">Call</span>
            </a>
          )}

          {hrefs.sms && (
            <a
              href={hrefs.sms}
              aria-label={`Text ${name}`}
              className="min-h-[44px] w-full flex flex-col items-center justify-center gap-1 border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">Text</span>
            </a>
          )}

          {hrefs.mailto && (
            <a
              href={hrefs.mailto}
              aria-label={`Email ${name}`}
              className="min-h-[44px] w-full flex flex-col items-center justify-center gap-1 border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
            >
              <Mail className="h-4 w-4" />
              <span className="text-xs">Email</span>
            </a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
