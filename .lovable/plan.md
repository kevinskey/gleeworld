

# Upgrading Glee Assistant to a Full AI Agent

## Overview

You already have a **Glee Assistant** that's about 70% built! It has:
- Voice activation ("Hey Glee")
- Navigation capabilities
- Music library search
- Radio control
- Basic admin tools (password reset, user management)
- ElevenLabs voice responses

What's missing are the **enrollment management** and **content creation** tools you need. I'll upgrade the existing assistant to become a full "digital enrollment manager" that can:

1. **Answer questions about anything on GleeWorld** (trained on site knowledge)
2. **Create tests, polls, and quizzes** via natural language
3. **Generate and send email reports** (like the schedule status we just did)
4. **Manage enrollments and student data**

---

## What You'll Be Able to Do

After this upgrade, you can say things like:

**Enrollment Management:**
- "How many students submitted their class schedules?"
- "Send Jordyn a list of students who haven't submitted schedules"
- "Show me enrollment stats for MUS-240"
- "Which students haven't completed the orientation form?"

**Test & Quiz Creation:**
- "Create a 10-question quiz about the Great Migration"
- "Generate a poll asking students about rehearsal times"
- "Make a true/false test on Gospel music history"

**Knowledge Questions:**
- "What's the attendance policy?"
- "How do I submit a tour absence request?"
- "When is the last day of class?"
- "What are the exec board positions?"

---

## Implementation Plan

### Phase 1: Knowledge Base Integration
Enhance the system prompt with comprehensive GleeWorld knowledge including:
- All site features and how to use them
- Course policies and procedures
- Handbook content (attendance, dress code, exec positions)
- Common FAQs and workflows

### Phase 2: New Tools for Enrollment Management

Add these tools to the glee-assistant edge function:

```text
┌─────────────────────────────────────────────────────────────┐
│                    NEW ASSISTANT TOOLS                      │
├─────────────────────────────────────────────────────────────┤
│ check_schedule_submissions                                  │
│   → Get list of students who have/haven't submitted         │
│     their class schedules                                   │
├─────────────────────────────────────────────────────────────┤
│ get_enrollment_stats                                        │
│   → Get enrollment statistics for any course                │
│     (enrolled count, completion rates, etc.)                │
├─────────────────────────────────────────────────────────────┤
│ send_report_email                                           │
│   → Send a formatted email report to any member             │
│     (uses the existing send-branded-email function)         │
├─────────────────────────────────────────────────────────────┤
│ create_quick_poll                                           │
│   → Create a poll from natural language description         │
│     (saves to gw_academy_polls or gw_polls)                 │
├─────────────────────────────────────────────────────────────┤
│ generate_test                                               │
│   → Generate a test with AI-created questions               │
│     (uses generate-test-questions function)                 │
├─────────────────────────────────────────────────────────────┤
│ get_student_grades                                          │
│   → Retrieve grade information for students                 │
│     (for generating grade reports)                          │
├─────────────────────────────────────────────────────────────┤
│ search_site_help                                            │
│   → Answer questions about GleeWorld features               │
│     using the comprehensive knowledge base                  │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: Enhanced System Prompt

Update the AI's knowledge to include:
- Complete site navigation guide
- All form types and their purposes
- Course structure and requirements
- Common administrative workflows
- Email templates and best practices

---

## Technical Details

### Files to Modify

1. **`supabase/functions/glee-assistant/index.ts`**
   - Add 7 new tool definitions
   - Implement tool execution handlers
   - Expand the system prompt with site knowledge

2. **`src/components/assistant/GleeAssistant.tsx`**
   - Add handling for new action types (poll creation, email sent confirmation)
   - Show toast notifications for completed tasks

### Database Queries the Assistant Will Use

The assistant will query these tables:
- `student_class_schedules` - Schedule submissions
- `gw_course_enrollments` - Enrollment data
- `gw_profiles` - User information for emails
- `gw_academy_polls` - Poll creation
- `test_drafts` - Test creation
- `test_questions` - Test question storage

### Security

All new tools will:
- Check admin/instructor permissions before executing
- Use the existing Supabase service role client
- Log actions to the audit trail

---

## Expected Outcome

The Glee Assistant will become your personal administrative AI that:

✅ Answers any question about GleeWorld instantly  
✅ Generates enrollment and grade reports on demand  
✅ Sends branded emails to anyone with natural language  
✅ Creates tests, quizzes, and polls from simple descriptions  
✅ Handles routine administrative tasks through conversation  

You'll be able to manage the Glee Club directly from the assistant bubble on your dashboard!

