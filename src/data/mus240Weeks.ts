export interface Track {
  title: string;
  source: string;
  url: string;
}

export interface Week {
  number: number;
  date: string;
  title: string;
  tracks: Track[];
}

export const WEEKS: Week[] = [
  {
    number: 1,
    date: "August 26, 2025",
    title: "Introduction to African American Music",
    tracks: [
      {
        title: "Swing Low, Sweet Chariot",
        source: "Traditional Spiritual",
        url: "https://www.youtube.com/watch?v=example1"
      },
      {
        title: "Wade in the Water",
        source: "Traditional Spiritual",
        url: "https://www.youtube.com/watch?v=example2"
      }
    ]
  },
  {
    number: 2,
    date: "September 2, 2025",
    title: "Spirituals and Work Songs",
    tracks: [
      {
        title: "Go Down Moses",
        source: "Traditional Spiritual",
        url: "https://www.youtube.com/watch?v=example3"
      },
      {
        title: "Pick a Bale of Cotton",
        source: "Traditional Work Song",
        url: "https://www.youtube.com/watch?v=example4"
      }
    ]
  },
  {
    number: 3,
    date: "September 9, 2025",
    title: "Blues Origins",
    tracks: [
      {
        title: "Cross Road Blues",
        source: "Robert Johnson",
        url: "https://www.youtube.com/watch?v=example5"
      },
      {
        title: "St. Louis Blues",
        source: "W.C. Handy",
        url: "https://www.youtube.com/watch?v=example6"
      }
    ]
  },
  {
    number: 4,
    date: "September 16, 2025",
    title: "Early Jazz and Ragtime",
    tracks: [
      {
        title: "The Entertainer",
        source: "Scott Joplin",
        url: "https://www.youtube.com/watch?v=example7"
      },
      {
        title: "Livery Stable Blues",
        source: "Original Dixieland Jazz Band",
        url: "https://www.youtube.com/watch?v=example8"
      }
    ]
  },
  {
    number: 5,
    date: "September 23, 2025",
    title: "Swing Era",
    tracks: [
      {
        title: "Take the A Train",
        source: "Duke Ellington",
        url: "https://www.youtube.com/watch?v=example9"
      },
      {
        title: "In the Mood",
        source: "Glenn Miller",
        url: "https://www.youtube.com/watch?v=example10"
      }
    ]
  }
];