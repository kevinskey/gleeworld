// /enroll — public page where students enter a class join code to begin.
// Forwards to /join/:code which handles the actual signup.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Hash, ArrowRight } from 'lucide-react';

export default function EnrollLanding() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  function go() {
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean) navigate(`/join/${clean}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary" /> Enroll in a class
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Enter the class code your director gave you. (Looks like <code className="bg-muted px-1 rounded">ABC234</code>.)
          </p>
          <div>
            <Label className="text-xs">Class code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && go()}
              placeholder="ABC234"
              className="font-mono uppercase tracking-widest text-center text-lg"
              maxLength={10}
              autoFocus
            />
          </div>
          <Button onClick={go} disabled={!code.trim()} className="w-full">
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Already have an account?{' '}
            <a href="/auth" className="underline font-medium">Sign in</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
