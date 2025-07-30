import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Book, Users, Crown, Music } from "lucide-react";

export const HandbookModule = () => {
  const artisticLeadership = [
    { position: "Student Conductor", description: "Lead musical direction, conduct rehearsals and performances" },
    { position: "Soprano 1 Section Leader", description: "Lead soprano 1 section, coordinate voice part activities" },
    { position: "Soprano 2 Section Leader", description: "Lead soprano 2 section, coordinate voice part activities" },
    { position: "Alto 1 Section Leader", description: "Lead alto 1 section, coordinate voice part activities" },
    { position: "Alto 2 Section Leader", description: "Lead alto 2 section, coordinate voice part activities" },
  ];

  const executiveOfficers = [
    { position: "President", description: "Overall leadership, strategic direction, and system oversight" },
    { position: "Vice President", description: "Support president, backup leadership, special projects" },
    { position: "Secretary", description: "Meeting minutes, communications, and record keeping" },
    { position: "Treasurer", description: "Financial management, budgets, payments, and financial reporting" },
    { position: "Tour Manager", description: "Coordinate tours, travel arrangements, and logistics" },
    { position: "Road Manager", description: "Manage equipment, transportation, and on-site logistics" },
    { position: "Merchandise Manager", description: "Oversee merchandise sales, inventory, and fulfillment" },
    { position: "Public Relations Coordinator", description: "Lead marketing, social media, and public relations" },
    { position: "Public Relations Co-Manager 1", description: "Support PR coordinator, assist with marketing initiatives" },
    { position: "Public Relations Co-Manager 2", description: "Support PR coordinator, assist with marketing initiatives" },
    { position: "Historian", description: "Club history, documentation, and archival management" },
    { position: "Alumnae Liaison", description: "Primary connection with alumnae community" },
    { position: "Alumnae Correspondent", description: "Manage alumnae communications and newsletters" },
    { position: "Co-Librarian 1", description: "Organize and manage sheet music library" },
    { position: "Co-Librarian 2", description: "Organize and manage sheet music library" },
    { position: "Co-Wardrobe Mistress 1", description: "Manage performance attire and wardrobe coordination" },
    { position: "Co-Wardrobe Mistress 2", description: "Manage performance attire and wardrobe coordination" },
    { position: "Chaplain", description: "Spiritual guidance, reflection, and member support" },
    { position: "Set-Up Crew Manager", description: "Coordinate stage and equipment setup for performances" },
    { position: "Stage Manager", description: "Manage performance logistics and backstage coordination" },
    { position: "Chief of Staff", description: "Administrative operations, system management, and executive support - has admin-level access to all systems" },
    { position: "Data Analyst", description: "Analyze club data, metrics, and provide insights for decision-making" },
  ];

  const coreValues = [
    "Excellence in Musical Performance",
    "Unity Through Song",
    "Cultural Heritage and Pride",
    "Academic and Artistic Growth",
    "Sisterhood and Community",
    "Service to Others"
  ];

  const motto = "To Amaze and Inspire";

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Book className="h-5 w-5 text-primary" />
          Glee Club Handbook
        </CardTitle>
        <CardDescription>
          Official handbook for the Spelman College Glee Club - celebrating 100+ years of musical excellence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Motto and Mission */}
        <div className="text-center p-4 bg-primary/5 rounded-lg border">
          <h3 className="text-lg font-semibold text-primary mb-2">Our Motto</h3>
          <p className="text-xl font-bold text-foreground">"{motto}"</p>
        </div>

        {/* Core Values */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            Core Values
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {coreValues.map((value, index) => (
              <Badge key={index} variant="secondary" className="justify-start p-2">
                {value}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Artistic Leadership */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Music className="h-4 w-4 text-blue-500" />
            Artistic Leadership (5 positions)
          </h3>
          <div className="space-y-3">
            {artisticLeadership.map((role, index) => (
              <div key={index} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="font-medium text-blue-800">{role.position}</div>
                <div className="text-sm text-blue-600 mt-1">{role.description}</div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Executive Officers */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            Managing Leadership / Executive Officers (19 positions)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {executiveOfficers.map((role, index) => (
              <div key={index} className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <div className="font-medium text-purple-800">{role.position}</div>
                <div className="text-sm text-purple-600 mt-1">{role.description}</div>
                {role.position === "Chief of Staff" && (
                  <Badge variant="destructive" className="mt-2 text-xs">
                    Admin Access
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Organization Summary */}
        <div className="bg-background p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Organization Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Positions:</span>
              <span className="ml-2">24</span>
            </div>
            <div>
              <span className="font-medium">Artistic Leadership:</span>
              <span className="ml-2">5 roles</span>
            </div>
            <div>
              <span className="font-medium">Executive Officers:</span>
              <span className="ml-2">19 roles</span>
            </div>
            <div>
              <span className="font-medium">Co-positions:</span>
              <span className="ml-2">6 roles</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};