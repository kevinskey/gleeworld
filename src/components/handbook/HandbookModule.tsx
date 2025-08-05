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
      content: `### Artistic Leadership

- **Dr. Kevin P. Johnson** – Director
- **Elycia Woodham** – Student Conductor
- **Elycia Woodham** – Soprano 1 Section Leader
- **Gabby Campbell** – Soprano 2 Section Leader
- **Dizni DeBerry** – Alto 1 Section Leader
- **Arianna Swindell** – Alto 2 Section Leader
- **Vacant** – Band Leader

---

### Managing Leadership

- **Dr. Kevin P. Johnson** – Director
- **Clarke Brown** – Alumnae Board Representative / Administrator
- **Gabrielle Campbell** – President
- **Simone Moales** – Vice President
- **Skylar Mobley** – Secretary
- **Taylor Boldoe** – Treasurer
- **Kathryn Tucker** – Tour Manager
- **Madison Brown** – Road Manager
- **Vacant** – Merchandise Manager
- **Ava Challenger** – PR Coordinator
- **Dizni DeBerry** – Co-PR Manager
- **Ariana Swindell** – Historian
- **Bianca Moore** – Alumnae Liaison
- **Trennedy Wade** – Co-Librarian
- **Princess Roper** – Co-Librarian
- **Krystine Glover** – Co-Wardrobe Mistress
- **Jamaya Grant** – Co-Wardrobe Mistress
- **Vacant** – Set-Up Crew Manager
- **Ryan Bates** – Chaplain
- **Nia Legrand** – Data Analyst
- **Nyomi Munson** – Chief of Staff

---

**Note:** The full duties of each Executive Board position are detailed in the next section: *Executive Board Requirements*.`
    },
    {
      id: "executive-requirements",
      title: "Executive Board Requirements",
      content: `A Spelman College Glee Club Executive Board Member must:

- Be registered both semesters of the next academic year.
- Have been a member of the Glee Club for at least two consecutive semesters unless otherwise appointed by the Directors and President.
- Have a minimum 2.7 cumulative GPA.
- Be earning an A in Glee Club.
- Attend ALL executive board meetings.
- Attend ALL scheduled performances and social events.
- Must arrive fifteen minutes prior to ALL performance call times.
- Must remain post-performance to ensure cleanliness.
- Fulfill the duties of her position as outlined.

**Note:** Absence from executive board meetings, Glee Club social events, or concerts may result in impeachment.

---

### 📋 Electoral Process:

- Elections will be held prior to the banquet at the close of the Spring Semester.
- Each applicant will be required to submit a resume, report for an interview, and present a speech.

#### Scoring:
- Resume, interview, speech, and general body vote are used to calculate the final score.
- This is combined with the vote from the Director and Alumnae Board to determine the winner.

- Selection of the Student Conductors and Section Leaders is at the Director's discretion.
- Any officer may be removed by majority vote at the Director's discretion or by the Executive Board and the Director.

---

### 📌 Appointment / Application Process:

- Positions may be appointed at the Director's discretion.
- Members may apply for desired positions.
- Application submission deadline is determined by the Director.
- Candidates are interviewed by the Director, President, current position holder, and a member of the Alumnae Board.
- Final decisions are made by the Director and announced at the Spring Banquet.

**Note:** Either process (election or appointment) may be chosen or changed at the Director's discretion.

---

### 📜 Commitment Clause:

- Each Executive Board member is required to carry out their position for the entire year.
- If unable to complete their term, members must meet with the Directors to discuss consequences.
- Executive Board members do not have the ability to take a leave of absence.
- If an Exec member needs a break not excused by medical/emergency leave, they will forfeit their position and may be replaced.`
    },
    {
      id: "membership-commitment",
      title: "Membership Commitment",
      content: `A Spelman College Glee Club member must:

- Attend **ALL rehearsals**
- Attend **Glee Club Retreat**
- Attend **ALL performances**
- Use **Microsoft Teams** for all announcements and attendance information
- Attend required weekly sectionals (at the discretion of the section leader)
- Use and return all music scores
- Return garment bag after each semester
- Return formal attire at the end of the school year or semester
- Respect Glee Club Director and all other Glee Club members
- Pay required dues to the Treasurer *
- Pass all quizzes pertaining to SCGC History
- Display appropriate behavior during Glee Club rehearsal
- Complete all **sight-reading** assignments
- Adhere to the attendance policy (see below)

**\\* Failure to pay dues will result in revocation of Christmas Carol participation and other Glee Club events/venues as prescribed by the Director.**

**Note:**
Any blatant disrespect toward the Glee Club Director, Student Director, or President will result in **immediate dismissal** from the classroom. Any disruptive behavior occurring among members will result in the same.

---

## Attendance Policy

- Each student is allowed to miss **3 classes** with no penalty.
- Any absence **beyond three** lowers the grade by **one letter grade**.
- Students who miss **6 classes** will be **dropped from the class**.
- Exceptions will be made for **extenuating circumstances** (chronic illness or family emergencies), at the professor's discretion.
- It is the student's responsibility to **communicate with the professor** about attendance issues.

### Tardiness:

- Each student is allowed **3 tardies** without penalty.
- A tardy will be issued when a student is not in the classroom when class begins.
- **Every 2 tardies beyond the first 3** will result in **1 unexcused absence**.
- **Missing a performance** = **2 unexcused absences**

---

### Additional Attendance Notes:

- Students with classes beginning at **5:05 PM** are excused until **5:15 PM**.
- Students must **fill out an absence form** with the Secretary at least **one day before** any missed rehearsal or performance.
- Students must **register for Glee Club** through **Banner Web** (0 or 1 credit).

---

### Rehearsal Expectations:

Failure to meet rehearsal expectations may result in **dismissal from rehearsal** and an **unexcused absence**.`
    },
    {
      id: "dress-code",
      title: "Dress Code",
      content: `### 🎼 Formal Attire:

- Formal Black Dress
- Black Sheer Stockings
- ALL Black Closed-Toe Shoes
- Black Undergarments
- Pearl Teardrop Earrings
- Pearl Necklace
- Red Lipstick

---

### 🖤 Informal Black Attire:

- Black Blouse
  _(No cleavage, sheer/see-through, or spaghetti straps)_
- Black Skirt
  _(Knee-Length, no side splits or high splits, loosely fitting)_
- Flesh Tone Sheer Stockings
- Black Undergarments
- Black Closed-Toe/Closed-Heel/Closed-Side Shoes
- **No other jewelry**
- **Natural/Nude Makeup** (No red lipstick)

---

### 👗 Cardigan Attire:

- Assigned Cardigan (Top button buttoned)
- Assigned Blue A-Line Skirt
- Flesh Tone Stockings
- Black Undergarments
- Black Closed-Toe Shoes
- Pearl Stud Earrings and Necklace
- Natural/Nude Makeup (No red lipstick)

---

### 👕 Polo Attire:

- Glee Club Polo Shirt
- Blue Jeans or Black Slacks *(varies by occasion)*
- Closed-Toe/Closed-Heel/Closed-Side Shoes
- Dark Undergarments
- Natural/Nude Makeup
- Nude Lipstick or Lip Gloss
- Pearl Stud Earrings and Necklace

---

### 🚫 Prohibited:

- **All piercings must be removed**
- **All tattoos must be covered with makeup**
- **Hair ornaments must be black**
- No sparkling makeup, perfume, or body glitter

**Failure to follow any of the above may result in dismissal from performance.**`
    },
    {
      id: "tour-overview",
      title: "Tour Overview",
      content: `During **Spring Break**, selected members of the Spelman College Glee Club participate in the **annual Spring Tour**. If selected for tour, the Glee Club will travel from state to state, performing a series of concerts.

Transportation (by **bus** and/or **airplane**) will be provided for all participants, along with meals and/or stipend.

**Note:** Touring members are selected at the discretion of the Director, Student Conductor, and Section Leaders.

---

### 📝 Tour Selection Criteria

- **Musical Skill**
- **Attendance**
- **Knowledge of Repertoire**
- **Attitude**
- **Flexibility**
- **Evaluation by Section Leaders**`
    },
    {
      id: "anti-hazing-financial",
      title: "Anti-Hazing & Financial Obligations",
      content: `## Anti-Hazing Policy

The Spelman College Glee Club does **not tolerate any form of verbal or physical hazing** by students. Those accused and found guilty of such actions will be:

- Dropped from the Glee Club course
- Permanently removed from Glee Club membership
- Subject to **disciplinary action by Spelman College**

---

## Financial Obligations

To support the Glee Club's goals, **all members are expected to pay dues** to the Treasurer. These contributions help fund:

- Uniform-related items
- Bonding traditions
- Food, hospitality, and swag for members

---

### 💵 Annual Dues

- Annual one-time payment: **$100 USD**
  _(for the 2020–2021 academic year; updated amounts may apply)_

**Note:**
The Treasurer, in consultation with the Executive Board and with approval of the Director or Program Coordinator, may offer **payment plans** for members.

---

### 🧁 Social Fees

Dues also cover participation in Glee Club social events such as:

- **Sister Social**
- Retreats
- End of Year Banquet
- Outings and Gatherings
- Events in collaboration with the Morehouse College Glee Club:
  - Brother/Sister Social
  - Homecoming Activities
  - Christmas Carol Party

---

### 👗 Attire

Uniforms reflect unity, pride, and the legacy of the SCGC. The **Wardrobe Mistress** will coordinate distribution and care of these items.

**Provided by the Glee Club:**

- Formal black dress (College property)
- Jewelry (pearl necklace & earrings)
- Red lipstick
- Polo shirt
- Glee Club t-shirt
- Tour t-shirt

**Your Responsibility:**

- Return the formal dress and garment bag by end of academic year or upon instruction
- Maintain personal attire and replacements
- Replace lost/damaged items at your own expense

---

### 🎼 Music and Folders

Each member is issued:

- A folder
- Sheet music (College property)

Loss or damage may result in **financial responsibility** to repair or replace these items.`
    },
    {
      id: "branding-pr",
      title: "Branding & PR Information",
      content: `## Glee Club Brand, Communications and Public Relations Information

---

### 📢 Official Communications

The **President** is the official voice of the Glee Club. No other student may speak or write on behalf of the ensemble unless otherwise designated by the **Director(s)** or **Program Coordinator**.

This includes:
- Interviews
- Letters
- Public statements
- Official notes or acknowledgments

---

### 🔐 Account Management

- All **account passwords** (social media, etc.) must be surrendered by Executive Board members at the end of each academic year.
- New logins are generated by the **outgoing/current social media manager**.

---

### 🖋️ Logo

- The official SCGC logo appears on the **cover of the handbook**.
- It symbolizes the **pearl** and the **formal black dress attire** of the Glee Club.

---

### 🌐 Website

**URL:** [www.spelman.edu/gleeclub](http://www.spelman.edu/gleeclub)
The Glee Club's official website is hosted by Spelman College.

**Maintenance:**
Handled by the **Public Relations Manager** and/or **Program Coordinator**.

---

## 📱 Social Media Accounts

Spelman College defines the SCGC pages as **"Organization Pages"**, managed by students and representing the College.

### Facebook
- **Handle:** @spelmanglee
- Managed by: **Public Relations Manager**
- Posting rights: President, Historian, Director(s), and Program Coordinator

### Instagram
- **Handle:** @spelmanglee
- Managed by: **Public Relations Manager**
- All leadership has access, but **must get permission** to post

### Twitter
- **Handle:** @spelmanglee
- Managed by: **Public Relations Manager**
- Permission required from Director or Program Coordinator to publish

### Flickr
- **URL:** [flickr.com/spelmanglee](http://www.flickr.com/spelmanglee)
- Managed by: **Historian**

### YouTube
- **Channel Name:** *Spelman College Glee Club*
- Managed by: **Historian**

---

**Reminder:** Only approved representatives may post on behalf of the Glee Club. Unapproved posts may result in disciplinary action.`
    },
    {
      id: "merchandise",
      title: "Merchandise Details",
      content: `## Merchandise, Paraphernalia, and Recordings

The Spelman College Glee Club offers merchandise, paraphernalia, and recordings for purchase by members and the public. These items are typically sold at:

- Full concerts on campus
- Tour stops
- Special events

---

### 🧾 Sales & Management

- The **Merchandise Manager** oversees all production and sales.
- A **Merchandise Team** may be formed from general members with customer service experience.
- Members of the sales team should be familiar with:
  - Spelman College facts
  - Glee Club mission and history
  - Admissions basics (when asked by guests)

Interested members should contact the **Merchandise Manager** to join the team.

---

### 🛍️ Current Glee Club Merchandise

| Item Description                        | Price         |
|----------------------------------------|---------------|
| CDs: "Amaze and Inspire", "Pearls of Wisdom", "Negro Spirituals", "Gospel" | $15.00 each   |
| CD: "Pearls and Poinsettias"           | $25.00        |
| SCGC Phone Wallet                      | $5.00         |
| SCGC Canvas Bag                        | $10.00        |
| SCGC Makeup Bag                        | $5.00         |
| SCGC Water Bottle                      | $7.00         |
| SCGC Fan                               | $1.00         |
| T-Shirts                               | $13.00–$15.00 |
| Hoodies                                | $30.00–$40.00 |`
    },
    {
      id: "history-test",
      title: "History Test & Fact Sheet",
      content: `## History Test

All Glee Club members are required to complete the **SCGC History Test** to demonstrate their knowledge of the organization's legacy.

- Administered via **Microsoft Teams**
- **Historian** is responsible for distribution and support
- **Test Window:**
  Available: *Friday, September 11th*
  Deadline: *Friday, September 18th*

### Study Materials:
- Handbook
- SCGC Factsheet
- SCGC Traditions

---

## Fact Sheet

### 🎼 Past Directors

- Hilda Brendenburg (1924–1925)
- Marrion Guthrie (1925–1926)
- Stella J. Haugan (1926–1927)
- Kemper Harreld (1927–1933)
- Willis Laurence James (1933–1966)
- Dr. Grace Boggs Smith (Interim, 1966–1967)
- Dr. Roland Allison (1967–1989)
- Aldrich Adkins (Interim, 1970–1971)
- Ruth B. Stokes (1990–1991)
- Dr. Norma Raybon (1991–1999)
- Dr. Kevin P. Johnson (1999–Present)

### 🎹 Notable Organist

- Kemper Harreld (1924–1953)
- Dr. Joyce Johnson (1953–present)

---

## 📆 Annual Performances

- *When & Where I Enter* (New Student Orientation)
- Opening Convocation
- A Day In Your Life
- Christmas Carol
- Annual Spring Tour
- Annual Spring Concert
- Founders Day Convocation
- Spelbound
- Baccalaureate
- Commencement

---

## 🌟 Notable Performances

- Inauguration for President Jimmy Carter
- White House Performance for President Barack Obama
- Martin Luther King Jr. Birthday Celebration
- Terras Sem Sombra Festival (Portugal)
- 2018 ACDA Southern Region Conference
- 2012 Ambassadors Ball (Obama Inauguration)

---

## 🏛️ Notable Venues

- Faneuil Hall, Boston
- Brooklyn Academy of Music, NY
- Avery Fisher Hall at Lincoln Center
- National Museum of American History, D.C.
- The White House
- Mother Emanuel AME Church, Charleston
- Ebenezer Baptist Church, Atlanta
- Sisters Chapel, Spelman College
- King Chapel, Morehouse College
- Spivey Hall
- Atlanta Symphony Hall

---

## 🤝 Notable Collaborations

- Atlanta Ballet
- Atlanta Symphony Orchestra
- Kathleen Battle
- Natalie Cole
- Dance Theatre of Harlem
- The King Center
- Aretha Franklin
- Audra McDonald
- Patti LaBelle
- Jessye Norman
- Phylicia Rashad
- South African Youth Choir
- Indra Thomas
- Stevie Wonder
- VocalEssence
- Morehouse College Glee Club

---

## ✈️ International Travel

- Canada (1963)
- Brazil (1975)
- Italy (2003)
- Portugal (2019)

---

## 🇺🇸 Domestic Travel

The Glee Club has performed in 33 of 50 U.S. states, including:

Alabama, Arkansas, Arizona, California, Colorado, Connecticut, D.C., Delaware, Florida, Kansas, Kentucky, Illinois, Indiana, Iowa, Louisiana, Massachusetts, Maryland, Michigan, Missouri, Minnesota, Mississippi, Nevada, North Carolina, New Jersey, New York, Ohio, Oklahoma, Pennsylvania, South Carolina, Tennessee, Texas, Virginia, Wisconsin

---

## 🎉 Annual Social Events

- Sister Social
- Brother/Sister Social
- Christmas Carol Watch Party
- Homecoming Tent
- Sunday Evening Christmas Carol

---

## 📺 Broadcasts

- Christmas Carol Livestream
- Sisters Chapel Broadcast
- National Public Radio
- Georgia Public Radio
- CNN
- Minneapolis Public Radio
- BET Honors`
    },
    {
      id: "traditions",
      title: "Traditions",
      content: `## Glee Club Traditions

The Spelman College Glee Club, one of the oldest organizations on campus, maintains rich traditions that foster sisterhood, unity, and musical excellence. These traditions are meant to uplift—not to intimidate—and must never violate Glee Club or College policies.

---

### 🎀 General Traditions

- **Sister Social**
  An opportunity for incoming first-years to showcase their voices and officially bond with the ensemble. A signature SCGC experience.

- **Brother/Sister Social**
  First-year SCGC members are paired with first-year MCGC members as "Glee Siblings."

- **Acknowledging Madame President**
  Whenever the President is introduced or introduces herself, the Glee Club stands and claps in acknowledgment.

- **Morehouse Partnership**
  Collaboration with the Morehouse College Glee Club is central. First-year SCGC members are assigned an MCGC sibling.

---

### 🎵 Song Traditions

- **Thank You Song**
  Sung after a tour concert to honor and thank the host.

  > "Thank you all for what you've done
  > To make our stay a very special one
  > So, thank you
  > God bless and keep you every day"

- **Birthday Song**
  Each month, the Glee Club performs a special rendition of "Happy Birthday."

- **Bus Driver Song**
  Sung to thank the bus driver after off-campus performances.

  > "Thank you Mr./Miss Bus Driver
  > Bus driver, bus driver
  > Thank you Mr./Miss Bus Driver
  > Thanks for the ride"

- **Spelman Hymn**
  *Words and Music by Eddye Money Shivery, C '34*

- **"A Choice to Change the World"**
  *Written by Dr. Kevin Johnson and Sarah Stephens, C '07*

- **"We Are Christmas"**
  *Written by Dr. Kevin Johnson and Sarah Stephens, C '07*

---

### 🎄 Christmas Carol Traditions

- **Senior Tributes**
  On the final night of the Christmas Carol Concert, underclass members deliver personal tributes to each senior backstage.

- **Amen Run**
  At the end of each Christmas Carol Concert, after singing "Amen," the Glee Club exits swiftly from Sisters Chapel or Kings Chapel.

- **Christmas Carol Staples**
  - Hail to the Lord's Anointed
  - Behold the Star
  - We Are Christmas
  - The First Noel
  - Joy to the World
  - Hark! The Herald Angels Sing
  - Go Tell It on the Mountain

- **Performance Wardrobe**
  Formal black dress, pearl necklace, teardrop earrings, and red lipstick.

---

### 🚌 Tour Traditions

- **Buckets of Love**
  Special acknowledgments shared by members after performances while riding the tour bus.

- **Quick Introductions**
  At the end of each concert, each member introduces herself:

  > "Greetings/Hello, my name is [First & Last Name],
  > I am a [Classification & Major],
  > From [City, State]"

---

### 🧑🏽‍🎓 First-Year Traditions

A "first-year" member is any student in her **first two semesters** in SCGC, regardless of Spelman class year.

#### Responsibilities Include:

- Mandatory membership on the **Set-Up Crew**
- **Early call times** for events (assigned by Set-Up Crew Manager or First-Year Ambassador)
- Sitting in the **rear of the bus** while traveling
- Receiving items **last** (food, t-shirts, music, etc.)

---

### ⚙️ Set-Up Crew

Comprised of all first-year members, the Set-Up Crew is responsible for:

- Moving and organizing equipment, instruments, and chairs
- Following the directions of the **Set-Up Crew Manager**, **Student Conductor**, or **Stage Manager**

**Note:**
On tour, a "first-year touring member" refers to anyone traveling for the **first time**, regardless of semesters in SCGC.`
    },
    {
      id: "course-syllabus",
      title: "Course Syllabus",
      content: `## Course Title: Glee Club (MUS 070)

### 📅 Term:
**Spring 2024**

---

### 👤 Instructor Information

**Instructor:** Dr. Kevin Johnson
**Office:** Fine Arts 105
**Office Hours:** Monday & Wednesday, 12:00–1:00 PM (or by appointment)
**Phone:** 470-622-1392
**Email:**
- Office: kjohns10@spelman.edu
- Personal: kevinskey@mac.com

---

### 📘 Course Description

This course is designed to prepare and perform appropriate choral literature at the highest possible level, and to represent Spelman College in public performance. Students will learn proper and healthy singing techniques, musical terms, and choral concepts.

---

### 🎯 Learning Objectives

1. Expose students to a broad spectrum of choral music styles.
2. Develop musical performance skills.
3. Foster collaborative learning and professional presentation.
4. Develop leadership skills.

---

### 📚 Course Objectives

By the end of the semester, students will be able to:

1. Perform solfège singing with hand signs.
2. Accurately sing scales at sight.
3. Recognize and interpret diverse choral styles.
4. Perform assigned repertoire to ensemble standards.
5. Identify musical notation symbols and terminology.
6. Use technology (e.g., Flipgrid) to demonstrate performance growth.

---

### 📝 Course Materials

- This is an **auditioned course**; students must be officially enrolled (0 or 1 credit).
- **Attendance is required.**
- Professional behavior is expected at all times.
- Devices such as iPads may be used for digital sheet music (PDF format).
- **No food, drinks (except water), or gum** during rehearsal.

---

### 📌 Prerequisite

- **Audition approval** required

---

### 🎼 Assignments & Activities

#### Rehearsal Assignments
- Full participation in all scheduled rehearsals and sectionals.

#### Video Performance Submission
- Submit final performance via **Flipgrid**.
- Evaluated using a Flipgrid-based rubric.

#### Online Sectionals
- Led by Section Leaders via **Zoom** or **Microsoft Teams**.

#### Sight-Singing
- Minimum **2 quizzes per week** using **sight-reading practice**
- At least **30 minutes of practice** per week.

#### Assessments
- Periodic performance assessments via **Flipgrid**.

---

### 🧮 Grading Breakdown

| Category                      | Weight   |
|------------------------------|----------|
| Sectionals & Rehearsals      | 25%      |
| Sight Singing / Music Reading| 25%      |
| Performances                 | 50%      |

- Late submissions may be penalized.
- Extra credit is at the discretion of the instructor.

---

### 📊 Grading Scale

| Grade | Range    |
|-------|----------|
| A     | 95–100%  |
| A–    | 90–94%   |
| B+    | 87–89%   |
| B     | 83–86%   |
| B–    | 80–82%   |
| C+    | 77–79%   |
| C     | 73–76%   |
| C–    | 70–72%   |
| D+    | 65–69%   |
| D     | 60–64%   |
| F     | <59%     |

---

### 🛑 Attendance Policy (Reiterated)

- Unexcused absence = **1 full letter grade deduction**
- **3 tardies** = 1 absence
- Contact the instructor within **1 week** of absence for possible excusal
- Doctor's note may be required
- Report any known conflicts in the **first week** of class

---

### 📅 Class Flow

Each rehearsal includes:

- Announcements
- Vocal warm-ups
- Music reading
- Literature rehearsal (as ensemble progress dictates)

---

### ♿ Student Access Statement

Spelman College supports full participation of all students. If you have or believe you have a disability, contact the **Student Access Center (SAC)** at 404-270-5289 or visit **MacVicar Hall, Room 106**.

More info: [Spelman SAC Overview](https://www.spelman.edu/student-life/health-and-wellness/student-access-center/overview)

---

### 🧭 Academic Integrity Policy

Academic excellence at Spelman College depends on a community of honesty and respect.

- Follow the **Spelman Code of Conduct** (Student Handbook)
- Maintain ethical standards in class and public behavior
- Violations of the **Academic Integrity Policy** will result in sanctions as outlined in the College Bulletin`
    },
    {
      id: "handbook-exam",
      title: "📘 Final Step: Handbook Comprehension Exam",
      content: `Before signing the official Glee Club Handbook Contract, all members must complete a 15-question comprehension test.

---

### 🧠 Test Overview

- The test is **AI-generated** from the exact content of the 2023–2024 SCGC Handbook.
- Members must earn a **100% score** to proceed to the signature page.
- The test may include multiple-choice, true/false, and short-answer formats.
- Each question pulls from different sections (e.g., Dress Code, Attendance Policy, Exec Roles, Traditions).

---

### ✅ Instructions

1. Click **"Start Handbook Exam"** below.
2. Complete the 15-question assessment.
3. Once you score 100%, you'll be automatically redirected to the final **Contract Agreement** section.
4. If your score is below 100%, you will be prompted to review the missed sections and retake the exam.

---

## 🔒 Access Control (for Lovable to implement)

- **Test access is restricted to authenticated current Members and Execs.**
- The **Historian** has visibility over test analytics, completion status, and can generate reports.
- The exam module should live under the **Historian Dashboard Hub** with its own tile or tab.

---

## 🧩 Feature Requirements (for Dev Team)

- **Module Name:** "Handbook Exam"
- **Location:** Historian Dashboard Hub
- **Connected To:** Handbook Module → Unlocks Contract Agreement section upon pass
- **Scoring Logic:** 15/15 required for completion
- **AI Engine:** Use Lovable's GPT-4 API or custom fine-tuned model based on 2023–2024 SCGC Handbook
- **Storage:** Save results to member profile (including date/time, attempt count, and status)
- **Reset Option:** Allow up to 3 attempts before requiring manual unlock by an Admin or Historian

---

## 💬 Message to Member (on exam completion screen)

> 🎉 Congratulations! You passed the SCGC Handbook Exam with 100%.
> You may now continue to the final step and sign your official Glee Club Contract.

[ → Proceed to Contract Agreement ]`
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