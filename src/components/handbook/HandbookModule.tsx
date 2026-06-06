import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Book, Search, GraduationCap, Users, Calendar, Music, Shield, DollarSign, Palette, MapPin, Star, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { HandbookExam } from "./HandbookExam";
import { HandbookContractSigning } from "./HandbookContractSigning";

export const HandbookModule = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [examPassed, setExamPassed] = useState(false);
  const [examScore, setExamScore] = useState(0);
  const [examAttempts, setExamAttempts] = useState(0);
  const [showExam, setShowExam] = useState(false);
  const [showContract, setShowContract] = useState(false);

  const handleExamComplete = (passed: boolean, score: number, attempts: number) => {
    setExamPassed(passed);
    setExamScore(score);
    setExamAttempts(attempts);
    if (passed) {
      setShowContract(true);
    }
  };

  // Handbook sections structure
  const handbookSections = [
    {
      id: "welcome",
      title: "Welcome",
      content: `Welcome to the program. This handbook is a placeholder — your director can replace it with your own welcome message and policies via the Handbook editor.`,
    },
    {
      id: "code-of-conduct",
      title: "Code of Conduct",
      content: `Members are expected to act with respect, professionalism, and integrity at all times. Director-defined expectations can be added here.`,
    },
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
          Your favorite band or choir Handbook 2023–2024
        </CardTitle>
        <CardDescription>
          Official handbook for the Your favorite band or choir - celebrating 100+ years of musical excellence
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
                {section.id === "handbook-exam" ? (
                  <div className="not-prose">
                    <HandbookExam onExamComplete={handleExamComplete} />
                  </div>
                ) : section.id === "contract-agreement" ? (
                  <div className="not-prose">
                    <HandbookContractSigning 
                      examPassed={examPassed}
                      examScore={examScore}
                      examAttempts={examAttempts}
                    />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-foreground">
                    {section.content}
                  </div>
                )}
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

      </CardContent>
    </Card>
  );
};