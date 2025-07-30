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
      content: `Welcome to the Spelman College Glee Club,

We are glad that you have chosen to be a part of our organization. The Spelman College Glee Club has a long history of choral excellence that we are excited to share with you. In return, we ask that you do your very best to represent yourself, your family, this organization, and Spelman College in a manner we can all be proud of.

If you remain, you will grow in ways that you never thought you would or even could. This music-making experience can be one that you treasure for the rest of your life. This organization is the only one of its kind and offers you a high profile, life-changing experience. You are now a part of a long history of Glee Club sisterhood; a relationship that can and will last for the rest of your life.

**Amaze and Inspire,**
**Dr. Kevin P. Johnson**
Director, Spelman College Glee Club
*Revised January 2024*`
    },
    {
      id: "history",
      title: "History of the Spelman College Glee Club",
      content: `The Spelman College Glee Club has maintained a formal reputation of choral excellence since it began in 1924. It is an organization that is open by audition to all students of the Spelman College community. The Glee Club's repertoire consists of secular choral literature for women's voices with special emphasis on traditional spirituals, music by African-American Composers, music from different cultures, and other commissioned works.

The Spelman legacy of song is inextricably entwined in our institutional history. The founders of Spelman College, Sophia B. Packard and Harriet E. Giles, possessed more than a desire to open a school for Black women and girls in the post-slavery South. They desired to establish and teach a curriculum that ensured a well-rounded educational experience. Therefore, instruction in music was introduced into the course offerings early on. Miss Giles, an accomplished pianist, taught music lessons prior to moving to Atlanta. Had it not been for her divine calling, she might very well have had a career as a concert pianist. Yet, the prospect of founding the school that would become Spelman beckoned both Miss Packard and Miss Giles. To help fund the move to Atlanta, Miss Giles sold her beloved piano.

This legacy is embodied in the Spelman College Glee Club, which is the primary performance organization of the College. The Glee Club sings for most major campus events, including Founder's Day Convocation and Baccalaureate and Commencement services. Generations of young women, including those who major and minor in music, as well as those focusing on other areas of study, have given their time, talent, and energy in exchange for membership in this special elite group embedded within the Spelman sisterhood.

---

### Early Beginnings

The beginnings of the Glee Club can be traced back to 1882, just one year after the college opened. In this year, the first joint concert of the Atlanta Baptist Female Seminary (Spelman College) and the Atlanta Baptist Seminary (Morehouse College) was held. This effort evolved into annual music performances and continues today as the Spelman-Morehouse Christmas Carol Concert held every December.

In 1911, Kemper Harreld joined the faculty of Morehouse College, where he established a Glee Club and orchestra. A renowned concert violinist and conductor, he developed a reputation for excellence in classical and folk music. Harreld became a member of the Spelman music faculty in 1927, and was chairman of the music departments of both institutions for twenty-seven years. It was during Harreld's first year at Spelman that President Florence M. Read initiated the first Christmas Carol Concert by the Morehouse and Spelman Glee Clubs in the newly built Sister's Chapel.

Over the years the Christmas Carol Concert has become the perennial highlight of the Christmas season in Atlanta and is presented by both the Spelman and Morehouse College Glee Clubs. The audience swells to over 10,000 for the three-night celebratory concert, and the national television broadcast is widely viewed throughout the country.

---

### Recent Highlights

The Glee Club has had the unique opportunity to perform on a number of occasions with the Atlanta Symphony Orchestra and sing with such musicians as Jessye Norman, Indra Thomas, Audra McDonald, and Patti LaBelle.

Each year the Spelman College Glee Club, in coalition with the Morehouse College Glee Club and the Atlanta Symphony Orchestra, participates in the Martin Luther King, Jr., Birthday celebration — a concert that is broadcast worldwide. The Glee Club has also been featured on "Performance Today" for National Public Radio.

Major annual performances of the Spelman College Glee Club include:
- The Christmas Carol Concert
- The Spring Concert Tour
- The Annual Spring Concert
- The Spelman-Morehouse-Tuskegee Black History Month Celebration

The Spelman College Glee Club has traveled throughout the country performing for a variety of audiences in venues like:
- Fanueil Hall (Boston)
- Brooklyn Academy of Music (NY)
- Avery Fisher Hall at Lincoln Center
- Spivey Hall and Symphony Hall (Atlanta)

International travel includes performances in Brazil, Canada, and Italy.

---

### Leadership Legacy

- Kemper Harreld (1927)
- Willis Laurence James (1933–1966)
- Dr. Grace Boggs Smith (Interim)
- Dr. Roland Allison (1967–1989)
- Dr. Ruth B. Stokes (1990–1991)
- Dr. Norma Raybon (1991–1999)
- **Dr. Kevin P. Johnson (1999–Present)**

Dr. Johnson continues to uphold the Glee Club's tradition of choral excellence while amazing and inspiring all those who come in contact with the ensemble.`
    },
    {
      id: "director-bio",
      title: "Director Biography",
      content: `Dr. Kevin Johnson is an Associate Professor of Music at Spelman College. His teaching opportunities include the Spelman College Glee Club, choral conducting and literature, and several courses relating to general music education.

Dr. Johnson earned a Bachelor's and Master's Degree in Music from California State University, Los Angeles, and the Doctoral Degree from the University of Missouri–Kansas City Conservatory of Music. He taught choral and general music in high schools in Los Angeles for ten years, and has worked as Director of Music at various churches for over twenty years.

Dr. Johnson is an active conductor/clinician for elementary, junior high, and high school honor choruses throughout the United States, and is often invited to provide choral workshops and retreats for music education and churches. Johnson is a choral arranger and composer with works published by Colla Voce, Lion & Lamb Publishers, Treble Clef, and G/A Publishers.

He is a member of the American Society of Composers and Publishers as well as an active member of the American Choral Directors Association. He is a member of Pi Kappa Lambda National Music Honor Society, and has been the recipient of several musical honors and awards throughout the West Coast and Midwest.

*Revised January 2024*`
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