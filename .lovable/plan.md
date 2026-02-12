

## Create Blues Album Review Rubric

### What will happen

A new custom rubric will be created specifically for the "Review a Blues Album" assignment, replacing the current generic Writing Assignment Rubric. The rubric will have 5 categories totaling 100 points, matching your specifications exactly.

### Rubric Structure

| Category | Max Points |
|----------|-----------|
| Musical Listening & Description | 40 |
| Use of Musical Examples | 20 |
| Organization & Structure | 15 |
| Cultural Context | 15 |
| Technical Quality & Timing | 10 |
| **Total** | **100** |

Each criterion will include the full A/B/C/D-F grade-level descriptions you provided, stored in the criterion description field so the grading system can reference them.

### Technical Steps

1. **Insert new rubric** into `gw_universal_rubrics` with:
   - Name: "Blues Album Review Rubric"
   - Course: MUS 240
   - Total points: 100
   - 5 criteria with detailed descriptions including grade-level expectations
   - Visibility enabled before submission and after grading

2. **Update the assignment** (`ebc6c16b-309c-4054-aca3-fde186db3bf4`) to point to the new rubric ID

3. The bonus (+5 creative framing) will be noted in the rubric description since the rubric system uses fixed max points per criterion

No code changes are needed -- this is purely a database operation using the existing rubric infrastructure.

