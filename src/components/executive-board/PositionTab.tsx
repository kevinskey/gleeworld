import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Crown, FileText, DollarSign, MapPin, Shirt, BookOpen, 
  Camera, MessageSquare, Heart, BarChart3, Music2, UserCheck 
} from "lucide-react";
import { PRCoordinatorHub } from "@/components/pr-coordinator/PRCoordinatorHub";

export type ExecutivePosition = 
  | 'president'
  | 'secretary' 
  | 'treasurer'
  | 'tour_manager'
  | 'wardrobe_manager'
  | 'librarian'
  | 'historian'
  | 'pr_coordinator'
  | 'chaplain'
  | 'data_analyst'
  | 'assistant_chaplain'
  | 'student_conductor'
  | 'section_leader_s1'
  | 'section_leader_s2'
  | 'section_leader_a1'
  | 'section_leader_a2'
  | 'set_up_crew_manager';

interface PositionTabProps {
  position: ExecutivePosition;
}

const positionData = {
  president: {
    icon: Crown,
    mission: "To lead the Spelman College Glee Club with vision, integrity, and dedication to excellence. Foster unity, uphold traditions, and guide the organization toward continued growth and success.",
    responsibilities: [
      "Lead executive board meetings",
      "Represent the Glee Club at official events",
      "Plan and oversee elections",
      "Maintain handbook and organizational documents",
      "Coordinate with college administration",
      "Set strategic vision and goals"
    ],
    tasks: [
      "Upload weekly meeting agendas",
      "Review and approve budget proposals",
      "Plan semester elections",
      "Update organization handbook",
      "Schedule leadership development sessions"
    ],
    collaborators: ["secretary", "treasurer", "tour_manager"]
  },
  secretary: {
    icon: FileText,
    mission: "To maintain accurate records, facilitate communication, and ensure organizational transparency. Document the Glee Club's journey and preserve institutional memory.",
    responsibilities: [
      "Take detailed meeting minutes",
      "Maintain membership records",
      "Handle correspondence",
      "Manage organizational documents",
      "Coordinate committee communications",
      "Archive important materials"
    ],
    tasks: [
      "Create meeting minutes template",
      "Update member contact database",
      "Send weekly announcements",
      "Archive concert programs",
      "Maintain document repository"
    ],
    collaborators: ["president", "historian", "pr_coordinator"]
  },
  treasurer: {
    icon: DollarSign,
    mission: "To ensure financial responsibility and transparency. Manage resources effectively to support the Glee Club's mission and activities while maintaining fiscal accountability.",
    responsibilities: [
      "Manage organization budget",
      "Track income and expenses",
      "Process member dues",
      "Handle merchandise sales",
      "Prepare financial reports",
      "Oversee fundraising activities"
    ],
    tasks: [
      "Update dues collection tracker",
      "Generate monthly financial reports",
      "Process merchandise inventory",
      "Submit reimbursement requests",
      "Plan fundraising initiatives"
    ],
    collaborators: ["president", "tour_manager", "wardrobe_manager"]
  },
  tour_manager: {
    icon: MapPin,
    mission: "To coordinate travel logistics and ensure memorable, well-organized touring experiences. Plan comprehensive itineraries that enhance musical and personal growth.",
    responsibilities: [
      "Plan tour routes and itineraries",
      "Coordinate transportation",
      "Book accommodations",
      "Manage venue contracts",
      "Organize retreat activities",
      "Handle travel emergencies"
    ],
    tasks: [
      "Map out spring tour route",
      "Upload venue contracts",
      "Generate tour packet materials",
      "Assign retreat room assignments",
      "Create emergency contact lists"
    ],
    collaborators: ["treasurer", "wardrobe_manager", "chaplain"]
  },
  wardrobe_manager: {
    icon: Shirt,
    mission: "To maintain the Glee Club's professional appearance and manage performance attire. Ensure all members are properly outfitted for concerts and special events.",
    responsibilities: [
      "Manage performance attire inventory",
      "Coordinate fittings and alterations",
      "Maintain dress code standards",
      "Track uniform distribution",
      "Plan wardrobe updates",
      "Handle special event attire"
    ],
    tasks: [
      "Conduct uniform inventory",
      "Schedule dress fittings",
      "Update wardrobe guidelines",
      "Coordinate with costume designers",
      "Plan formal wear collection"
    ],
    collaborators: ["treasurer", "tour_manager", "historian"]
  },
  librarian: {
    icon: BookOpen,
    mission: "To curate and maintain the Glee Club's musical repertoire. Organize sheet music, manage the music library, and support the musical growth of all members.",
    responsibilities: [
      "Organize sheet music library",
      "Manage music distribution",
      "Maintain digital archives",
      "Support music education",
      "Coordinate with directors",
      "Track music inventory"
    ],
    tasks: [
      "Catalog new sheet music",
      "Update digital music database",
      "Organize music by difficulty level",
      "Create practice track library",
      "Maintain composer database"
    ],
    collaborators: ["historian", "data_analyst", "secretary"]
  },
  historian: {
    icon: Camera,
    mission: "To preserve the rich history and traditions of the Spelman College Glee Club. Document current activities and maintain the organization's legacy for future generations.",
    responsibilities: [
      "Document events and performances",
      "Maintain historical archives",
      "Create yearbook materials",
      "Preserve traditions",
      "Conduct oral history projects",
      "Manage photo collections"
    ],
    tasks: [
      "Upload concert photos",
      "Create semester scrapbook",
      "Interview senior members",
      "Update historical timeline",
      "Organize alumni photo collection"
    ],
    collaborators: ["secretary", "pr_coordinator", "librarian"]
  },
  pr_coordinator: {
    icon: MessageSquare,
    mission: "To promote the Glee Club's mission and achievements. Manage public relations, social media presence, and community engagement to enhance visibility and support.",
    responsibilities: [
      "Manage social media accounts",
      "Create promotional materials",
      "Coordinate media coverage",
      "Handle public communications",
      "Plan marketing campaigns",
      "Engage with alumni network"
    ],
    tasks: [
      "Create concert promotional flyers",
      "Update social media content",
      "Write press releases",
      "Design recruitment materials",
      "Plan alumni engagement events"
    ],
    collaborators: ["historian", "secretary", "chaplain"]
  },
  chaplain: {
    icon: Heart,
    mission: "To provide spiritual guidance and emotional support to Glee Club members. Foster a sense of community, facilitate personal growth, and maintain the organization's spiritual foundation.",
    responsibilities: [
      "Lead devotional activities",
      "Provide pastoral care",
      "Facilitate team building",
      "Support member wellness",
      "Organize service projects",
      "Maintain spiritual traditions"
    ],
    tasks: [
      "Plan weekly devotionals",
      "Organize community service project",
      "Create wellness check-in system",
      "Coordinate spiritual retreat activities",
      "Develop peer support programs"
    ],
    collaborators: ["president", "tour_manager", "pr_coordinator"]
  },
  data_analyst: {
    icon: BarChart3,
    mission: "To support data-driven decision making through analytics and reporting. Track organizational metrics, analyze trends, and provide insights to enhance Glee Club operations.",
    responsibilities: [
      "Analyze attendance patterns",
      "Track performance metrics",
      "Generate analytical reports",
      "Monitor engagement data",
      "Support strategic planning",
      "Create data visualizations"
    ],
    tasks: [
      "Create attendance dashboard",
      "Analyze recruitment trends",
      "Generate performance reports",
      "Track member engagement metrics",
      "Plan data collection strategies"
    ],
    collaborators: ["librarian", "secretary", "treasurer"]
  },
  assistant_chaplain: {
    icon: Heart,
    mission: "To support the Chaplain in providing spiritual guidance and emotional support to Glee Club members. Assist in fostering community, facilitating personal growth, and maintaining the organization's spiritual foundation.",
    responsibilities: [
      "Assist with devotional activities",
      "Support pastoral care initiatives",
      "Help facilitate team building",
      "Support member wellness programs",
      "Assist with service projects",
      "Help maintain spiritual traditions"
    ],
    tasks: [
      "Assist with weekly devotionals",
      "Help organize community service projects",
      "Support wellness check-in system",
      "Assist with spiritual retreat activities",
      "Help develop peer support programs"
    ],
    collaborators: ["chaplain", "president", "tour_manager"]
  },
  student_conductor: {
    icon: Music2,
    mission: "To serve as the Glee Club's Assistant Conductor, supporting musical leadership and development. Guide rehearsals, manage sectional oversight, and assist in developing the choir's musical excellence.",
    responsibilities: [
      "Lead sectional rehearsals",
      "Oversee section leader coordination",
      "Manage SightReadingFactory assignments",
      "Coordinate audition processes",
      "Support vocal technique development",
      "Assist with concert preparation"
    ],
    tasks: [
      "Review weekly sectional plans",
      "Schedule SRF assignments",
      "Manage audition logistics",
      "Review submission materials",
      "Coordinate rehearsal setup",
      "Communicate with sections"
    ],
    collaborators: ["president", "librarian", "chaplain"]
  },
  section_leader_s1: {
    icon: UserCheck,
    mission: "To lead and support the Soprano 1 section through vocal development, team building, and musical excellence. Foster growth, maintain morale, and ensure section cohesion.",
    responsibilities: [
      "Lead sectional rehearsals",
      "Support vocal development",
      "Monitor attendance and engagement",
      "Facilitate peer learning",
      "Coordinate with other sections",
      "Maintain section communication"
    ],
    tasks: [
      "Plan weekly sectional sessions",
      "Upload progress reports",
      "Organize section bonding activities",
      "Track individual vocal growth",
      "Coordinate practice schedules"
    ],
    collaborators: ["student_conductor", "section_leader_s2", "librarian"]
  },
  section_leader_s2: {
    icon: UserCheck,
    mission: "To lead and support the Soprano 2 section through vocal development, team building, and musical excellence. Foster growth, maintain morale, and ensure section cohesion.",
    responsibilities: [
      "Lead sectional rehearsals",
      "Support vocal development", 
      "Monitor attendance and engagement",
      "Facilitate peer learning",
      "Coordinate with other sections",
      "Maintain section communication"
    ],
    tasks: [
      "Plan weekly sectional sessions",
      "Upload progress reports",
      "Organize section bonding activities", 
      "Track individual vocal growth",
      "Coordinate practice schedules"
    ],
    collaborators: ["student_conductor", "section_leader_s1", "librarian"]
  },
  section_leader_a1: {
    icon: UserCheck,
    mission: "To lead and support the Alto 1 section through vocal development, team building, and musical excellence. Foster growth, maintain morale, and ensure section cohesion.",
    responsibilities: [
      "Lead sectional rehearsals",
      "Support vocal development",
      "Monitor attendance and engagement", 
      "Facilitate peer learning",
      "Coordinate with other sections",
      "Maintain section communication"
    ],
    tasks: [
      "Plan weekly sectional sessions",
      "Upload progress reports",
      "Organize section bonding activities",
      "Track individual vocal growth", 
      "Coordinate practice schedules"
    ],
    collaborators: ["student_conductor", "section_leader_a2", "librarian"]
  },
  section_leader_a2: {
    icon: UserCheck,
    mission: "To lead and support the Alto 2 section through vocal development, team building, and musical excellence. Foster growth, maintain morale, and ensure section cohesion.",
    responsibilities: [
      "Lead sectional rehearsals",
      "Support vocal development",
      "Monitor attendance and engagement",
      "Facilitate peer learning", 
      "Coordinate with other sections",
      "Maintain section communication"
    ],
    tasks: [
      "Plan weekly sectional sessions",
      "Upload progress reports",
      "Organize section bonding activities",
      "Track individual vocal growth",
      "Coordinate practice schedules" 
    ],
    collaborators: ["student_conductor", "section_leader_a1", "librarian"]
  }
};

export const PositionTab = ({ position }: PositionTabProps) => {
  // Special case: PR Coordinator gets the full PR Hub
  if (position === 'pr_coordinator') {
    return <PRCoordinatorHub />;
  }
  
  const data = positionData[position];
  const Icon = data.icon;

  const formatPositionName = (pos: string) => {
    return pos.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-6 w-6" />
            {formatPositionName(position)} Mission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">{data.mission}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Key Responsibilities</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.responsibilities.map((responsibility, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2" />
                  <span className="text-sm">{responsibility}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.tasks.map((task, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-secondary rounded-full mt-2" />
                  <span className="text-sm">{task}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collaboration Partners</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.collaborators.map((collaborator) => (
              <Badge key={collaborator} variant="outline">
                {formatPositionName(collaborator)}
              </Badge>
            ))}
          </div>
          <div className="mt-4">
            <Button variant="outline" className="w-full">
              Start Collaboration Chat
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};