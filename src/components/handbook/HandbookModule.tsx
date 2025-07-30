import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Book, Search } from "lucide-react";
import { useState } from "react";

export const HandbookModule = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Handbook sections structure
  const handbookSections = [
    {
      id: "director-statement",
      title: "Director's Statement",
      content: "Director's statement content will be added here from the PDF handbook..."
    },
    {
      id: "history",
      title: "History of the Spelman College Glee Club",
      content: "History content will be added here from the PDF handbook..."
    },
    {
      id: "director-bio",
      title: "Director Biography",
      content: "Director biography content will be added here from the PDF handbook..."
    },
    {
      id: "leadership-roles",
      title: "Leadership & Roles",
      content: "Leadership and roles content will be added here from the PDF handbook..."
    },
    {
      id: "executive-requirements",
      title: "Executive Board Requirements",
      content: "Executive board requirements content will be added here from the PDF handbook..."
    },
    {
      id: "membership-commitment",
      title: "Membership Commitment",
      content: "Membership commitment content will be added here from the PDF handbook..."
    },
    {
      id: "dress-code",
      title: "Dress Code",
      content: "Dress code content will be added here from the PDF handbook..."
    },
    {
      id: "tour-overview",
      title: "Tour Overview",
      content: "Tour overview content will be added here from the PDF handbook..."
    },
    {
      id: "anti-hazing-financial",
      title: "Anti-Hazing & Financial Obligations",
      content: "Anti-hazing and financial obligations content will be added here from the PDF handbook..."
    },
    {
      id: "branding-pr",
      title: "Branding & PR Information",
      content: "Branding and PR information content will be added here from the PDF handbook..."
    },
    {
      id: "merchandise",
      title: "Merchandise Details",
      content: "Merchandise details content will be added here from the PDF handbook..."
    },
    {
      id: "history-test",
      title: "History Test & Fact Sheet",
      content: "History test and fact sheet content will be added here from the PDF handbook..."
    },
    {
      id: "traditions",
      title: "Traditions",
      content: "Traditions content will be added here from the PDF handbook..."
    },
    {
      id: "course-syllabus",
      title: "Course Syllabus",
      content: "Course syllabus content will be added here from the PDF handbook..."
    },
    {
      id: "contract-agreement",
      title: "Contract Agreement",
      content: "Contract agreement content will be added here from the PDF handbook..."
    }
  ];

  // Filter sections based on search term
  const filteredSections = handbookSections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Book className="h-5 w-5 text-primary" />
          Spelman College Glee Club Handbook 2023–2024
        </CardTitle>
        <CardDescription>
          Official handbook for the Spelman College Glee Club - celebrating 100+ years of musical excellence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search handbook content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Motto */}
        <div className="text-center p-4 bg-primary/5 rounded-lg border">
          <h3 className="text-lg font-semibold text-primary mb-2">Our Motto</h3>
          <p className="text-xl font-bold text-foreground">"To Amaze and Inspire"</p>
        </div>

        {/* Handbook Content Accordion */}
        <Accordion type="multiple" className="w-full">
          {filteredSections.map((section) => (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger className="text-left">
                {section.title}
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-foreground">
                  {section.content}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* No Results Message */}
        {filteredSections.length === 0 && searchTerm && (
          <div className="text-center py-8 text-muted-foreground">
            No sections found matching "{searchTerm}"
          </div>
        )}

        {/* Footer Note */}
        <div className="text-xs text-muted-foreground text-center p-2 bg-muted/20 rounded">
          Content placeholders shown - replace with actual handbook text from PDF
        </div>
      </CardContent>
    </Card>
  );
};