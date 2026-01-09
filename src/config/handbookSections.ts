// Handbook sections configuration for MUS 070 (Glee Club)
// Content sourced from the official SCGC Handbook 2023-2024

export interface HandbookSection {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  orderIndex: number;
  icon: string;
  isVisible: boolean;
  content: string;
}

export const HANDBOOK_SECTIONS: HandbookSection[] = [
  {
    id: "welcome",
    slug: "welcome",
    title: "Statement by the Director",
    shortTitle: "Welcome",
    orderIndex: 1,
    icon: "MessageSquare",
    isVisible: true,
    content: `# Statement by the Director

Welcome to the Spelman College Glee Club,

We are glad that you have chosen to be a part of our organization. The Spelman College Glee Club has a long history of choral excellence that we are excited to share with you. In return, we ask that you do your very best to represent yourself, your family, this organization, and Spelman College in a manner we can all be proud of.

If you remain, you will grow in ways that you never thought you would or even could. This music-making experience can be one that you treasure for the rest of your life. This organization is the only one of its kind and offers you a high profile, life-changing experience. You are now a part of a long history of Glee Club sisterhood; a relationship that can and will last for the rest of your life.

**Amaze and Inspire,**

**Dr. Kevin P. Johnson**
Director, Spelman College Glee Club

*Revised January 2024*`
  },
  {
    id: "history",
    slug: "history",
    title: "History of the Spelman College Glee Club",
    shortTitle: "History",
    orderIndex: 2,
    icon: "History",
    isVisible: true,
    content: `# History of the Spelman College Glee Club

The Spelman College Glee Club has maintained a formal reputation of choral excellence since it began in 1924. It is an organization that is open by audition to all students of the Spelman College community. The Glee Club's repertoire consists of secular choral literature for women's voices with special emphasis on traditional spirituals, music by African-American Composers, music from different cultures, and other commissioned works.

The Spelman Legacy of song is inextricably entwined in our institutional history. The founders of Spelman College, Sophia B. Packard and Harriet E. Giles, possessed more than a desire to open a school for Black women and girls in the post-slavery South. They desired to establish and teach a curriculum that ensured a well-rounded educational experience. Therefore, instruction in music was introduced into the course offerings early on. Miss Giles, an accomplished pianist, taught music lessons prior to moving to Atlanta. Had it not been for her divine calling, she might very well have had a career as a concert pianist. Yet, the prospect of founding the school that would become Spelman beckoned both Miss Packard and Miss Giles. To help fund the move to Atlanta, Miss Giles sold her beloved piano.

This legacy is embodied in the Spelman College Glee Club, which is the primary performance organization of the College. The Glee Club sings for most major campus events, including Founder's Day Convocation and Baccalaureate and Commencement services. Generations of young women, including those who major and minor in music, as well as those focusing on other areas of study, have given their time, talent, and energy in exchange for membership in this special elite group embedded within the Spelman sisterhood.

---

## Early Beginnings

The beginnings of the Glee Club can be traced back to 1882, just one year after the college opened. In this year, the first joint concert of the Atlanta Baptist Female Seminary (Spelman College) and the Atlanta Baptist Seminary (Morehouse College) was held. This effort evolved into annual music performances and continues today as the Spelman-Morehouse Christmas Carol Concert held every December.

In 1911, Kemper Harreld joined the faculty of Morehouse College, where he established a Glee Club and orchestra. A renowned concert violinist and conductor, he developed a reputation for excellence in classical and folk music. Harreld became a member of the Spelman music faculty in 1927, and was chairman of the music departments of both institutions for twenty-seven years. It was during Harreld's first year at Spelman that President Florence M. Read initiated the first Christmas Carol Concert by the Morehouse and Spelman Glee Clubs in the newly built Sister's Chapel.

Over the years the Christmas Carol Concert has become the perennial highlight of the Christmas season in Atlanta and is presented by both the Spelman and Morehouse College Glee Clubs. The audience swells to over 10,000 for the three-night celebratory concert, and the national television broadcast is widely viewed throughout the country.

---

## Recent Highlights

The Glee Club has had the unique opportunity to perform, on a number of occasions, with the Atlanta Symphony Orchestra and sing with such musicians as Jessye Norman, Indra Thomas, Audra McDonald, and Patti LaBelle. Each year the Spelman College Glee Club, in coalition with the Morehouse College Glee Club and the Atlanta Symphony Orchestra participate in the Martin Luther King, Jr., Birthday celebration; a concert that is broadcasted worldwide. The Glee Club has also been featured on "Performance Today" for National Public Radio.

Major annual performances of the Spelman College Glee Club include:
- The Christmas Carol Concert
- The Spring Concert Tour
- The Spring Concert
- The Annual Spelman-Morehouse-Tuskegee Glee Clubs Black History Month Celebration

The Spelman College Glee Club has traveled throughout the country performing for a variety of audiences. The Glee Club has performed in concert halls such as Fanueil Hall (Boston), the Brooklyn Academy of Music (NY), Avery Fisher Hall at Lincoln Center, Spivey Hall (Atlanta), Symphony Hall (Atlanta), and in churches, high schools, colleges and universities around the country. The choir's international travels have brought them to places such as Brazil, Canada, Italy, and Portugal.

---

## Leadership Legacy

- **Hilda Brendenburg** (1924–1925)
- **Marrion Guthrie** (1925–1926)
- **Stella J. Haugan** (1926–1927)
- **Kemper Harreld** (1927–1933)
- **Willis Laurence James** (1933–1966)
- **Dr. Grace Boggs Smith** (Interim, 1966–1967)
- **Dr. Roland Allison** (1967–1989)
- **Aldrich Adkins** (Interim, 1970–1971)
- **Dr. Ruth B. Stokes** (1990–1991)
- **Dr. Norma Raybon** (1991–1999)
- **Dr. Kevin P. Johnson** (1999–Present)

Dr. Johnson continues to uphold the Glee Club's tradition of choral excellence while amazing and inspiring all those who come in contact with the ensemble.`
  },
  {
    id: "director-biography",
    slug: "director-biography",
    title: "Director Biography",
    shortTitle: "Director Bio",
    orderIndex: 3,
    icon: "User",
    isVisible: true,
    content: `# Director Biography

Dr. Kevin Johnson is an Associate Professor of Music at Spelman College. His teaching opportunities include the Spelman College Glee Club, choral conducting and literature, and several courses relating to general music education.

Dr. Johnson earned a Bachelor's and Master's Degree in Music from California State University, Los Angeles, and the Doctoral Degree from the University of Missouri-Kansas City Conservatory of Music. He taught choral and general music in high schools in Los Angeles for ten years, and has worked as Director of Music at various churches for over twenty years.

Dr. Johnson is an active conductor/clinician for elementary, junior high, and high school honor choruses throughout the United States, and is often invited to provide choral workshops and retreats for music education and churches. Johnson is a choral arranger and composer with works published by Colla Voce, Lion & Lamb Publishers, Treble Clef, and G/A Publishers.

He is a member of the American Society of Composers and Publishers as well as an active member of the American Choral Directors Association. He is a member of Pi Kappa Lambda National Music Honor Society, and has been the recipient of several musical honors and awards throughout the West Coast and Midwest.

*Revised January 2024*`
  },
  {
    id: "leadership",
    slug: "leadership",
    title: "Hierarchy of Leadership",
    shortTitle: "Leadership",
    orderIndex: 4,
    icon: "Users",
    isVisible: true,
    content: `# Hierarchy of Leadership

## Artistic Leadership

| Position | Name |
|----------|------|
| Director | Dr. Kevin P. Johnson |
| Student Conductor | Elycia Woodham |
| Soprano 1 Section Leader | Elycia Woodham |
| Soprano 2 Section Leader | Gabby Campbell |
| Alto 1 Section Leader | Dizni DeBerry |
| Alto 2 Section Leader | Arianna Swindell |
| Band Leader | Vacant |

---

## Managing Leadership

| Position | Name |
|----------|------|
| Director | Dr. Kevin P. Johnson |
| Alumnae Board Representative/Administrator | Clarke Brown |
| President | Gabrielle Campbell |
| Vice President | Simone Moales |
| Secretary | Skylar Mobley |
| Treasurer | Taylor Boldoe |
| Tour Manager | Kathryn Tucker |
| Road Manager | Madison Brown |
| Merchandise Manager | Vacant |
| PR Coordinator | Ava Challenger |
| Co-PR Manager | Dizni Deberry |
| Co-PR Manager | Ava Challenger |
| Historian | Ariana Swindell |
| Alumnae Liaison | Bianca Moore |
| Co-Librarian | Trennedy Wade |
| Co-Librarian | Princess Roper |
| Co-Wardrobe Mistress | Krystine Glover |
| Co-Wardrobe Mistress | Jamaya Grant |
| Set-Up Crew Manager | Vacant |
| Chaplain | Ryan Bates |
| Data Analyst | Nia Legrand |
| Chief of Staff | Nyomi Munson |

---

## How the Executive Board Works

The Spelman College Glee Club operates through a dual leadership structure designed to maintain both artistic excellence and operational efficiency:

**Artistic Leadership** focuses on the musical direction of the ensemble. The Director sets the artistic vision, selects repertoire, and guides musical development. The Student Conductor and Section Leaders work directly on vocal technique, rehearsal preparation, and maintaining musical standards within each voice part.

**Managing Leadership** executes the day-to-day operations and enforces the standards set by the organization. The Executive Board handles logistics, communications, finances, events, and member welfare. Each position has specific responsibilities that collectively ensure the Glee Club functions smoothly both on and off stage.

The two leadership branches work in tandem: the Director and artistic leadership set the musical direction while the Executive Board executes operations and enforces the standards that make performances possible.`
  },
  {
    id: "executive-board-positions",
    slug: "executive-board-positions",
    title: "Executive Board Positions",
    shortTitle: "Exec Positions",
    orderIndex: 5,
    icon: "Briefcase",
    isVisible: true,
    content: `# Executive Board Positions

## Student Conductor
- Assists Glee Club Director as needed
- Provides leadership in discipline, vocal-technique and has strong organizational skills
- Advises section leaders and oversees sectionals
- Coordinates all new general member auditions
- Facilitates warm-ups before rehearsals and performances
- Works in tandem with stage manager to develop riser formations

---

## President
- Oversees the executive board to ensure that all Executive Board Members are performing their elected duties
- Carries out the duties of any executive board member in their absence
- Communicates any and all announcements to Glee Club during rehearsals and meetings
- Organizes executive board elections at the end of the school year
- Writes and delivers speeches on behalf of Glee Club
- Creates agendas, schedules, and oversees monthly Executive Board meetings
- Attends all Glee Club Events
- Issues thank you letters on behalf of the Glee Club
- Lead post rehearsal announcements
- Coordinate exec board meeting schedule
- Revise Glee Club handbook with executive board

---

## Vice President
- Carries out duties of the President in her absence
- Oversees End of Year Banquet and organizes glee club social functions (i.e. Sister Social, etc.)
- Maintains Glee Club sisterhood
- Assists tour manager with logistics of Tour Retreat
- Works in conjunction with Vice President of Morehouse College Glee Club to plan joint social functions (i.e. Brother/Sister Social, Homecoming Tailgate Tent, Christmas Carol Party, etc.)
- Coordinates community service activities
- Maintains cleanliness of the Glee Club Office
- Communicates with the Staff Manager when planning events regarding reserving rooms, purchase orders, ordering food, etc.

---

## Secretary
- Records accurate attendance at all rehearsals and performances and provides updates on attendance to those who request
- Takes detailed notes at all executive board meetings and distributes written minutes after every executive board meeting
- Provides announcements via Microsoft Teams to the glee club body
- Maintains current Glee Club Roster
- Works with Tour Manager to provide excuse letters for performances
- Sends lists for performances to administration for submittal to the Dean
- Provides lists of performances as well as a list of which members are performing
- Provides housing lists for early arrivals/late departures of Glee Club members
- Creates programs for performances
- Maintains Glee Handbook with the President

---

## Treasurer
- Collects all money and keeps accurate records to be turned in at year's end on Microsoft Excel
- Collects dues from each member at the beginning of the year (or semester)
- Allocates a budget for Sister's Social, the Glee Party and Spring Tour
- Works with Tour Manager to distribute money on tour
- Works with Co-Wardrobe Mistresses/Merchandise Manager to keep accurate inventory of Glee Club paraphernalia sales
- Be present at merchandise table during sales
- Updates members on monetary status as needed
- Requests credit card machine when needed
- Responsible for the cash box
- Keep track of all receipts for purchases
- **Dues deadline: Friday before Fall Break**

---

## Tour Manager
- Plans itinerary and communicates with host venues and bus companies for all tours
- Discusses desired areas of the country (e.g. East Coast, Midwest) for Tour with Glee Club Director (which should be done immediately after the Tour Manager position is transferred)
- Plans potential routes for the Spring Tour and presents them to Dr. Johnson for approval
- Considers travel time for the bus since bus companies require drivers to switch after a certain amount of hours
- Recommendation: Any bus ride longer than 6 or 7 hours should be done overnight within the first 2-3 days of tour
- Considers fatigue of traveling group, includes at least two rest days, considers length of time until return to Atlanta
- Once route is approved, Tour Manager begins reaching out to possible host venues (this should begin no later than September)
- Works with Music Department Administrator (Dawn Garvin) to present contract to host venues
- Maintains contact with venues, bus company and hotels to make arrangements
- Create rooming list, on campus parking list, and bus buddy list
- Coordinate Tour Retreat
- Communicates all details and updates regarding tour to the Glee club via Microsoft Teams
- Plans itinerary, food, room assignments, paperwork, wake-up calls and bus details for all tours
- Distributes room keys on the bus
- Coordinates and collaborates with Treasurer, Set-up Crew Manager, Road Manager and Stage Manager when planning tour
- Serve as main contact person on tour

---

## Road Manager
- Plans itinerary and communicates with host venues and bus companies for all off-campus performances
- Plans hotel, food, itinerary, room assignments, paperwork, wake-up calls, bus details for all off-campus performances
- Coordinates and collaborates with Treasurer, Set-up Crew Manager, etc. when planning
- Plan and manage the logistics of local performances (aside from tour and alumnae events ie. Christmas Carol, Baccalaureate)
- Responsible for ensuring that there is food for any events where the host will not be providing food
- Help Tour manager in the planning of Tour retreat
- Ensure that hosts have responded appropriately when it comes to requirements outlined in their contract

---

## Merchandise Manager
- Maintains inventory of all Glee Club merchandise
- Corresponds with Institutional Advancement concerning Glee Club performances
- Uses discretion when notifying Director about replenishing inventory
- Assists with Freshman Orientation
- In charge of selling SCGC merchandise at each performance
- Assembles a publicity team that assists during the semester
- Remains pleasant, approachable and personable when representing the Glee Club

---

## Public Relations Co-Managers / PR Coordinator
- Maintains social networks profiles weekly
- Posts on social media (i.e. Facebook, Instagram, Twitter and Snapchat) leading up to and during performances
- Assists Director in creating flyers for Glee Club auditions and performances
- Responsible for all Glee Club advertisements (flyers, bulletin boards, etc.)
- Maintains the Spelman Glee Website and the SCGC App

---

## Historian
- Archives programs from all Glee Club performances
- Maintains photo and video archive
- Manages Flickr and YouTube accounts
- Administers the SCGC History Test
- Provides historical information for programs and publicity materials

---

## Librarian(s)
- Distributes and collects all music
- Maintains music library organization
- Reports missing or damaged music to the Director
- Ensures all members have complete music folders

---

## Wardrobe Mistress(es)
- Distributes and collects all formal attire
- Maintains wardrobe inventory
- Coordinates fittings for new members
- Reports damaged or missing items
- Ensures dress code compliance at performances

---

## Chaplain
- Leads devotions and prayer before performances
- Provides spiritual support to members
- Coordinates community service opportunities
- Maintains spiritual wellness of the organization`
  },
  {
    id: "executive-board-requirements",
    slug: "executive-board-requirements",
    title: "Executive Board Requirements",
    shortTitle: "Exec Requirements",
    orderIndex: 6,
    icon: "ClipboardCheck",
    isVisible: true,
    content: `# Executive Board Requirements

A Spelman College Glee Club Executive Board Member must:

- Be registered both semesters of the next academic year
- Have been a member of the Glee Club for at least two consecutive semesters unless otherwise appointed by the Directors and President
- Have a minimum **2.7 cumulative GPA**
- Be earning an **A in Glee Club**
- Attend **ALL** executive board meetings
- Attend **ALL** scheduled performances and social events
- Must arrive **fifteen minutes prior** to ALL performance call times
- Must remain post performance to ensure cleanliness
- Fulfill the duties of her position outlined above

**Note:** Absence from executive board meetings, Glee Club social events, or concerts may result in impeachment.

*Revised January 2024*`
  },
  {
    id: "elections-appointments",
    slug: "elections-appointments",
    title: "Elections & Appointments",
    shortTitle: "Elections",
    orderIndex: 7,
    icon: "Vote",
    isVisible: true,
    content: `# Elections & Appointments

## Electoral Process

- Elections will be held prior to the banquet at the close of the Spring Semester
- Each applicant will be required to submit a resume, report for an interview and present a speech
- Each of these sections will be used to calculate the final score as well as a vote from the Glee Club general body
- This vote will be used in combination with the vote from the Director and the Alumnae board to determine the designated winner
- Selection of the Student Conductors and Section Leaders is at the Director's discretion
- Any officer may be removed by majority at the Director's discretion or by the executive board and the Director

---

## Appointment/Application Process

- Position appointments can be decided at the director's discretion
- Glee club members can apply for desired position
- Application submission deadline will be decided by the Director
- Upon applying candidates will be interviewed by the Director, President, current position holder, and a member of the Glee Club Alumnae Board
- Final decision will be made by the Director and announced at the Spring Banquet

**Note:** Either process can be chosen or changed at the Director's discretion

---

## Commitment Clause

- Each executive board member is required to carry out their position for the entire year
- In the event the executive board member cannot carry out their duties, they must meet with the directors and discuss the repercussions
- Executive board members do not have the ability to take a leave of absence
- If an executive board member needs a break that is not excused by the college as medical leave and/or an emergency, they will forfeit their position and are subject to being replaced

*Revised January 2024*`
  },
  {
    id: "commitment-attendance",
    slug: "commitment-attendance",
    title: "Commitment & Attendance",
    shortTitle: "Commitment",
    orderIndex: 8,
    icon: "Calendar",
    isVisible: true,
    content: `# Overview of Glee Club Commitment

A Spelman College Glee Club member must:

- Attend **ALL rehearsals**
- Attend **Glee Club Retreat**
- Attend **ALL performances**
- Use **Microsoft Teams** for all announcements and attendance information
- Attend required weekly sectionals at the discretion of the section leader
- Use and return all music scores
- Return garment bag after each semester
- Return formal attire at the end of the school year or semester
- Respect Glee Club Director and all other Glee Club members
- Pay required dues to Treasurer*
- Pass all given quizzes pertaining to SCGC History
- Display appropriate behavior during Glee Club rehearsal
- Complete all music sight-readingfactory.com assignments
- Adhere to the attendance policy (see below)

*\\* Failure to pay dues will result in revocation of Christmas Carol participation and other Glee Club events/venues as prescribed by the Director*

**Note:** Any blatant disrespect toward the Glee Club Director, Student Director or President will result in immediate dismissal from the classroom. Any disruptive behavior occurring amongst Glee Club members will result in immediate dismissal.

---

## Attendance Policy

Each student is allowed to miss **three classes** with no penalty. Any absence, beyond three, lowers the grade by **one letter grade**. Students who miss **six classes** will be **dropped from the class**. Exceptions will be made for extenuating circumstances (chronic illness or family emergencies) to be determined by the professor. It is the student's responsibility to communicate with the professor when there is a problem in attending class.

### Tardiness

- Each student is allowed to be tardy **3 times** without penalty
- A tardy will be issued when any student is not in the classroom when class begins
- Any **2 tardy occurrences** past the maximum 3 excused tardies will result in **1 absence**
- **Missing a performance** will result in **2 unexcused absences**

### Additional Notes

- Students with classes commencing at 5:05pm will be given until 5:15pm to arrive at rehearsal
- Students must fill out an absence form with the secretary at least a day prior to rehearsal or performance
- Students must register for Glee Club through Banner Web as a class for either 0 or 1 credit

### Rehearsal Expectations

In the Spelman College Glee Club, there are rehearsal expectations. Failure to perform these expectations may grant dismissal from rehearsal resulting in an unexcused absence.

*Revised January 2024*`
  },
  {
    id: "dress-code",
    slug: "dress-code",
    title: "Dress Code",
    shortTitle: "Dress Code",
    orderIndex: 9,
    icon: "Shirt",
    isVisible: true,
    content: `# Dress Code

## Formal Attire

- Formal Black Dress
- Black Sheer Stockings
- ALL Black Closed-toe Shoes
- Black Undergarments
- Pearl Teardrop Earrings
- Pearl Necklace
- Red Lipstick

---

## Informal Black Attire

- Black Blouse *(No cleavage, no sheer/see-through, no spaghetti straps)*
- Black Skirt *(Knee-Length, no side splits, no high splits, loosely fitting)*
- Flesh Tone Sheer Stockings
- Black Undergarments
- Black Closed-toe/Closed-heel/Closed-side shoes
- **No Other Jewelry**
- Natural/Nude Make-up *(No red lipstick)*

---

## Cardigan Attire

- Cardigan *(with top button buttoned; assigned)*
- Blue A-line Skirt *(assigned)*
- Flesh Tone Stockings
- Black Undergarments
- Black Closed-toe Shoes
- Pearl Stud Earrings and Necklace
- Natural/Nude Make-up *(No red lipstick)*

---

## Polo Attire

- Glee Club Polo Shirt
- Blue Jeans or Black Slacks *(will be determined per occasion)*
- Closed-toe/Closed-heel/Closed-side shoes
- Dark Undergarments
- Natural/Nude Make-up
- Nude Lipstick/Lip gloss
- Pearl Stud Earrings and Necklace

---

## Prohibited Items

- **All piercings must be taken out**
- **All tattoos must be covered with make-up**
- **All hair ornaments MUST be black**
- No sparkling make-up, perfume, or body glitter

**Failure to follow any of the above may result in dismissal from performance.**

*Revised January 2024*`
  },
  {
    id: "tour-overview",
    slug: "tour-overview",
    title: "Tour Overview",
    shortTitle: "Tour",
    orderIndex: 10,
    icon: "MapPin",
    isVisible: true,
    content: `# Tour Overview

During **Spring break**, selected members of the Spelman College Glee Club participate in the annual Spring Tour. If selected for tour, the Glee Club will tour around from state to state, performing a series of concerts. Transportation by bus and/or airplane will be provided for all participants as well as meals and/or stipend. The touring Glee Club members are selected at the discretion of the director, student conductor and section leaders.

---

## Tour Selection Criteria

- **Musical skill**
- **Attendance**
- **Knowledge of repertoire**
- **Attitude**
- **Flexibility**
- **Evaluation by section leaders**

---

## Domestic Travel History

The Glee Club has traveled to **33 of 50 U.S. states**, including:

Alabama, Arkansas, Arizona, California, Colorado, Connecticut, District of Columbia, Delaware, Florida, Kansas, Kentucky, Illinois, Indiana, Iowa, Louisiana, Massachusetts, Maryland, Michigan, Missouri, Minnesota, Mississippi, Nevada, North Carolina, New Jersey, New York, Ohio, Oklahoma, Pennsylvania, South Carolina, Tennessee, Texas, Virginia, Wisconsin.

---

## International Travel

- **Canada** (1963)
- **Brazil** (1975)
- **Italy** (2003)
- **Portugal** (2019)

---

## Tour Traditions

### Buckets of Love
Special acknowledgements of Glee Club members done on the bus after a performance.

### Quick Introductions
At the end of the concert, members introduce themselves:
> "Greetings/Hello, my name is [First, Last], I am a [Classification & Major], from [Town, State]."

*Revised January 2024*`
  },
  {
    id: "anti-hazing-policy",
    slug: "anti-hazing-policy",
    title: "Anti-Hazing Policy",
    shortTitle: "Anti-Hazing",
    orderIndex: 11,
    icon: "Shield",
    isVisible: true,
    content: `# Anti-Hazing Policy

The Spelman College Glee Club **does not tolerate any form of verbal or physical hazing** by students. Those accused and found guilty of such actions will be:

- Dropped from the Glee Club course
- No longer be members of the Spelman College Glee Club
- May face disciplinary action by Spelman College

---

## Financial Obligations

For the Spelman College Glee Club to succeed in its varied goals, all members are expected to pay dues to the Treasurer in support of the efforts to present a unified ensemble, to uphold bond-forming traditions with other members, and provide resources like food or swag to the ensemble throughout the year.

### Annual Dues

Dues are an annual one-time payment to cover expenses for the entire academic year. Current dues: **$100 USD**

**Note:** The Treasurer, in consultation with the executive board and with the approval of the Director and/or Program Coordinator, may decide to create a payment plan for members to take advantage of.

---

## Social Fees

Dues paid by each member cover social engagements. Funds cover various social events throughout the year including:

- Food and beverage
- Party favors
- Sister Social
- Retreats
- Outings/gatherings
- End of Year Banquet

Events include annual events in collaboration with the Morehouse College Glee Club like:
- Brother/Sister Social
- Homecoming activities
- Christmas Carol Party

---

## Attire

Uniforms serve to create unity and reflect pride in oneself, in the College, and in the legacy of the Spelman College Glee Club.

### Provided by Glee Club:
- Formal black dress
- Jewelry (pearl necklace & earrings)
- Red lipstick
- Polo
- Glee Club t-shirt
- Tour t-shirt

The formal black dress is considered **property of the College**, to be assigned and returned by members at the start and close of each academic year. Loss or damage of any items may become the financial responsibility of the member to repair or replace.

---

## Music and Folders

Each member of the glee club will be assigned music and a music folder. Music and music folders are considered **property of the College**. Loss or damage of College property may become the financial responsibility of a glee club member to either repair or replace.

*Revised January 2024*`
  },
  {
    id: "merchandise",
    slug: "merchandise",
    title: "Merchandise, Paraphernalia, Recordings",
    shortTitle: "Merchandise",
    orderIndex: 12,
    icon: "ShoppingBag",
    isVisible: true,
    content: `# Merchandise, Paraphernalia, and Recordings

The glee club has merchandise, paraphernalia, and recordings available to members and the public for purchase. These items are typically sold at full concerts on campus, on tour, etc. The Merchandise Manager oversees the production and selling of these items with the assistance of a team of general members that have proven skills in customer service. Members on the Merchandise team should know basic information about the college, the glee club, and the admissions process.

---

## Current Glee Merchandise

| Item | Price |
|------|-------|
| CDs: "Amaze and Inspire", "Pearls of Wisdom", "Negro Spirituals", "Gospel" | $15.00 each |
| CD: "Pearls and Poinsettias" | $25.00 |
| Spelman Glee Phone Wallet | $5.00 |
| Spelman Glee Canvas Bags | $10.00 |
| Spelman Glee Makeup Bag | $5.00 |
| Spelman Glee Water Bottles | $7.00 |
| Spelman Glee Fan | $1.00 |
| T-Shirts | $13.00–$15.00 |
| Hoodies | $30.00–$40.00 |

---

## Branding & Communications

### Official Communications
The President is the voice of the membership of the glee club. The President should be the only student speaking, writing, or awarding on behalf of the ensemble in any official capacity unless otherwise designated by the Director(s) or Program Coordinator.

### Logo
The official logo for the glee club is pictured on the front cover of the handbook. The logo is representative of a pearl and the outline of the glee club's formal black dress attire.

### Website
**www.spelman.edu/gleeclub**

---

## Social Media

| Platform | Handle | Manager |
|----------|--------|---------|
| Facebook | @spelmanglee | Public Relations Manager |
| Instagram | @spelmanglee | Public Relations Manager |
| Twitter | @spelmanglee | Public Relations Manager |
| Flickr | spelmanglee | Historian |
| YouTube | Spelman College Glee Club | Historian |

*All account passwords are surrendered by executive board members at the end of every academic year.*

*Revised January 2024*`
  },
  {
    id: "course-syllabus",
    slug: "course-syllabus",
    title: "Course Syllabus",
    shortTitle: "Syllabus",
    orderIndex: 13,
    icon: "FileText",
    isVisible: true,
    content: `# Course Syllabus

## Glee Club (MUS 070)
**Term:** Spring 2024

---

## Instructor Information

**Instructor:** Dr. Kevin Johnson
**Office:** Fine Arts 105
**Office Hours:** MW 12–1pm or by appointment
**Phone:** 470-622-1392
**Email:**
- Office: kjohns10@spelman.edu
- Personal: kevinskey@mac.com

---

## Course Description

This course is designed to prepare and perform appropriate choral literature at the highest possible level, and to represent Spelman College in public performance. Students will learn proper and healthy singing techniques, musical terms, and choral concepts.

---

## Learning Objectives

1. Expose students to the broad spectrum of choral music styles
2. Develop musical performance skills

---

## Course Objectives

At the end of this course, students will be able to:

1. Perform solfège singing and hand sign techniques
2. Accurately sing musical scales at sight
3. Recognize the value of performing a broad range of choral music styles
4. Perform chosen repertoire for the semester according to stated ensemble goals
5. Accurately recognize musical notation symbols and their meaning
6. Use technology as a means of communicating performance skills via the Internet

---

## Course Materials

This is an auditioned course and all interested singers may audition.

- Students who are accepted into the course are required to enroll for 1 or 0 credit hours
- Attendance is required (see "Grading" below)
- Professional behavior, proper attitude, and full participation are always expected
- Appropriate use of electronic devices will be permitted (such as, music on an iPad in PDF format)
- No food, drink (other than water), or gum chewing are allowed during class

**Prerequisite:** Audition

---

## Assignments/Activities

### Rehearsal Assignments
Each member will be required to attend all scheduled rehearsals and sectionals.

### Video Performance Submission
Students will be required to submit their final performance on Flipgrid.

### Online Sectionals
Students will be required to work in sections led by a section leader via Zoom and/or Microsoft Teams.

### Sight-Singing
Students are required to take 2 weekly sight singing quizzes per week and spend at least 30 minutes per week online practicing sight singing on sightreadingfactory.com

---

## Grading Policies

| Component | Weight |
|-----------|--------|
| Attendance at Sectionals and Rehearsals | 25% |
| Sight Singing – Music Reading | 25% |
| Performances | 50% |

---

## Grading Scale

| Grade | Range |
|-------|-------|
| A | 95% - 100% |
| A- | 90% - 94% |
| B+ | 87% - 89% |
| B | 83% - 86% |
| B- | 80% - 82% |
| C+ | 77% - 79% |
| C | 73% - 76% |
| C- | 70% - 72% |
| D+ | 65% - 69% |
| D | 60% - 64% |
| F | < 59% |

---

## Student Access Statement

Spelman College is committed to ensuring the full participation of all students in its programs. If you have a documented disability, contact the Student Access Center (SAC) at 404-270-5289. Located in MacVicar Hall, Room 106.

---

## Academic Integrity Policy

At the heart of Spelman College's mission is academic excellence, along with the development of intellectual, ethical and leadership qualities. All members of the academic community are expected to follow the basic standards of honesty and integrity as outlined in the Spelman College Code of Conduct.

*Revised January 2024*`
  },
  {
    id: "history-test",
    slug: "history-test",
    title: "History Test & Fact Sheet",
    shortTitle: "History Test",
    orderIndex: 14,
    icon: "GraduationCap",
    isVisible: true,
    content: `# History Test and Factsheet

## History Test

The glee club history test is an opportunity for glee club members to be tested on their knowledge of the glee club history. The glee club history test is to be taken by all glee club members on Microsoft Teams and is administered by the Historian.

---

## Factsheet

### Past Directors

| Director | Years |
|----------|-------|
| Hilda Brendenburg | 1924–1925 |
| Marrion Guthrie | 1925–1926 |
| Stella J. Haugan | 1926–1927 |
| Kemper Harreld | 1927–1933 |
| Willis Laurence James | 1933–1966 |
| Dr. Grace Boggs Smith | Interim, 1966–1967 |
| Dr. Roland Allison | 1967–1989 |
| Aldrich Adkins | Interim, 1970–1971 |
| Ruth B. Stokes | 1990–1991 |
| Dr. Norma Raybon | 1991–1999 |
| Dr. Kevin P. Johnson | 1999–Present |

---

## Annual Performances

- When & Where I Enter (New Student Orientation)
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

## Notable Performances

- Inauguration for President Jimmy Carter
- White House Performance for President Barack Obama
- Martin Luther King Jr. Birthday Celebration
- Terras Sem Sombra Festival (Portugal)
- 2018 ACDA Southern Region Conference
- 2012 Ambassadors Ball (Obama Inauguration)

---

## Notable Venues

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

## Notable Collaborations

- Atlanta Ballet
- Atlanta Symphony Orchestra
- Kathleen Battle
- Natalie Cole
- Dance Theatre of Harlem
- The King Center
- Aretha Franklin
- Audra McDonald
- Morehouse College Glee Club
- Patti LaBelle
- Jessye Norman
- Phylicia Rashad
- South African Youth Choir
- Indra Thomas
- Stevie Wonder
- Vocal Essence

---

## Traditions

### General Traditions
- **Sister's Social:** Time for incoming first years to share their voices with the organization
- **Brother Sister Social:** First years of SCGC meet with freshmen of MCGC and receive a Glee Brother
- **Acknowledgement of Madame President:** When President is introduced, Glee Club stands and claps

### Song Traditions
- **Thank You Song:** Sung to hosts after tour performances
- **Birthday Song:** Special rendition sung each month
- **Bus Driver Song:** Thank you to bus drivers after off-campus performances
- **Spelman Hymn:** Words and Music by Eddye Money Shivery C '34
- **"A Choice to Change the World":** Written by Dr. Kevin Johnson and Sarah

### Christmas Carol Traditions
- **Senior Tributes:** Last night backstage, underclassmen share tribute to seniors
- **Amen Run:** Quick exit from Chapel after "Amen"
- **Christmas Carol Staples:** Hail to the Lord's Anointed, Behold the Star, We Are Christmas, The First Noel, Joy to the World, Hark the Herald Angels Sing, Go Tell it on the Mountain

### Tour Traditions
- **Buckets of Love:** Acknowledgements on the bus after performances
- **Quick Introductions:** Members introduce themselves at end of concerts

---

## Annual Social Events

- Sister Social
- Brother Sister Social
- Christmas Carol Watch Party
- Homecoming Tent
- Sunday Evening Christmas Carol

---

## Broadcasts

- Christmas Carol Live Stream
- Sister's Chapel Christmas Carol Broadcast
- National Public Radio
- Georgia Public Radio
- CNN
- Minneapolis Public Radio
- BET Honors

*Revised January 2024*`
  },
  {
    id: "contract-agreement",
    slug: "contract-agreement",
    title: "Contract Agreement",
    shortTitle: "Contract",
    orderIndex: 15,
    icon: "FileSignature",
    isVisible: true,
    content: `# Contract Agreement

I _________________________________, have read and understand the terms and conditions of the Spelman College Glee Club, and accept the responsibilities with knowledge of all consequences.

**Date:** ___________________________

---

## Before Signing

Before you can sign the official Glee Club Contract, you must:

1. **Read the entire handbook** carefully
2. **Complete the Handbook Comprehension Exam** with a passing score
3. **Sign digitally** using the signature tool below

Your signature indicates that you:
- Have read and understood all policies in this handbook
- Agree to abide by all rules and expectations
- Accept all responsibilities and consequences outlined herein
- Commit to representing the Spelman College Glee Club with excellence

---

*Revised January 2024*`
  }
];

export const getHandbookSectionBySlug = (slug: string): HandbookSection | undefined => {
  return HANDBOOK_SECTIONS.find(section => section.slug === slug);
};

export const getHandbookSectionById = (id: string): HandbookSection | undefined => {
  return HANDBOOK_SECTIONS.find(section => section.id === id);
};

export const getVisibleHandbookSections = (): HandbookSection[] => {
  return HANDBOOK_SECTIONS.filter(section => section.isVisible).sort((a, b) => a.orderIndex - b.orderIndex);
};
