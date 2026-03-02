
# Restore Glee Cam: Photos Appear in Course Landing Slider

## Overview
When a user taps the Camera button, selects "Glee Cam", and takes a photo, that photo will automatically appear in the **CourseTopicSlider** on the landing page of their currently selected course. This creates a live, student-driven photo feed on each class landing page.

## How It Works Today
- Users tap Camera -> Photo -> Glee Cam -> take photo -> saved to `quick_capture_media` table
- The `quick_capture_media` table already has a `course_id` column (currently unused)
- The `GleeCamCard` component shows a scrolling strip of photos but doesn't filter by course
- Each course landing page has a `CourseTopicSlider` that reads from the `gw_universal_sliders` system (admin-managed slides only)
- The `sync-glee-cam-to-heroes` edge function syncs photos to `dashboard_hero_slides` (the main homepage hero, not course-specific)

## Plan

### 1. Save course_id when capturing a Glee Cam photo
- Update `CategorizedQuickCapture.tsx` to import `useCourseContext` and include the `selectedCourseId` in the `quick_capture_media` insert
- This tags every Glee Cam photo with the course the user had selected

### 2. Add a Course Cam slider component to the course landing page
- Create a new `CourseCamSlider` component that queries `quick_capture_media` filtered by `course_id` and `category = 'glee_cam_pic'` and `is_approved = true`
- Display these photos in a compact Embla carousel (similar to the existing `GleeCamCard` marquee style)
- Show the photos in reverse chronological order so newest appear first

### 3. Add CourseCamSlider to course landing pages
- Add the `CourseCamSlider` to `MobileCourseLanding.tsx` (below the CourseTopicSlider or replacing it contextually)
- Also add it to the desktop course views (`TeachingFirstHome`, `StudentDossierHome`) where the `GleeCamCard` or `CourseTopicSlider` appears

### 4. Update GleeCamCard to filter by course when in course view
- The existing `GleeCamCard` already has course-aware logic scaffolded (`isInCourseView`, `selectedCourseId`) but the query doesn't filter by `course_id`
- Add `.eq('course_id', selectedCourseId)` to the query when `isInCourseView` is true

## Technical Details

### Files to modify:
- **`src/components/quick-capture/CategorizedQuickCapture.tsx`** -- Add `useCourseContext` import, include `course_id: selectedCourseId` in the insert data for glee_cam_pic/glee_cam_video categories
- **`src/components/dashboard/GleeCamCard.tsx`** -- Add course_id filter to the query when `isInCourseView && selectedCourseId`
- **`src/components/course/MobileCourseLanding.tsx`** -- Import and render the `GleeCamCard` component with course awareness
- **`src/components/academy/TeachingFirstHome.tsx`** and **`src/components/academy/StudentDossierHome.tsx`** -- Add `GleeCamCard` to desktop course views

### No database changes needed
The `quick_capture_media` table already has a `course_id` column with a foreign key to courses. We just need to start populating it and querying by it.
