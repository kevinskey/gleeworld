import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Database, Users, Shield, Layout, GitBranch, 
  CheckCircle, XCircle, AlertTriangle, ArrowRight,
  Layers, Lock, Settings, FileText
} from "lucide-react";

export default function DocsArchitecture() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">GleeWorld Architecture Spec</h1>
            <Badge variant="secondary">v2.0</Badge>
          </div>
          <a href="/dashboard" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to Dashboard
          </a>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="container max-w-5xl py-8 px-4 space-y-12">
          
          {/* Overview */}
          <section>
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
              <Layout className="h-8 w-8 text-primary" />
              Overview
            </h2>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <p className="text-lg">
                  <strong>Approach:</strong> Single unified dashboard (<code className="bg-muted px-2 py-1 rounded">/dashboard</code>) for all authenticated users + public landing page (<code className="bg-muted px-2 py-1 rounded">/</code>).
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg bg-destructive/10">
                    <h4 className="font-semibold flex items-center gap-2 text-destructive">
                      <XCircle className="h-4 w-4" /> Remove
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• Boolean TA flags from profiles</li>
                      <li>• <code>min_role_level</code> (broken for fan/alumna)</li>
                      <li>• Global-only permissions</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg bg-green-500/10">
                    <h4 className="font-semibold flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" /> Add
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• Offering-scoped permissions</li>
                      <li>• Subscription tier gating</li>
                      <li>• Separate identity vs work roles</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Database Schema */}
          <section>
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
              <Database className="h-8 w-8 text-primary" />
              Database Schema
            </h2>

            {/* gw_profiles */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4">gw_profiles Changes</h3>
                
                <div className="p-4 border rounded-lg bg-destructive/10 mb-4">
                  <h4 className="font-semibold text-destructive mb-2">❌ REMOVE these columns:</h4>
                  <pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
{`-- DO NOT USE
-- is_teaching_assistant BOOLEAN
-- ta_permissions JSONB`}
                  </pre>
                </div>

                <div className="p-4 border rounded-lg bg-green-500/10">
                  <h4 className="font-semibold text-green-600 mb-2">✅ ADD these columns:</h4>
                  <pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
{`ALTER TABLE gw_profiles
  ADD COLUMN IF NOT EXISTS primary_role TEXT DEFAULT 'fan',
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';`}
                  </pre>
                </div>

                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Primary Roles (mutually exclusive)</h4>
                    <table className="w-full text-sm border rounded">
                      <thead className="bg-muted">
                        <tr><th className="p-2 text-left">Role</th><th className="p-2 text-left">Description</th></tr>
                      </thead>
                      <tbody>
                        <tr className="border-t"><td className="p-2"><code>super_admin</code></td><td className="p-2">Full system access</td></tr>
                        <tr className="border-t"><td className="p-2"><code>admin</code></td><td className="p-2">Administrative access</td></tr>
                        <tr className="border-t"><td className="p-2"><code>student</code></td><td className="p-2">Active member/student</td></tr>
                        <tr className="border-t"><td className="p-2"><code>alumna</code></td><td className="p-2">Graduated member</td></tr>
                        <tr className="border-t"><td className="p-2"><code>fan</code></td><td className="p-2">Subscriber (default)</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Subscription Tiers</h4>
                    <table className="w-full text-sm border rounded">
                      <thead className="bg-muted">
                        <tr><th className="p-2 text-left">Tier</th><th className="p-2 text-left">Access</th></tr>
                      </thead>
                      <tbody>
                        <tr className="border-t"><td className="p-2"><code>free</code></td><td className="p-2">Basic fan content</td></tr>
                        <tr className="border-t"><td className="p-2"><code>plus</code></td><td className="p-2">Enhanced + early access</td></tr>
                        <tr className="border-t"><td className="p-2"><code>premium</code></td><td className="p-2">All content + exclusive</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Course Tables */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-600">NEW</Badge>
                  Course Organization Tables
                </h3>
                <pre className="text-sm bg-muted p-4 rounded overflow-x-auto">
{`-- Course template (reusable across semesters)
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,              -- MUS070, MUS240, etc.
  title TEXT NOT NULL,
  description TEXT,
  is_glee_club BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Semester instance of a course
CREATE TABLE course_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  semester TEXT NOT NULL,                 -- 'Spring 2026'
  academic_year TEXT NOT NULL,            -- '2025-2026'
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(course_id, semester, academic_year)
);

-- Student enrollments (source of truth for student access)
CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id UUID REFERENCES course_offerings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_status TEXT DEFAULT 'active',
  UNIQUE(offering_id, user_id)
);`}
                </pre>
              </CardContent>
            </Card>

            {/* TA Assignments */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-600">NEW</Badge>
                  TA Assignments Table
                </h3>
                <pre className="text-sm bg-muted p-4 rounded overflow-x-auto">
{`CREATE TABLE ta_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id UUID REFERENCES course_offerings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ta_type TEXT NOT NULL,  -- lead_ta|grader|content_creator|proctor
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  UNIQUE(offering_id, user_id, ta_type)
);`}
                </pre>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Badge variant="secondary">lead_ta</Badge>
                  <Badge variant="secondary">grader</Badge>
                  <Badge variant="secondary">content_creator</Badge>
                  <Badge variant="secondary">proctor</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Exec Assignments */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-600">NEW</Badge>
                  Exec Assignments Table
                </h3>
                <pre className="text-sm bg-muted p-4 rounded overflow-x-auto">
{`CREATE TABLE exec_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id UUID REFERENCES course_offerings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exec_role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMPTZ,
  UNIQUE(offering_id, user_id, exec_role)
);`}
                </pre>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['president', 'vice_president', 'treasurer', 'secretary', 'tour_manager', 'wardrobe_manager', 'pr_coordinator', 'student_conductor', 'section_leader'].map(role => (
                    <Badge key={role} variant="secondary">{role}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Role Permissions */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Badge variant="outline" className="text-amber-600 border-amber-600">UPDATED</Badge>
                  Role Permissions Table
                </h3>
                <pre className="text-sm bg-muted p-4 rounded overflow-x-auto">
{`CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL,        -- fan|student|alumna|admin|super_admin|teaching_assistant
  sub_role TEXT,                  -- grader|treasurer|tour_manager|etc
  module_id TEXT NOT NULL,
  scope_type TEXT DEFAULT 'global',  -- global|offering
  scope_id UUID,                     -- course_offering.id when scoped
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_manage BOOLEAN DEFAULT false,
  effect TEXT DEFAULT 'allow',       -- allow|deny (deny wins!)
  UNIQUE(role_name, sub_role, module_id, scope_type, scope_id)
);`}
                </pre>
                <div className="mt-4 p-4 border rounded-lg bg-amber-500/10">
                  <h4 className="font-semibold text-amber-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Key Changes
                  </h4>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• <code>scope_type</code> + <code>scope_id</code> for offering-level permissions</li>
                    <li>• <code>effect = 'deny'</code> always wins over allow</li>
                    <li>• No more <code>min_role_level</code></li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Role Hierarchy */}
          <section>
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Role Hierarchy
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-4">Identity Roles (Primary)</h3>
                  <p className="text-sm text-muted-foreground mb-4">Mutually exclusive, stored in gw_profiles</p>
                  <div className="space-y-2">
                    {[
                      { role: 'super_admin', desc: 'Full system access', color: 'bg-red-500' },
                      { role: 'admin', desc: 'Administrative access', color: 'bg-orange-500' },
                      { role: 'student', desc: 'Active member (cannot be alumna)', color: 'bg-blue-500' },
                      { role: 'alumna', desc: 'Graduated (cannot be student)', color: 'bg-purple-500' },
                      { role: 'fan', desc: 'Subscriber (default)', color: 'bg-green-500' },
                    ].map(({ role, desc, color }) => (
                      <div key={role} className="flex items-center gap-3 p-2 border rounded">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        <code className="font-mono">{role}</code>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-4">Work Roles (Assignment-Based)</h3>
                  <p className="text-sm text-muted-foreground mb-4">Offering-scoped, can stack</p>
                  
                  <div className="space-y-4">
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-semibold mb-2">Teaching Assistant</h4>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline">lead_ta</Badge>
                        <Badge variant="outline">grader</Badge>
                        <Badge variant="outline">content_creator</Badge>
                        <Badge variant="outline">proctor</Badge>
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <h4 className="font-semibold mb-2">Executive Board</h4>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline">president</Badge>
                        <Badge variant="outline">treasurer</Badge>
                        <Badge variant="outline">tour_manager</Badge>
                        <Badge variant="outline">+more</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          {/* Permission Flow */}
          <section>
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
              <GitBranch className="h-8 w-8 text-primary" />
              Permission Resolution Flow
            </h2>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[
                    { step: 1, title: 'Fetch User Context', desc: 'gw_profiles, enrollments, ta_assignments, exec_assignments' },
                    { step: 2, title: 'Determine Active Offering', desc: 'If multiple assignments → show offering selector' },
                    { step: 3, title: 'Collect Applicable Permissions', desc: 'Global + offering-scoped for TA/exec roles' },
                    { step: 4, title: 'Apply Deny Rules', desc: "effect='deny' overrides allow" },
                    { step: 5, title: 'Apply Subscription Gate', desc: 'Check min_subscription_tier vs user tier' },
                    { step: 6, title: 'Return Result', desc: 'allowedModules + lockedModules with reasons' },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-4 items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {step}
                      </div>
                      <div>
                        <h4 className="font-semibold">{title}</h4>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Summary */}
          <section>
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
              <Settings className="h-8 w-8 text-primary" />
              Summary: What Changed
            </h2>
            <Card>
              <CardContent className="pt-6">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left">Item</th>
                      <th className="p-3 text-left text-destructive">v1 (Remove)</th>
                      <th className="p-3 text-left text-green-600">v2 (Use Instead)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['TA detection', 'gw_profiles.is_teaching_assistant', 'ta_assignments table'],
                      ['TA permissions', 'gw_profiles.ta_permissions JSONB', 'role_permissions with scope'],
                      ['Role levels', 'dashboard_modules.min_role_level', 'role_permissions + subscription tier'],
                      ['Permission scope', 'Global only', 'scope_type + scope_id'],
                      ['Subscription gate', 'None', 'dashboard_modules.min_subscription_tier'],
                      ['Deny rules', 'None', "role_permissions.effect = 'deny'"],
                      ['Context switching', 'None', 'OfferingSelector component'],
                    ].map(([item, v1, v2], i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3 font-medium">{item}</td>
                        <td className="p-3 text-destructive"><code>{v1}</code></td>
                        <td className="p-3 text-green-600"><code>{v2}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>

          {/* Implementation Note */}
          <Card className="border-2 border-primary">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Lock className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold">Implementation Note</h3>
                  <p className="mt-2 text-muted-foreground">
                    Implement these changes exactly. <strong>Do not keep the old boolean TA model or min_role_level.</strong>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground py-8">
            GleeWorld Unified Dashboard Architecture v2.0 • Last Updated: January 2026
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
