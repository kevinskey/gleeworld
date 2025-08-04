import React from 'react';
import { AdminPanel } from '@/components/AdminPanel';
import { useSearchParams } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { MediaUploadButton } from '@/components/media/MediaUploadButton';

const AdminDashboard = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  return (
    <UniversalLayout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="container mx-auto px-4 py-8">
          {/* Header with Brand Colors */}
          <div className="mb-8">
            <div className="flex items-center justify-between bg-card/80 backdrop-blur-sm rounded-lg p-6 border border-border shadow-lg">
              <div>
                <h1 className="text-3xl font-bold text-primary mb-2">
                  GleeWorld Admin Dashboard
                </h1>
                <p className="text-muted-foreground">
                  Manage the Spelman College Glee Club platform
                </p>
              </div>
              <div className="flex items-center gap-4">
                <MediaUploadButton />
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">GW</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-8">
            <div className="bg-card/60 backdrop-blur-sm rounded-lg p-2 border border-border shadow-md">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'overview', label: 'Overview', icon: '📊' },
                  { id: 'users', label: 'Users', icon: '👥' },
                  { id: 'social', label: 'Social Media', icon: '📱' },
                  { id: 'music', label: 'Music', icon: '🎵' },
                  { id: 'announcements', label: 'Announcements', icon: '📢' },
                  { id: 'accounting', label: 'Accounting', icon: '💰' },
                  { id: 'activity', label: 'Activity', icon: '📈' },
                  { id: 'settings', label: 'Settings', icon: '⚙️' },
                ].map((tab) => (
                  <a
                    key={tab.id}
                    href={`/admin?tab=${tab.id}`}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                      ${activeTab === tab.id 
                        ? 'bg-primary text-primary-foreground shadow-md' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      }
                    `}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-card/60 backdrop-blur-sm rounded-lg border border-border shadow-lg">
            <AdminPanel activeTab={activeTab} />
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default AdminDashboard;