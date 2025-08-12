
import { useState } from "react";

import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, DollarSign, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventsList } from "@/components/events/EventsList";
import { BudgetsList } from "@/components/events/BudgetsList";
import { TeamsList } from "@/components/events/TeamsList";
import { CreateEventDialog } from "@/components/events/CreateEventDialog";
import { QuickBudgetDialog } from "@/components/events/QuickBudgetDialog";

export default function EventPlanner() {
  const [activeTab, setActiveTab] = useState("all-events");
  const [openCreateEvent, setOpenCreateEvent] = useState(false);
  const [openQuickBudget, setOpenQuickBudget] = useState(false);

  return (
    <UniversalLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Hero Header Section */}
        <div className="relative mb-8 rounded-2xl bg-gradient-to-br from-spelman-blue-dark via-spelman-blue-light to-spelman-blue-dark p-8 backdrop-blur-sm border border-white/20 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-spelman-blue-light/20 backdrop-blur-sm">
                  <Calendar className="h-6 w-6 text-spelman-blue-light" />
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white">
                  Event Budget Planner
                </h1>
              </div>
              <p className="text-lg text-white/80 max-w-2xl">
                Streamline your event planning with comprehensive budget management, 
                team coordination, and expense tracking for all student functions.
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-white/60">
                <button type="button" className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer" onClick={() => setOpenQuickBudget(true)} aria-label="Open Quick Budget">
                  <DollarSign className="h-4 w-4" />
                  <span>Budget Tracking</span>
                </button>
                <button type="button" className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer" onClick={() => setActiveTab('my-teams')} aria-label="Go to My Teams">
                  <Users className="h-4 w-4" />
                  <span>Team Management</span>
                </button>
                <button type="button" className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer" onClick={() => setOpenCreateEvent(true)} aria-label="Open Create Event">
                  <Calendar className="h-4 w-4" />
                  <span>Event Scheduling</span>
                </button>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3 lg:flex-col lg:gap-3">
              <CreateEventDialog open={openCreateEvent} onOpenChange={setOpenCreateEvent} />
              <QuickBudgetDialog open={openQuickBudget} onOpenChange={setOpenQuickBudget} />
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-accent/30 to-primary/30 rounded-full blur-xl opacity-60" />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-full blur-xl opacity-40" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all-events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              All Events
            </TabsTrigger>
            <TabsTrigger value="my-events" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              My Events
            </TabsTrigger>
            <TabsTrigger value="my-budgets" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              My Budgets
            </TabsTrigger>
            <TabsTrigger value="my-teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              My Teams
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all-events" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">All Events</h2>
              <p className="text-muted-foreground">View all events across the organization</p>
            </div>
            <EventsList filter="all-events" />
          </TabsContent>

          <TabsContent value="my-events" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">My Events</h2>
              <p className="text-muted-foreground">Events you've created or are managing</p>
            </div>
            <EventsList filter="my-events" />
          </TabsContent>

          <TabsContent value="my-budgets" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">My Budgets</h2>
              <p className="text-muted-foreground">Budget worksheets you're responsible for</p>
            </div>
            <BudgetsList />
          </TabsContent>

          <TabsContent value="my-teams" className="space-y-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">My Teams</h2>
              <p className="text-muted-foreground">Teams you're leading or collaborating with</p>
            </div>
            <TeamsList />
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
}
