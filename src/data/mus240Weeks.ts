// src/data/mus240Weeks.ts
export type Track = { title: string; source: string; url: string };
export type Week = { number: number; date: string; title: string; tracks: Track[] };

export const WEEKS: Week[] = [
  {
    number: 1,
    date: "2025-08-27",
    title: "West African Foundations: Rhythm, Call-and-Response, Timeline Patterns",
    tracks: [
      { title: "Agbadza (Ewe) – Keta traditional ensemble", source: "YouTube", url: "https://www.youtube.com/watch?v=oe8AgLwuNAY" },
      { title: "Kinka | Ewe local drumming", source: "YouTube", url: "https://www.youtube.com/watch?v=4b2-JHIsjUI" },
      { title: "Work songs – Library of Congress overview", source: "LOC", url: "https://www.loc.gov/collections/songs-of-america/articles-and-essays/musical-styles/traditional-and-ethnic/traditional-work-songs/" }
    ]
  },
  {
    number: 2,
    date: "2025-09-03",
    title: "Spirituals and Early Blues: From Field Hollers to Form",
    tracks: [
      { title: "Fisk Jubilee Singers – Swing Low, Sweet Chariot", source: "YouTube", url: "https://www.youtube.com/watch?v=QGAsuwK7v1g" },
      { title: "Field Hollers (1939) – John & Ruby Lomax", source: "LOC", url: "https://www.loc.gov/item/lomaxbib000056/" },
      { title: "Ma Rainey – Bo-Weavil Blues", source: "YouTube", url: "https://www.youtube.com/watch?v=0AXsGz5_yg8" }
    ]
  },
  {
    number: 3,
    date: "2025-09-10",
    title: "Ragtime and Piano Traditions",
    tracks: [
      { title: "Scott Joplin – Maple Leaf Rag", source: "Internet Archive", url: "https://archive.org/details/MapleLeafRag_651" },
      { title: "James Scott – Frog Legs Rag", source: "YouTube", url: "https://www.youtube.com/watch?v=6PZ1D6IMgGk" },
      { title: "Eubie Blake – Charleston Rag", source: "YouTube", url: "https://www.youtube.com/watch?v=1qkK4I1f0bE" }
    ]
  },
  {
    number: 4,
    date: "2025-09-17",
    title: "Harlem Renaissance and Early Jazz",
    tracks: [
      { title: "Louis Armstrong – West End Blues", source: "YouTube", url: "https://www.youtube.com/watch?v=4WPCBieSESI" },
      { title: "Duke Ellington – East St. Louis Toodle-Oo", source: "YouTube", url: "https://www.youtube.com/watch?v=Fz5rKX2D4wM" },
      { title: "Bessie Smith – Downhearted Blues", source: "Internet Archive", url: "https://archive.org/details/78_down-hearted-blues_bessie-smith-scrapper-blackwell_tIm2d" }
    ]
  },
  {
    number: 5,
    date: "2025-09-24",
    title: "Swing Era: Big Bands and Popular Culture",
    tracks: [
      { title: "Count Basie – One O'Clock Jump", source: "YouTube", url: "https://www.youtube.com/watch?v=GSt2H2i1R0U" },
      { title: "Benny Goodman feat. Lionel Hampton – Stompin' at the Savoy", source: "YouTube", url: "https://www.youtube.com/watch?v=J2l7dGq1G_0" },
      { title: "Ella Fitzgerald – A-Tisket, A-Tasket", source: "YouTube", url: "https://www.youtube.com/watch?v=H7i6x9xS3kI" }
    ]
  },
  {
    number: 6,
    date: "2025-10-01",
    title: "Gospel Golden Age and WWII Era",
    tracks: [
      { title: "Thomas A. Dorsey – Take My Hand, Precious Lord", source: "YouTube", url: "https://www.youtube.com/watch?v=as1rsZenwNc" },
      { title: "Mahalia Jackson – Move On Up a Little Higher", source: "YouTube", url: "https://www.youtube.com/watch?v=cI3QdQ8pJ4E" },
      { title: "Sister Rosetta Tharpe – Strange Things Happening Every Day", source: "YouTube", url: "https://www.youtube.com/watch?v=JeaBNAXfHfQ" }
    ]
  },
  {
    number: 7,
    date: "2025-10-08",
    title: "Freedom Songs and the Civil Rights Era",
    tracks: [
      { title: "We Shall Overcome – SNCC Freedom Singers", source: "YouTube", url: "https://www.youtube.com/watch?v=QhnPVP23rzo" },
      { title: "Sam Cooke – A Change Is Gonna Come", source: "YouTube", url: "https://www.youtube.com/watch?v=wEBlaMOmKV4" },
      { title: "Nina Simone – Mississippi Goddam", source: "YouTube", url: "https://www.youtube.com/watch?v=ghhaREDM3X8" }
    ]
  },
  {
    number: 8,
    date: "2025-10-15",
    title: "Motown, Stax, and Soul Aesthetics",
    tracks: [
      { title: "The Supremes – Stop! In the Name of Love", source: "YouTube", url: "https://www.youtube.com/watch?v=NPBkiBbO4_4" },
      { title: "Marvin Gaye – What's Going On", source: "YouTube", url: "https://www.youtube.com/watch?v=H-kA3UtBj4M" },
      { title: "Otis Redding – Try a Little Tenderness", source: "YouTube", url: "https://www.youtube.com/watch?v=UnPMoAb4y8U" }
    ]
  },
  {
    number: 9,
    date: "2025-10-22",
    title: "Funk Innovations and the 1970s",
    tracks: [
      { title: "James Brown – Say It Loud – I'm Black and I'm Proud", source: "YouTube", url: "https://www.youtube.com/watch?v=QfJ_jjRvjuo" },
      { title: "Sly & The Family Stone – Thank You (Falettinme Be Mice Elf Agin)", source: "YouTube", url: "https://www.youtube.com/watch?v=7kS8Z1kEJbA" },
      { title: "Parliament – Flash Light", source: "YouTube", url: "https://www.youtube.com/watch?v=F_JF8oSxXtM" }
    ]
  },
  {
    number: 10,
    date: "2025-10-29",
    title: "Soul, Black Power, and Crossover Markets",
    tracks: [
      { title: "Aretha Franklin – Respect", source: "YouTube", url: "https://www.youtube.com/watch?v=6FOUqQt3Kg0" },
      { title: "Curtis Mayfield – Move On Up", source: "YouTube", url: "https://www.youtube.com/watch?v=6Z66wVo7uNw" },
      { title: "Stevie Wonder – Superstition", source: "YouTube", url: "https://www.youtube.com/watch?v=0CFuCYNx-1g" }
    ]
  },
  {
    number: 11,
    date: "2025-11-05",
    title: "Hip-Hop Origins: Bronx to Broadcast",
    tracks: [
      { title: "Grandmaster Flash & The Furious Five – The Message", source: "YouTube", url: "https://www.youtube.com/watch?v=gYKl_6D61hE" },
      { title: "Sugarhill Gang – Rapper's Delight", source: "YouTube", url: "https://www.youtube.com/watch?v=rKTUAESacQM" },
      { title: "DJ Kool Herc – documented breakbeat sets (article)", source: "Britannica", url: "https://www.britannica.com/biography/DJ-Kool-Herc" }
    ]
  },
  {
    number: 12,
    date: "2025-11-12",
    title: "Hip-Hop Golden Age: Innovation and Lyricism",
    tracks: [
      { title: "Public Enemy – Fight the Power", source: "YouTube", url: "https://www.youtube.com/watch?v=8PaoLy7PHwk" },
      { title: "A Tribe Called Quest – Scenario", source: "YouTube", url: "https://www.youtube.com/watch?v=Q6TLWqn82J4" },
      { title: "Lauryn Hill – Doo Wop (That Thing)", source: "YouTube", url: "https://www.youtube.com/watch?v=T6QKqFPRZSA" }
    ]
  },
  {
    number: 13,
    date: "2025-11-19",
    title: "Contemporary I: R&B, Neo-Soul, Digital Production",
    tracks: [
      { title: "D'Angelo – Untitled (How Does It Feel)", source: "YouTube", url: "https://www.youtube.com/watch?v=SxVNOnPyvIU" },
      { title: "Erykah Badu – On & On", source: "YouTube", url: "https://www.youtube.com/watch?v=-CPCs7vVz6s" },
      { title: "J Dilla – Donuts (Intro)", source: "YouTube", url: "https://www.youtube.com/watch?v=jZpWdw1D2ac" }
    ]
  },
  {
    number: 14,
    date: "2025-11-26",
    title: "Contemporary II: Global Streams and Sacred Crossings",
    tracks: [
      { title: "Beyoncé – Formation", source: "YouTube", url: "https://www.youtube.com/watch?v=WDZJPJV__bQ" },
      { title: "Kendrick Lamar – Alright", source: "YouTube", url: "https://www.youtube.com/watch?v=Z-48u_uWMHY" },
      { title: "Maverick City Music – Jireh", source: "YouTube", url: "https://www.youtube.com/watch?v=mC-zw0zCCtg" }
    ]
  },
  {
    number: 15,
    date: "2025-12-03",
    title: "Student Research Presentations & Synthesis",
    tracks: [
      { title: "Student-selected examples aligned to project topics", source: "N/A", url: "#" }
    ]
  }
];

export default WEEKS;