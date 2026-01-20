import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Video, 
  FileText, 
  Music, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Play, 
  ExternalLink,
  Calendar,
  Headphones,
  PenLine,
  FileCheck,
  ChevronRight,
  Lock,
  Unlock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isAfter, isBefore, startOfWeek, endOfWeek } from 'date-fns';
import OrderOfMass from './OrderOfMass';
import EditableModuleResources from './EditableModuleResources';
import EditableLH100Modules from './EditableLH100Modules';

interface ModuleResource {
  id: string;
  title: string;
  type: 'video' | 'reading' | 'audio' | 'document' | 'assignment' | 'quiz' | 'discussion';
  url?: string;
  duration?: string;
  completed?: boolean;
  description?: string;
}

interface WeeklyModule {
  id: string;
  week_number: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_locked: boolean;
  resources: ModuleResource[];
  learning_objectives?: string[];
  completion_percentage?: number;
}

interface CourseModulesProps {
  courseId: string;
  isEnrolled?: boolean;
  isAdmin?: boolean;
}

// LH 100 Bowman Scholars - Liturgical Calendar Modules (Spring 2026)
const LH100_MODULES: WeeklyModule[] = [
  {
    id: 'lh-1',
    week_number: 1,
    title: 'Second Sunday in Ordinary Time',
    description: 'Sunday liturgical preparation and reflection.',
    start_date: '2026-01-18',
    end_date: '2026-01-18',
    is_active: true,
    is_locked: false,
    learning_objectives: [
      'Prepare readings and prayers for Sunday liturgy',
      'Reflect on the Gospel message',
      'Plan music ministry for the celebration'
    ],
    resources: [
      { id: 'lh1-1', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh1-2', title: 'Scripture Reflection', type: 'reading', duration: '20 min', completed: false },
      { id: 'lh1-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-2',
    week_number: 2,
    title: 'Third Sunday in Ordinary Time',
    description: 'Sunday liturgical preparation and reflection.',
    start_date: '2026-01-25',
    end_date: '2026-01-25',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Prepare readings and prayers for Sunday liturgy',
      'Reflect on the Gospel message',
      'Plan music ministry for the celebration'
    ],
    resources: [
      { id: 'lh2-1', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh2-2', title: 'Scripture Reflection', type: 'reading', duration: '20 min', completed: false },
      { id: 'lh2-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-3',
    week_number: 3,
    title: 'Fourth Sunday in Ordinary Time',
    description: 'Sunday liturgical preparation and reflection.',
    start_date: '2026-02-01',
    end_date: '2026-02-01',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Prepare readings and prayers for Sunday liturgy',
      'Reflect on the Gospel message',
      'Plan music ministry for the celebration'
    ],
    resources: [
      { id: 'lh3-1', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh3-2', title: 'Scripture Reflection', type: 'reading', duration: '20 min', completed: false },
      { id: 'lh3-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-4',
    week_number: 4,
    title: 'Presentation of the Lord',
    description: 'Feast day celebration and liturgical preparation.',
    start_date: '2026-02-02',
    end_date: '2026-02-02',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Understand the significance of the Presentation',
      'Prepare special feast day liturgy',
      'Plan celebratory music'
    ],
    resources: [
      { id: 'lh4-1', title: 'Feast Day Reflection', type: 'reading', duration: '25 min', completed: false },
      { id: 'lh4-2', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh4-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-5',
    week_number: 5,
    title: 'Fifth Sunday in Ordinary Time',
    description: 'Sunday liturgical preparation and reflection.',
    start_date: '2026-02-08',
    end_date: '2026-02-08',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Prepare readings and prayers for Sunday liturgy',
      'Reflect on the Gospel message',
      'Plan music ministry for the celebration'
    ],
    resources: [
      { id: 'lh5-1', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh5-2', title: 'Scripture Reflection', type: 'reading', duration: '20 min', completed: false },
      { id: 'lh5-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-6',
    week_number: 6,
    title: 'Sixth Sunday in Ordinary Time',
    description: 'Sunday liturgical preparation and reflection.',
    start_date: '2026-02-15',
    end_date: '2026-02-15',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Prepare readings and prayers for Sunday liturgy',
      'Reflect on the Gospel message',
      'Plan music ministry for the celebration'
    ],
    resources: [
      { id: 'lh6-1', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh6-2', title: 'Scripture Reflection', type: 'reading', duration: '20 min', completed: false },
      { id: 'lh6-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-7',
    week_number: 7,
    title: 'Ash Wednesday',
    description: 'Beginning of Lent - Major observance preparation.',
    start_date: '2026-02-18',
    end_date: '2026-02-18',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Understand the significance of Ash Wednesday',
      'Prepare penitential liturgy',
      'Plan appropriate Lenten music'
    ],
    resources: [
      { id: 'lh7-1', title: 'Ash Wednesday Reflection', type: 'reading', duration: '25 min', completed: false },
      { id: 'lh7-2', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh7-3', title: 'Lenten Music Selection', type: 'audio', duration: '20 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-8',
    week_number: 8,
    title: 'First Sunday of Lent',
    description: 'Sunday liturgical preparation during Lent.',
    start_date: '2026-02-22',
    end_date: '2026-02-22',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Prepare Lenten Sunday liturgy',
      'Reflect on the temptation narrative',
      'Plan penitential music'
    ],
    resources: [
      { id: 'lh8-1', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh8-2', title: 'Scripture Reflection', type: 'reading', duration: '20 min', completed: false },
      { id: 'lh8-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-9',
    week_number: 9,
    title: 'Second Sunday of Lent',
    description: 'Sunday liturgical preparation during Lent.',
    start_date: '2026-03-01',
    end_date: '2026-03-01',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Prepare Lenten Sunday liturgy',
      'Reflect on the Transfiguration',
      'Plan appropriate Lenten music'
    ],
    resources: [
      { id: 'lh9-1', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh9-2', title: 'Scripture Reflection', type: 'reading', duration: '20 min', completed: false },
      { id: 'lh9-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-10',
    week_number: 10,
    title: 'Third Sunday of Lent',
    description: 'Sunday liturgical preparation during Lent.',
    start_date: '2026-03-08',
    end_date: '2026-03-08',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Prepare Lenten Sunday liturgy',
      'Reflect on the Gospel message',
      'Plan appropriate Lenten music'
    ],
    resources: [
      { id: 'lh10-1', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh10-2', title: 'Scripture Reflection', type: 'reading', duration: '20 min', completed: false },
      { id: 'lh10-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-11',
    week_number: 11,
    title: 'Fourth Sunday of Lent (Laetare Sunday)',
    description: 'Mid-Lent celebration - Sunday of joy.',
    start_date: '2026-03-15',
    end_date: '2026-03-15',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Understand the significance of Laetare Sunday',
      'Prepare rose vestment liturgy',
      'Plan music reflecting restrained joy'
    ],
    resources: [
      { id: 'lh11-1', title: 'Laetare Sunday Reflection', type: 'reading', duration: '25 min', completed: false },
      { id: 'lh11-2', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh11-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-12',
    week_number: 12,
    title: 'Saint Joseph, Spouse of the Blessed Virgin Mary',
    description: 'Solemnity celebration and liturgical preparation.',
    start_date: '2026-03-19',
    end_date: '2026-03-19',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Explore the life and virtues of Saint Joseph',
      'Prepare special liturgical celebration',
      'Plan festive music for the Solemnity'
    ],
    resources: [
      { id: 'lh12-1', title: 'Saint Joseph Reflection', type: 'reading', duration: '25 min', completed: false },
      { id: 'lh12-2', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh12-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-13',
    week_number: 13,
    title: 'Fifth Sunday of Lent',
    description: 'Sunday liturgical preparation as Holy Week approaches.',
    start_date: '2026-03-22',
    end_date: '2026-03-22',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Prepare Lenten Sunday liturgy',
      'Reflect on the approaching Passion',
      'Plan music for the final weeks of Lent'
    ],
    resources: [
      { id: 'lh13-1', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh13-2', title: 'Scripture Reflection', type: 'reading', duration: '20 min', completed: false },
      { id: 'lh13-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-14',
    week_number: 14,
    title: 'Annunciation of the Lord',
    description: 'Solemnity celebrating the Incarnation.',
    start_date: '2026-03-25',
    end_date: '2026-03-25',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Understand the mystery of the Incarnation',
      'Prepare special solemnity liturgy',
      'Plan Marian and festive music'
    ],
    resources: [
      { id: 'lh14-1', title: 'Annunciation Reflection', type: 'reading', duration: '25 min', completed: false },
      { id: 'lh14-2', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh14-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-15',
    week_number: 15,
    title: 'Palm Sunday of the Passion of the Lord',
    description: 'Beginning of Holy Week - Passion Sunday.',
    start_date: '2026-03-29',
    end_date: '2026-03-29',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Prepare the Palm Sunday procession',
      'Plan for the Passion reading',
      'Select appropriate Holy Week music'
    ],
    resources: [
      { id: 'lh15-1', title: 'Palm Sunday Reflection', type: 'reading', duration: '30 min', completed: false },
      { id: 'lh15-2', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh15-3', title: 'Holy Week Music Selection', type: 'audio', duration: '20 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-16',
    week_number: 16,
    title: 'Holy Thursday (Thursday of Holy Week)',
    description: 'Sacred Paschal Triduum begins - Mass of the Lord\'s Supper.',
    start_date: '2026-04-02',
    end_date: '2026-04-02',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Understand the institution of the Eucharist',
      'Prepare the washing of feet ritual',
      'Plan music for the Evening Mass'
    ],
    resources: [
      { id: 'lh16-1', title: 'Holy Thursday Reflection', type: 'reading', duration: '30 min', completed: false },
      { id: 'lh16-2', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh16-3', title: 'Triduum Music Selection', type: 'audio', duration: '25 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-17',
    week_number: 17,
    title: 'Good Friday of the Passion of the Lord',
    description: 'Sacred Paschal Triduum - Celebration of the Passion.',
    start_date: '2026-04-03',
    end_date: '2026-04-03',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Prepare the Veneration of the Cross',
      'Plan the Passion reading',
      'Select solemn Good Friday music'
    ],
    resources: [
      { id: 'lh17-1', title: 'Good Friday Reflection', type: 'reading', duration: '30 min', completed: false },
      { id: 'lh17-2', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh17-3', title: 'Passion Music Selection', type: 'audio', duration: '25 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-18',
    week_number: 18,
    title: 'Holy Saturday',
    description: 'Sacred Paschal Triduum - Day of waiting.',
    start_date: '2026-04-04',
    end_date: '2026-04-04',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Understand the significance of Holy Saturday',
      'Prepare for the Easter Vigil',
      'Plan the Vigil music and readings'
    ],
    resources: [
      { id: 'lh18-1', title: 'Holy Saturday Reflection', type: 'reading', duration: '25 min', completed: false },
      { id: 'lh18-2', title: 'Easter Vigil Planning Guide', type: 'document', completed: false },
      { id: 'lh18-3', title: 'Vigil Music Selection', type: 'audio', duration: '30 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-19',
    week_number: 19,
    title: 'Easter Sunday of the Resurrection of the Lord',
    description: 'Solemnity of Solemnities - The Resurrection.',
    start_date: '2026-04-05',
    end_date: '2026-04-05',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Celebrate the joy of the Resurrection',
      'Prepare the Easter Sunday liturgy',
      'Plan triumphant Easter music'
    ],
    resources: [
      { id: 'lh19-1', title: 'Easter Reflection', type: 'reading', duration: '25 min', completed: false },
      { id: 'lh19-2', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh19-3', title: 'Easter Music Selection', type: 'audio', duration: '25 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-20',
    week_number: 20,
    title: 'Second Sunday of Easter (Divine Mercy Sunday)',
    description: 'Octave of Easter - Divine Mercy celebration.',
    start_date: '2026-04-12',
    end_date: '2026-04-12',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Understand Divine Mercy devotion',
      'Prepare Easter season liturgy',
      'Plan joyful Easter music'
    ],
    resources: [
      { id: 'lh20-1', title: 'Divine Mercy Reflection', type: 'reading', duration: '25 min', completed: false },
      { id: 'lh20-2', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh20-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-21',
    week_number: 21,
    title: 'Third Sunday of Easter',
    description: 'Easter season Sunday liturgical preparation.',
    start_date: '2026-04-19',
    end_date: '2026-04-19',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Prepare Easter season liturgy',
      'Reflect on Resurrection appearances',
      'Plan Easter season music'
    ],
    resources: [
      { id: 'lh21-1', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh21-2', title: 'Scripture Reflection', type: 'reading', duration: '20 min', completed: false },
      { id: 'lh21-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-22',
    week_number: 22,
    title: 'Saint Mark, Evangelist',
    description: 'Feast of the Evangelist.',
    start_date: '2026-04-25',
    end_date: '2026-04-25',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Study the life of Saint Mark',
      'Prepare feast day liturgy',
      'Plan appropriate feast music'
    ],
    resources: [
      { id: 'lh22-1', title: 'Saint Mark Reflection', type: 'reading', duration: '20 min', completed: false },
      { id: 'lh22-2', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh22-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-23',
    week_number: 23,
    title: 'Fourth Sunday of Easter',
    description: 'Good Shepherd Sunday - World Day of Prayer for Vocations.',
    start_date: '2026-04-26',
    end_date: '2026-04-26',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Reflect on Christ as Good Shepherd',
      'Prepare vocations-focused liturgy',
      'Plan music celebrating pastoral themes'
    ],
    resources: [
      { id: 'lh23-1', title: 'Good Shepherd Reflection', type: 'reading', duration: '20 min', completed: false },
      { id: 'lh23-2', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh23-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'lh-24',
    week_number: 24,
    title: 'Fifth Sunday of Easter',
    description: 'Easter season Sunday liturgical preparation - "I am the vine."',
    start_date: '2026-05-03',
    end_date: '2026-05-03',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Reflect on Christ as the true vine',
      'Prepare Easter season liturgy',
      'Plan music celebrating unity in Christ'
    ],
    resources: [
      { id: 'lh24-1', title: 'The Vine and the Branches Reflection', type: 'reading', duration: '20 min', completed: false },
      { id: 'lh24-2', title: 'Liturgy Planning Guide', type: 'document', completed: false },
      { id: 'lh24-3', title: 'Music Selection', type: 'audio', duration: '15 min', completed: false },
    ],
    completion_percentage: 0
  },
];

// Sample data for MUS 240 - Survey of African American Music
const MUS240_MODULES: WeeklyModule[] = [
  {
    id: 'week-1',
    week_number: 1,
    title: 'Introduction to African American Music',
    description: 'Explore the origins and significance of African American music in American culture.',
    start_date: '2025-01-13',
    end_date: '2025-01-19',
    is_active: true,
    is_locked: false,
    learning_objectives: [
      'Understand the cultural roots of African American music',
      'Identify the role of music in African American history',
      'Recognize the influence of African musical traditions'
    ],
    resources: [
      { id: '1', title: 'Course Introduction Video', type: 'video', duration: '15 min', completed: true },
      { id: '2', title: 'Chapter 1: Origins', type: 'reading', duration: '30 min', completed: true },
      { id: '3', title: 'Listening: African Roots', type: 'audio', duration: '20 min', completed: false },
      { id: '4', title: 'Week 1 Discussion', type: 'discussion', completed: false },
    ],
    completion_percentage: 50
  },
  {
    id: 'week-2',
    week_number: 2,
    title: 'Spirituals and the Enslaved Experience',
    description: 'Examine the development of spirituals and their role in the lives of enslaved people.',
    start_date: '2025-01-20',
    end_date: '2025-01-26',
    is_active: true,
    is_locked: false,
    learning_objectives: [
      'Analyze the musical characteristics of spirituals',
      'Understand the dual meaning (religious and coded messages)',
      'Connect spirituals to the Underground Railroad'
    ],
    resources: [
      { id: '5', title: 'Spirituals Documentary', type: 'video', duration: '45 min', completed: false },
      { id: '6', title: 'Chapter 2: Spirituals', type: 'reading', duration: '35 min', completed: false },
      { id: '7', title: 'Listening: Essential Spirituals', type: 'audio', duration: '25 min', completed: false },
      { id: '8', title: 'Listening Journal #1', type: 'assignment', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-3',
    week_number: 3,
    title: 'Blues: From Delta to Urban',
    description: 'Trace the evolution of the blues from its rural origins to urban centers.',
    start_date: '2025-01-27',
    end_date: '2025-02-02',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Identify the 12-bar blues structure',
      'Compare Delta and Chicago blues styles',
      'Recognize key blues artists and their contributions'
    ],
    resources: [
      { id: '9', title: 'Delta Blues Masters', type: 'video', duration: '40 min', completed: false },
      { id: '10', title: 'Chapter 3: The Blues', type: 'reading', duration: '40 min', completed: false },
      { id: '11', title: 'Listening: Blues Anthology', type: 'audio', duration: '30 min', completed: false },
      { id: '12', title: 'Blues Analysis Assignment', type: 'assignment', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-4',
    week_number: 4,
    title: 'Jazz: The Birth of an American Art Form',
    description: 'Discover how jazz emerged in New Orleans and spread across America.',
    start_date: '2025-02-03',
    end_date: '2025-02-09',
    is_active: false,
    is_locked: false,
    learning_objectives: [
      'Understand the origins of jazz in New Orleans',
      'Identify early jazz styles and key figures',
      'Analyze the elements of jazz improvisation'
    ],
    resources: [
      { id: '13', title: 'Jazz Origins Documentary', type: 'video', duration: '50 min', completed: false },
      { id: '14', title: 'Chapter 4: Early Jazz', type: 'reading', duration: '45 min', completed: false },
      { id: '15', title: 'Listening: Jazz Pioneers', type: 'audio', duration: '35 min', completed: false },
      { id: '16', title: 'Week 4 Quiz', type: 'quiz', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-5',
    week_number: 5,
    title: 'The Harlem Renaissance',
    description: 'Explore the explosion of African American arts and culture in the 1920s.',
    start_date: '2025-02-10',
    end_date: '2025-02-16',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Understand the cultural context of the Harlem Renaissance',
      'Identify major musical figures of the era',
      'Connect music to broader artistic movements'
    ],
    resources: [
      { id: '17', title: 'Harlem Renaissance Overview', type: 'video', duration: '35 min', completed: false },
      { id: '18', title: 'Chapter 5: Harlem', type: 'reading', duration: '40 min', completed: false },
      { id: '19', title: 'Listening: Sounds of Harlem', type: 'audio', duration: '30 min', completed: false },
      { id: '20', title: 'Listening Journal #2', type: 'assignment', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-6',
    week_number: 6,
    title: 'Swing Era and Big Bands',
    description: 'Experience the swing era and its impact on American popular culture.',
    start_date: '2025-02-17',
    end_date: '2025-02-23',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Identify the characteristics of swing music',
      'Compare major big bands and their styles',
      'Understand the social impact of swing'
    ],
    resources: [
      { id: '21', title: 'Swing Era Documentary', type: 'video', duration: '45 min', completed: false },
      { id: '22', title: 'Chapter 6: Swing', type: 'reading', duration: '35 min', completed: false },
      { id: '23', title: 'Listening: Big Band Classics', type: 'audio', duration: '40 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-7',
    week_number: 7,
    title: 'Bebop Revolution',
    description: 'Understand the bebop movement and its radical departure from swing.',
    start_date: '2025-02-24',
    end_date: '2025-03-02',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Analyze the musical innovations of bebop',
      'Identify key bebop artists',
      'Understand bebop as artistic rebellion'
    ],
    resources: [
      { id: '24', title: 'Bebop: The Revolution', type: 'video', duration: '40 min', completed: false },
      { id: '25', title: 'Chapter 7: Bebop', type: 'reading', duration: '45 min', completed: false },
      { id: '26', title: 'Midterm Exam', type: 'quiz', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-8',
    week_number: 8,
    title: 'Gospel Music',
    description: 'Explore the power and influence of African American gospel music.',
    start_date: '2025-03-10',
    end_date: '2025-03-16',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Trace the development of gospel music',
      'Identify key gospel artists and styles',
      'Understand gospel\'s influence on other genres'
    ],
    resources: [
      { id: '27', title: 'Gospel Documentary', type: 'video', duration: '50 min', completed: false },
      { id: '28', title: 'Chapter 8: Gospel', type: 'reading', duration: '40 min', completed: false },
      { id: '29', title: 'Listening: Gospel Greats', type: 'audio', duration: '35 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-9',
    week_number: 9,
    title: 'Rhythm & Blues',
    description: 'Discover how R&B emerged and influenced rock and roll.',
    start_date: '2025-03-17',
    end_date: '2025-03-23',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Define the characteristics of R&B',
      'Identify pioneering R&B artists',
      'Connect R&B to the birth of rock and roll'
    ],
    resources: [
      { id: '30', title: 'R&B Origins', type: 'video', duration: '35 min', completed: false },
      { id: '31', title: 'Chapter 9: R&B', type: 'reading', duration: '35 min', completed: false },
      { id: '32', title: 'Listening Journal #3', type: 'assignment', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-10',
    week_number: 10,
    title: 'Soul Music and Motown',
    description: 'Examine the soul music revolution and the Motown sound.',
    start_date: '2025-03-24',
    end_date: '2025-03-30',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Define soul music characteristics',
      'Understand the Motown business model',
      'Compare Motown with other soul labels'
    ],
    resources: [
      { id: '33', title: 'Motown: The Sound of Young America', type: 'video', duration: '55 min', completed: false },
      { id: '34', title: 'Chapter 10: Soul', type: 'reading', duration: '40 min', completed: false },
      { id: '35', title: 'Listening: Motown Hits', type: 'audio', duration: '30 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-11',
    week_number: 11,
    title: 'Funk and the Power of the Groove',
    description: 'Experience the rise of funk music and its lasting influence.',
    start_date: '2025-03-31',
    end_date: '2025-04-06',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Identify the elements of funk',
      'Recognize key funk artists',
      'Understand funk\'s influence on hip-hop'
    ],
    resources: [
      { id: '36', title: 'Funk Documentary', type: 'video', duration: '40 min', completed: false },
      { id: '37', title: 'Chapter 11: Funk', type: 'reading', duration: '35 min', completed: false },
      { id: '38', title: 'Funk Analysis Assignment', type: 'assignment', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-12',
    week_number: 12,
    title: 'Hip-Hop: From the Bronx to the World',
    description: 'Trace the origins and global impact of hip-hop culture.',
    start_date: '2025-04-07',
    end_date: '2025-04-13',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Understand the four elements of hip-hop',
      'Trace hip-hop from block parties to mainstream',
      'Analyze hip-hop as social commentary'
    ],
    resources: [
      { id: '39', title: 'Hip-Hop Evolution', type: 'video', duration: '60 min', completed: false },
      { id: '40', title: 'Chapter 12: Hip-Hop', type: 'reading', duration: '45 min', completed: false },
      { id: '41', title: 'Listening: Hip-Hop Classics', type: 'audio', duration: '35 min', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-13',
    week_number: 13,
    title: 'Contemporary R&B and Neo-Soul',
    description: 'Explore modern expressions of African American music.',
    start_date: '2025-04-14',
    end_date: '2025-04-20',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Define contemporary R&B styles',
      'Identify neo-soul artists and characteristics',
      'Trace the evolution from classic to modern R&B'
    ],
    resources: [
      { id: '42', title: 'Neo-Soul Movement', type: 'video', duration: '35 min', completed: false },
      { id: '43', title: 'Chapter 13: Contemporary', type: 'reading', duration: '40 min', completed: false },
      { id: '44', title: 'Listening Journal #4', type: 'assignment', completed: false },
    ],
    completion_percentage: 0
  },
  {
    id: 'week-14',
    week_number: 14,
    title: 'African American Music Today',
    description: 'Examine current trends and the future of African American music.',
    start_date: '2025-04-21',
    end_date: '2025-04-27',
    is_active: false,
    is_locked: true,
    learning_objectives: [
      'Identify current trends in African American music',
      'Understand streaming and social media impact',
      'Reflect on the continued evolution of the tradition'
    ],
    resources: [
      { id: '45', title: 'Music Today Documentary', type: 'video', duration: '40 min', completed: false },
      { id: '46', title: 'Chapter 14: Today', type: 'reading', duration: '35 min', completed: false },
      { id: '47', title: 'Final Project Presentation', type: 'assignment', completed: false },
      { id: '48', title: 'Final Exam', type: 'quiz', completed: false },
    ],
    completion_percentage: 0
  },
];

// Course modules map
const COURSE_MODULES: Record<string, WeeklyModule[]> = {
  'a0000000-0000-0000-0000-000000000100': LH100_MODULES, // LH 100
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37': MUS240_MODULES, // MUS 240
};

const getResourceIcon = (type: ModuleResource['type']) => {
  switch (type) {
    case 'video': return Video;
    case 'reading': return BookOpen;
    case 'audio': return Headphones;
    case 'document': return FileText;
    case 'assignment': return PenLine;
    case 'quiz': return FileCheck;
    case 'discussion': return Music;
    default: return FileText;
  }
};

const getResourceColor = (type: ModuleResource['type']) => {
  switch (type) {
    case 'video': return 'text-red-500';
    case 'reading': return 'text-blue-500';
    case 'audio': return 'text-purple-500';
    case 'document': return 'text-orange-500';
    case 'assignment': return 'text-green-500';
    case 'quiz': return 'text-yellow-500';
    case 'discussion': return 'text-pink-500';
    default: return 'text-muted-foreground';
  }
};

export const CourseModules: React.FC<CourseModulesProps> = ({ courseId, isEnrolled = true, isAdmin = false }) => {
  const { user } = useAuth();
  
  // Use editable version for LH100 (check both UUID and slug)
  const LH100_UUID = 'a0000000-0000-0000-0000-000000000100';
  const MUS240_UUID = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';
  const isLH100 = courseId === LH100_UUID || courseId === 'lh-100';
  const isMUS240 = courseId === MUS240_UUID || courseId === 'mus-240';
  
  if (isLH100) {
    return <EditableLH100Modules isEnrolled={isEnrolled} isAdmin={isAdmin} />;
  }
  
  // Get modules for the specific course - return empty array if not found
  const courseModules = COURSE_MODULES[courseId] || [];
  const [modules, setModules] = useState<WeeklyModule[]>(courseModules);
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>(['week-1', 'week-2']);

  // For MUS 240, fetch module settings and filter by is_active for students
  useEffect(() => {
    const fetchMUS240ModuleSettings = async () => {
      if (!isMUS240) return;

      try {
        const { data: settings, error } = await supabase
          .from('mus240_module_settings')
          .select('module_id, is_active, is_locked, title, description, learning_objectives');

        if (error) {
          console.error('Error fetching module settings:', error);
          return;
        }

        const settingsMap = new Map(settings?.map(s => [s.module_id, s]) || []);
        
        // Merge settings with hardcoded modules
        let mergedModules = MUS240_MODULES.map(mod => {
          const setting = settingsMap.get(mod.id);
          if (setting) {
            return {
              ...mod,
              is_active: setting.is_active ?? mod.is_active,
              is_locked: setting.is_locked ?? mod.is_locked,
              title: setting.title || mod.title,
              description: setting.description || mod.description,
              learning_objectives: (setting.learning_objectives as string[]) || mod.learning_objectives,
            };
          }
          return mod;
        });

        // Filter out inactive modules for non-admin users
        if (!isAdmin) {
          mergedModules = mergedModules.filter(mod => mod.is_active);
        }

        setModules(mergedModules);
      } catch (err) {
        console.error('Error in fetchMUS240ModuleSettings:', err);
      }
    };

    fetchMUS240ModuleSettings();
  }, [isMUS240, isAdmin]);

  // Calculate overall progress
  const overallProgress = modules.length > 0 
    ? modules.reduce((acc, mod) => acc + (mod.completion_percentage || 0), 0) / modules.length
    : 0;

  // Find current week
  const today = new Date();
  const currentWeekModule = modules.find(mod => {
    const start = new Date(mod.start_date);
    const end = new Date(mod.end_date);
    return today >= start && today <= end;
  });

  // Show empty state if no modules
  if (modules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Modules Available</h3>
          <p className="text-muted-foreground">
            Course modules have not been added yet. Check back later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course Progress Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Weekly Course Modules
            </CardTitle>
            {currentWeekModule && (
              <Badge variant="default" className="gap-1">
                <Calendar className="h-3 w-3" />
                Week {currentWeekModule.week_number}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Course Progress</span>
              <span className="font-medium">{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {modules.filter(m => m.completion_percentage === 100).length} completed
              </span>
              <span className="flex items-center gap-1">
                <Circle className="h-3 w-3 text-primary" />
                {modules.filter(m => (m.completion_percentage || 0) > 0 && (m.completion_percentage || 0) < 100).length} in progress
              </span>
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-muted-foreground" />
                {modules.filter(m => m.is_locked).length} locked
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module Accordion */}
      <Accordion 
        type="multiple" 
        value={expandedWeeks} 
        onValueChange={setExpandedWeeks}
        className="space-y-3"
      >
        {modules.map((module) => {
          const isCurrentWeek = currentWeekModule?.id === module.id;
          const completedResources = module.resources.filter(r => r.completed).length;
          const totalResources = module.resources.length;

          return (
            <AccordionItem 
              key={module.id} 
              value={module.id}
              className={`border rounded-lg overflow-hidden ${
                isCurrentWeek ? 'border-primary shadow-sm' : 'border-border'
              } ${module.is_locked ? 'opacity-75' : ''}`}
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 [&[data-state=open]]:bg-muted/20">
                <div className="flex items-center gap-3 w-full">
                  {/* Week Number Badge */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    module.completion_percentage === 100 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : isCurrentWeek 
                        ? 'bg-primary text-primary-foreground'
                        : module.is_locked
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-muted text-foreground'
                  }`}>
                    {module.completion_percentage === 100 ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : module.is_locked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      module.week_number
                    )}
                  </div>

                  {/* Module Info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{module.title}</span>
                      {isCurrentWeek && (
                        <Badge variant="outline" className="text-xs border-primary text-primary">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(module.start_date), 'MMM d')} - {format(new Date(module.end_date), 'MMM d')}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {completedResources}/{totalResources} items
                      </span>
                    </div>
                  </div>

                  {/* Progress Circle */}
                  <div className="flex-shrink-0 mr-2">
                    <div className="relative w-10 h-10">
                      <svg className="w-10 h-10 transform -rotate-90">
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          className="text-muted"
                        />
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray={`${(module.completion_percentage || 0) * 1.005} 100.5`}
                          className="text-primary"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                        {module.completion_percentage || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4">
                {module.is_locked ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Lock className="h-5 w-5 mr-2" />
                    <span>This module will unlock on {format(new Date(module.start_date), 'MMMM d, yyyy')}</span>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {/* Description */}
                    <p className="text-sm text-muted-foreground">{module.description}</p>

                    {/* Learning Objectives */}
                    {module.learning_objectives && module.learning_objectives.length > 0 && (
                      <div className="bg-muted/30 rounded-lg p-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          Learning Objectives
                        </h4>
                        <ul className="space-y-1">
                          {module.learning_objectives.map((objective, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <span>{objective}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Order of Mass - Only for LH100 */}
                    {courseId === 'lh-100' && (
                      <OrderOfMass 
                        moduleId={module.id} 
                        moduleName={module.title}
                        isLocked={module.is_locked}
                      />
                    )}

                    {/* Resources List - Use editable version for LH100 */}
                    {courseId === 'lh-100' ? (
                      <EditableModuleResources 
                        moduleId={module.id}
                        isLocked={module.is_locked}
                      />
                    ) : (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Module Resources
                        </h4>
                        <div className="grid gap-2">
                          {module.resources.map((resource) => {
                            const Icon = getResourceIcon(resource.type);
                            const colorClass = getResourceColor(resource.type);

                            return (
                              <div 
                                key={resource.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                                  resource.completed 
                                    ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800/30' 
                                    : 'bg-background hover:bg-muted/50'
                                }`}
                              >
                                <div className={`p-2 rounded-lg bg-muted ${colorClass}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm truncate">{resource.title}</span>
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {resource.type}
                                    </Badge>
                                  </div>
                                  {resource.duration && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {resource.duration}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {resource.completed ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <Button size="sm" variant="ghost" className="h-8 px-3">
                                      {resource.type === 'video' ? (
                                        <>
                                          <Play className="h-3 w-3 mr-1" />
                                          Watch
                                        </>
                                      ) : resource.type === 'audio' ? (
                                        <>
                                          <Headphones className="h-3 w-3 mr-1" />
                                          Listen
                                        </>
                                      ) : (
                                        <>
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          Open
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default CourseModules;
