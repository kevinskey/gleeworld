/**
 * PREMIUM MODULES SECTION
 * Task list with grouped sections matching Figma design
 */

import React from 'react';
import { FileText, Calendar, Clock, CheckCircle2, ArrowRight, Tag } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  duration?: string;
  category: string;
  categoryColor: string;
  progress?: number;
  iconColor: string;
}

interface TaskGroup {
  title: string;
  count: number;
  tasks: Task[];
}

const taskGroups: TaskGroup[] = [
  {
    title: 'New Assignments',
    count: 3,
    tasks: [
      {
        id: '1',
        title: 'Music Theory Fundamentals',
        description: 'Complete the assessment on intervals and chord progressions',
        dueDate: 'Due Tomorrow',
        duration: '45 min',
        category: 'THEORY',
        categoryColor: 'bg-orange-500/20 text-orange-400',
        iconColor: 'from-orange-500 to-red-500',
      },
      {
        id: '2',
        title: 'Vocal Warm-up Exercises',
        description: 'Practice the new breathing techniques from yesterday\'s session',
        dueDate: 'Due in 3 days',
        duration: '30 min',
        category: 'PRACTICE',
        categoryColor: 'bg-cyan-500/20 text-cyan-400',
        iconColor: 'from-cyan-400 to-blue-500',
      },
    ],
  },
  {
    title: 'Upcoming Events',
    count: 2,
    tasks: [
      {
        id: '3',
        title: 'Live Masterclass: Advanced Harmonies',
        description: 'Join instructor Sarah Johnson for an in-depth session',
        dueDate: 'Friday, 3:00 PM',
        duration: '90 min',
        category: 'LIVE',
        categoryColor: 'bg-purple-500/20 text-purple-400',
        iconColor: 'from-purple-500 to-pink-500',
      },
    ],
  },
  {
    title: 'In Progress',
    count: 2,
    tasks: [
      {
        id: '4',
        title: 'Sight Reading Practice',
        description: 'Continue with level 3 exercises',
        progress: 65,
        category: 'PRACTICE',
        categoryColor: 'bg-yellow-500/20 text-yellow-400',
        iconColor: 'from-yellow-400 to-orange-500',
      },
    ],
  },
  {
    title: 'Recently Completed',
    count: 5,
    tasks: [
      {
        id: '5',
        title: 'Introduction to Jazz Scales',
        description: 'Completed with 95% score',
        category: 'COMPLETED',
        categoryColor: 'bg-green-500/20 text-green-400',
        iconColor: 'from-green-400 to-emerald-500',
      },
    ],
  },
];

const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
  return (
    <div className="group flex items-start gap-4 p-4 bg-[#111111] rounded-xl border border-[#1A1A1A] hover:border-[#333333] cursor-pointer transition-all">
      {/* Icon */}
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${task.iconColor} flex items-center justify-center flex-shrink-0`}>
        {task.progress !== undefined ? (
          <Clock className="w-5 h-5 text-white" />
        ) : task.category === 'COMPLETED' ? (
          <CheckCircle2 className="w-5 h-5 text-white" />
        ) : task.category === 'LIVE' ? (
          <Calendar className="w-5 h-5 text-white" />
        ) : (
          <FileText className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium mb-1 group-hover:text-orange-400 transition-colors truncate">
              {task.title}
            </h4>
            <p className="text-[#666666] text-sm line-clamp-1">{task.description}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#666666] group-hover:text-orange-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
        </div>

        {/* Meta Row */}
        <div className="flex items-center gap-3 mt-3">
          {task.dueDate && (
            <span className="text-[#888888] text-xs flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {task.dueDate}
            </span>
          )}
          {task.duration && (
            <span className="text-[#888888] text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.duration}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full ${task.categoryColor}`}>
            {task.category}
          </span>
        </div>

        {/* Progress Bar */}
        {task.progress !== undefined && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#888888] text-xs">Progress</span>
              <span className="text-yellow-400 text-xs font-semibold">{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-1.5 bg-[#1A1A1A]" />
          </div>
        )}
      </div>
    </div>
  );
};

export const PremiumModules: React.FC = () => {
  return (
    <section className="w-full bg-[#0A0A0A] py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-orange-500 text-sm font-semibold tracking-wide">YOUR LEARNING PATH</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">My Modules</h2>
          <p className="text-[#666666]">Personalized tasks and upcoming activities</p>
        </div>

        {/* Task Groups */}
        <div className="space-y-8">
          {taskGroups.map((group) => (
            <div key={group.title}>
              {/* Group Header */}
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-white font-semibold">{group.title}</h3>
                <span className="px-2 py-0.5 bg-[#1A1A1A] text-[#888888] text-xs rounded-full">
                  {group.count}
                </span>
              </div>

              {/* Tasks */}
              <div className="space-y-3">
                {group.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
