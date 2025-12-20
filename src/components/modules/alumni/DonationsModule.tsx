import { useState } from 'react';
import { ModuleWrapper } from '@/components/modules/ModuleWrapper';
import { Heart, Gift, DollarSign, Trophy, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ModuleProps } from '@/types/unified-modules';
import { toast } from 'sonner';

export function DonationsModule({ user, isFullPage }: ModuleProps) {
  const [loading, setLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<string>('100');
  const [customAmount, setCustomAmount] = useState('');

  const campaigns = [
    {
      id: 'scholarship',
      name: 'Scholarship Fund',
      goal: 50000,
      raised: 32500,
      description: 'Support Glee Club members with financial assistance for dues and tour costs.'
    },
    {
      id: 'centennial',
      name: 'Centennial Celebration Fund',
      goal: 100000,
      raised: 67500,
      description: 'Help make the 100th Christmas Carol Concert unforgettable.'
    },
    {
      id: 'general',
      name: 'General Operating Fund',
      goal: 25000,
      raised: 18750,
      description: 'Support day-to-day operations and programs.'
    }
  ];

  const donorLevels = [
    { name: 'Friend', min: 1, max: 99, icon: '🎵' },
    { name: 'Supporter', min: 100, max: 499, icon: '🎶' },
    { name: 'Patron', min: 500, max: 999, icon: '⭐' },
    { name: 'Benefactor', min: 1000, max: 4999, icon: '🌟' },
    { name: 'Legacy Circle', min: 5000, max: Infinity, icon: '💎' }
  ];

  const handleDonate = () => {
    const amount = selectedAmount === 'custom' ? customAmount : selectedAmount;
    toast.success(`Thank you! Redirecting to process your $${amount} donation...`);
  };

  return (
    <ModuleWrapper
      title="Give Back"
      icon={Heart}
    >
      <div className="space-y-6">
        {/* Quick Donate */}
        <Card className="bg-gradient-to-r from-rose-500/20 via-pink-500/10 to-background border-rose-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Make a Gift
            </CardTitle>
            <CardDescription>Your donation supports current members and preserves our legacy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={selectedAmount} onValueChange={setSelectedAmount} className="grid grid-cols-4 gap-2">
              {['50', '100', '250', '500'].map((amount) => (
                <div key={amount}>
                  <RadioGroupItem value={amount} id={`amount-${amount}`} className="peer sr-only" />
                  <Label
                    htmlFor={`amount-${amount}`}
                    className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    ${amount}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            
            <div className="flex items-center gap-2">
              <RadioGroupItem 
                value="custom" 
                id="amount-custom" 
                checked={selectedAmount === 'custom'}
                onClick={() => setSelectedAmount('custom')}
              />
              <Label htmlFor="amount-custom">Other:</Label>
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount('custom');
                  }}
                  className="pl-8"
                />
              </div>
            </div>

            <Button onClick={handleDonate} size="lg" className="w-full">
              <Heart className="h-4 w-4 mr-2" />
              Donate Now
            </Button>
          </CardContent>
        </Card>

        {/* Active Campaigns */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Active Campaigns</h3>
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{campaign.name}</h4>
                      <p className="text-sm text-muted-foreground">{campaign.description}</p>
                    </div>
                    <Badge variant="secondary">
                      {Math.round((campaign.raised / campaign.goal) * 100)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <Progress value={(campaign.raised / campaign.goal) * 100} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>${campaign.raised.toLocaleString()} raised</span>
                      <span>${campaign.goal.toLocaleString()} goal</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Donor Recognition Levels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Donor Recognition Levels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {donorLevels.map((level) => (
                <div key={level.name} className="text-center p-3 rounded-lg border bg-card">
                  <span className="text-2xl">{level.icon}</span>
                  <p className="font-semibold text-sm mt-1">{level.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ${level.min}{level.max === Infinity ? '+' : `-$${level.max}`}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleWrapper>
  );
}

export default DonationsModule;
