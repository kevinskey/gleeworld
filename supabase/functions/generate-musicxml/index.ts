import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    
    console.log("Function started, API key exists:", !!openaiKey);
    console.log("API key length:", openaiKey?.length || 0);
    
    if (!openaiKey) {
      console.error("OpenAI API key not found in environment");
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    const { 
      difficulty = "beginner",
      keySignature = "C major",
      timeSignature = "4/4",
      measures = 8,
      noteRange = "C4-C5"
    } = await req.json();

    console.log("Generating MusicXML:", { difficulty, keySignature, timeSignature, measures, noteRange });

    const systemPrompt = `You are a music theory expert that generates valid MusicXML 3.1 for sight-reading exercises. 

CRITICAL REQUIREMENTS:
1. Always start with <?xml version="1.0" encoding="UTF-8"?>
2. Use <score-partwise version="3.1"> as root element
3. Include proper <part-list> with <score-part id="P1">
4. Each <measure> MUST have <attributes> with divisions, key, time, clef
5. Each <note> MUST have <pitch>, <duration>, and <type>
6. Duration values must be integers based on divisions (quarter note = 4, eighth note = 2, half note = 8)
7. Generate melodic, singable patterns suitable for sight-reading
8. ALWAYS complete the entire XML structure - never truncate
9. End with proper closing tags: </part></score-partwise>
10. MAINTAIN CONSISTENT KEY SIGNATURE throughout the entire exercise
11. Only include key signature in the first measure's attributes
12. Do NOT change key signatures within the exercise unless specifically requested for multi-meter examples

KEY SIGNATURE CONSISTENCY RULES:
- Set the key signature only in measure 1
- All subsequent measures should NOT include <key> elements in their <attributes>
- All notes must conform to the specified key signature throughout
- No accidentals unless part of the melodic pattern within the key

EXAMPLE STRUCTURE FOR MULTI-MEASURE EXERCISE:
<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Voice</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
    <measure number="2">
      <attributes>
        <divisions>4</divisions>
      </attributes>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>

OUTPUT ONLY VALID MUSICXML - NO EXPLANATIONS OR MARKDOWN.`;

    const userPrompt = `Generate a ${difficulty} sight-reading exercise with:
- Key: ${keySignature} (SET ONLY IN MEASURE 1, maintain throughout entire exercise)
- Time signature: ${timeSignature} 
- ${measures} measures total
- Note range: ${noteRange}
- Divisions: 4 (quarter note = 4, eighth note = 2)
- Mix of quarter and eighth notes for ${difficulty} level
- Stepwise motion with occasional small leaps
- COMPLETE XML structure with all ${measures} measures
- Ensure proper closing tags
- CONSISTENT key signature - no key changes within the exercise
- Only include <key> element in measure 1's <attributes>
- All notes must fit within the specified key signature

Generate COMPLETE MusicXML 3.1 format with ALL ${measures} measures using consistent ${keySignature} throughout.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-2025-04-14",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 6000,
      }),
    });

    const result = await openaiRes.json();

    if (!openaiRes.ok) {
      console.error("OpenAI API error:", result);
      return new Response(JSON.stringify({ 
        error: result.error?.message || "Failed to generate MusicXML" 
      }), {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    let musicXML = result.choices[0].message.content;
    console.log("Generated MusicXML length:", musicXML.length);
    
    // Post-process to ensure complete XML structure
    if (!musicXML.includes('</score-partwise>')) {
      console.log("MusicXML appears truncated, attempting to fix...");
      
      // Try to fix common truncation issues
      if (musicXML.includes('<clef>') && !musicXML.includes('</clef>')) {
        // Fix truncated clef element
        const clefIndex = musicXML.lastIndexOf('<clef>');
        if (clefIndex !== -1) {
          const beforeClef = musicXML.substring(0, clefIndex);
          musicXML = beforeClef + `<clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;
        }
      } else {
        // Generic fix - just close the XML properly
        musicXML += `
    </measure>
  </part>
</score-partwise>`;
      }
      
      console.log("Fixed MusicXML length:", musicXML.length);
    }

    return new Response(JSON.stringify({ musicXML }), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Error in generate-musicxml function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  }
});