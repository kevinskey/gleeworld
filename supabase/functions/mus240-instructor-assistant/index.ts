import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { task, prompt } = await req.json()

    if (task === 'poll_creation') {
      // Generate a structured poll response
      const pollResponse = await generateMusicTheoryPoll(prompt)
      
      return new Response(
        JSON.stringify({ response: pollResponse }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    return new Response(
      JSON.stringify({ error: 'Unsupported task type' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  } catch (error) {
    console.error('Error in mus240-instructor-assistant:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

async function generateMusicTheoryPoll(prompt: string) {
  // Extract number of questions from prompt
  const questionMatch = prompt.match(/(\d+)\s*questions?/i)
  const numQuestions = questionMatch ? parseInt(questionMatch[1]) : 3

  // Generate sample poll data based on common music theory topics
  const sampleQuestions = [
    {
      question: "Which scale degree is the dominant?",
      options: ["3rd", "4th", "5th", "7th"],
      correct_answer: 2,
      explanation: "The dominant is the 5th scale degree, which creates tension that wants to resolve to the tonic."
    },
    {
      question: "What is the interval between C and G?",
      options: ["Perfect 4th", "Perfect 5th", "Major 6th", "Perfect octave"],
      correct_answer: 1,
      explanation: "C to G is a Perfect 5th, spanning 7 semitones."
    },
    {
      question: "In a major scale, which chord is built on the ii degree?",
      options: ["Major triad", "Minor triad", "Diminished triad", "Augmented triad"],
      correct_answer: 1,
      explanation: "The ii chord in a major scale is a minor triad (e.g., Dm in C major)."
    },
    {
      question: "What time signature has 3 beats per measure with each beat being a quarter note?",
      options: ["2/4", "3/4", "4/4", "6/8"],
      correct_answer: 1,
      explanation: "3/4 time has three quarter note beats per measure, common in waltzes."
    },
    {
      question: "Which mode starts on the 2nd degree of the major scale?",
      options: ["Lydian", "Dorian", "Phrygian", "Mixolydian"],
      correct_answer: 1,
      explanation: "Dorian mode starts on the 2nd degree of the major scale."
    },
    {
      question: "What is the relative minor of C major?",
      options: ["A minor", "D minor", "E minor", "F minor"],
      correct_answer: 0,
      explanation: "A minor is the relative minor of C major, sharing the same key signature."
    }
  ]

  // Select random questions based on the requested number
  const selectedQuestions = sampleQuestions
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.min(numQuestions, sampleQuestions.length))

  // Generate a title based on the prompt
  let title = "Music Theory Quiz"
  if (prompt.toLowerCase().includes("blues")) {
    title = "Blues Theory and Development"
  } else if (prompt.toLowerCase().includes("scale")) {
    title = "Scale Theory Assessment"
  } else if (prompt.toLowerCase().includes("chord")) {
    title = "Chord Progressions and Harmony"
  } else if (prompt.toLowerCase().includes("rhythm")) {
    title = "Rhythm and Time Signatures"
  }

  const pollData = {
    title: title,
    description: `Generated quiz based on: ${prompt.substring(0, 100)}...`,
    questions: selectedQuestions
  }

  return JSON.stringify(pollData)
}