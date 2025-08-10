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
      noteRange = "C4-C5",
      partCount = 1,
      voiceParts = ["Soprano"],
      intervalProfile = "stepwise",
      tempo = 120,
      rhythmicComplexity = "simple",
      noteDensity = "medium",
      cadenceType = "perfect",
      modulationFrequency = "never",
      accidentals = "none"
    } = await req.json();

    console.log("Generating MusicXML:", { difficulty, keySignature, timeSignature, measures, noteRange, partCount, voiceParts, intervalProfile, tempo });

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
- Motion preference: ${intervalProfile}
- Tempo: ${tempo} BPM (include <sound tempo="${tempo}"/> in measure 1)
- Rhythmic complexity: ${rhythmicComplexity}
- Note density: ${noteDensity}
- Cadence type at the end: ${cadenceType}
- Modulation frequency: ${modulationFrequency}
- Accidentals: ${accidentals}
- Parts: ${partCount === 2 ? 'Two-part treble (P1 Soprano, P2 Alto). Use mostly consonant harmony (3rds/6ths), avoid parallel 5ths/octaves, align rhythms.' : `Single-part treble for ${voiceParts[0]}.`}
- COMPLETE XML structure with all ${measures} measures
- Ensure proper closing tags
- CONSISTENT key signature - only include <key> element in measure 1's <attributes>`;

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

    // Ensure tempo tag exists in first measure
    try {
      if (!musicXML.includes('<sound tempo')) {
        musicXML = musicXML.replace(
          /<attributes>([\s\S]*?)<\/attributes>/,
          (match) => `${match}\n      <sound tempo="${tempo}"/>`
        );
      }
    } catch (_) {}

    // Compute normalized key parameters and tag once for reuse
    const __normKey = (keySignature || '').toLowerCase()
      .replace(/♭/g, 'b')
      .replace(/♯/g, '#')
      .replace(/\s+/g, ' ')
      .trim();
    const __isMinor = __normKey.includes('minor');
    const __majorMap: Record<string, number> = {
      'c major': 0, 'g major': 1, 'd major': 2, 'a major': 3, 'e major': 4, 'b major': 5, 'f# major': 6,
      'f major': -1, 'bb major': -2, 'eb major': -3, 'ab major': -4, 'db major': -5, 'gb major': -6
    };
    const __minorMap: Record<string, number> = {
      'a minor': 0, 'e minor': 1, 'b minor': 2, 'f# minor': 3, 'c# minor': 4, 'g# minor': 5, 'd# minor': 6,
      'd minor': -1, 'g minor': -2, 'c minor': -3, 'f minor': -4, 'bb minor': -5, 'eb minor': -6
    };
    const __fifths = __isMinor ? (__minorMap[__normKey] ?? 0) : (__majorMap[__normKey] ?? 0);
    const __mode = __isMinor ? 'minor' : 'major';
    const keyTag = `<key><fifths>${__fifths}</fifths><mode>${__mode}</mode></key>`;

    // Enforce requested key signature (e.g., Eb major => fifths = -3) in measure 1 and remove extra key tags
    try {
      if (/<key>[\s\S]*?<\/key>/.test(musicXML)) {
        // Replace first key tag and drop any subsequent ones
        let replacedFirst = false;
        musicXML = musicXML.replace(/<key>[\s\S]*?<\/key>/g, () => {
          if (replacedFirst) return '';
          replacedFirst = true;
          return keyTag;
        });
      } else {
        // Insert into first attributes block
        musicXML = musicXML.replace(/<attributes>([\s\S]*?)<\/attributes>/, (match, inner) => {
          if (inner.includes('<key>')) return match;
          return `<attributes>${inner}\n        ${keyTag}\n      </attributes>`;
        });
      }
    } catch (e) {
      console.warn('Key enforcement failed:', e);
    }

    // Ensure each part's first measure (number="1") contains the correct key tag in <attributes>
    try {
      musicXML = musicXML.replace(/<measure number="1">([\s\S]*?)<\/measure>/g, (match, inner) => {
        // If attributes exist, replace or insert key inside them
        if (/<attributes>[\s\S]*?<\/attributes>/.test(inner)) {
          const newInner = inner.replace(/<attributes>[\s\S]*?<\/attributes>/, (attr) => {
            if (/<key>[\s\S]*?<\/key>/.test(attr)) {
              return attr.replace(/<key>[\s\S]*?<\/key>/, keyTag);
            }
            return attr.replace('</attributes>', `\n        ${keyTag}\n      </attributes>`);
          });
          return `<measure number="1">${newInner}</measure>`;
        }
        // Otherwise, insert a minimal attributes block with key at the start of the measure
        const injected = `\n      <attributes>\n        <divisions>4</divisions>\n        ${keyTag}\n      </attributes>` + inner;
        return `<measure number="1">${injected}</measure>`;
      });
    } catch (e) {
      console.warn('Per-part key injection failed:', e);
    }

    // Respell accidentals according to key preference (prefer flats in flat keys)
    try {
      if (__fifths < 0) {
        const sharpToFlatStep: Record<string, { step: string; alter: number }> = {
          C: { step: 'D', alter: -1 },
          D: { step: 'E', alter: -1 },
          E: { step: 'F', alter: 0 },
          F: { step: 'G', alter: -1 },
          G: { step: 'A', alter: -1 },
          A: { step: 'B', alter: -1 },
          B: { step: 'C', alter: 0 },
        };
        musicXML = musicXML.replace(/<pitch>([\s\S]*?)<\/pitch>/g, (pb) => {
          const stepMatch = pb.match(/<step>([A-G])<\/step>/);
          const alterMatch = pb.match(/<alter>(-?\d+)<\/alter>/);
          if (!stepMatch) return pb;
          const step = stepMatch[1];
          const alter = alterMatch ? parseInt(alterMatch[1]) : 0;
          if (alter !== 1) return pb;
          const map = sharpToFlatStep[step];
          if (!map) return pb;
          let out = pb.replace(/<step>[A-G]<\/step>/, `<step>${map.step}</step>`);
          if (map.alter === 0) {
            out = out.replace(/<alter>1<\/alter>/, '');
            out = out.replace(/<accidental>sharp<\/accidental>/, '');
          } else {
            out = out.replace(/<alter>1<\/alter>/, `<alter>${map.alter}<\/alter>`);
            out = out.replace(/<accidental>sharp<\/accidental>/, '<accidental>flat<\/accidental>');
          }
          return out;
        });
      }
    } catch (e) {
      console.warn('Accidental respell failed:', e);
    }
    
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