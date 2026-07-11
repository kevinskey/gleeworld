// React Query hooks for the Planner workspace. Query keys all start
// with 'planner' so note/task mutations can invalidate coarsely without
// touching the rest of the app's cache.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as notesApi from '@/lib/planner/notesApi';
import * as tasksApi from '@/lib/planner/tasksApi';
import * as foldersApi from '@/lib/planner/foldersApi';
import * as templatesApi from '@/lib/planner/templatesApi';
import * as searchApi from '@/lib/planner/searchApi';
import { listEventsForPeriod } from '@/lib/planner/eventsApi';
import type { PeriodType } from '@/lib/planner/dateKeys';
import type { NoteType, SavedFilterQuery, TaskStatus } from '@/lib/planner/types';

export function useNotesList(opts: {
  folderId?: string | null;
  favoritesOnly?: boolean;
  tag?: string;
  noteType?: NoteType;
}) {
  return useQuery({
    queryKey: ['planner', 'notes', opts],
    queryFn: () => notesApi.listNotes(opts),
  });
}

export function useNote(noteId: string | null) {
  return useQuery({
    queryKey: ['planner', 'note', noteId],
    queryFn: () => notesApi.getNote(noteId!),
    enabled: !!noteId,
  });
}

export function usePeriodNote(type: PeriodType | null, dateKey: string | null) {
  return useQuery({
    queryKey: ['planner', 'period-note', type, dateKey],
    queryFn: () => notesApi.getOrCreatePeriodNote(type!, dateKey!),
    enabled: !!type && !!dateKey,
  });
}

export function usePeriodEvents(type: PeriodType | null, dateKey: string | null) {
  return useQuery({
    queryKey: ['planner', 'events', type, dateKey],
    queryFn: () => listEventsForPeriod(dateKey!, type!),
    enabled: !!type && !!dateKey,
  });
}

export function useTasks(view: tasksApi.TaskView) {
  return useQuery({
    queryKey: ['planner', 'tasks', view],
    queryFn: () => tasksApi.listTasks(view),
  });
}

export function useTasksForDate(date: string | null) {
  return useQuery({
    queryKey: ['planner', 'tasks-date', date],
    queryFn: () => tasksApi.listTasksForDate(date!),
    enabled: !!date,
  });
}

export function useTaskCounts() {
  return useQuery({
    queryKey: ['planner', 'task-counts'],
    queryFn: tasksApi.openTaskCounts,
    staleTime: 30_000,
  });
}

export function useFolders() {
  return useQuery({ queryKey: ['planner', 'folders'], queryFn: foldersApi.listFolders });
}

export function useTemplates() {
  return useQuery({ queryKey: ['planner', 'templates'], queryFn: templatesApi.listTemplates });
}

export function useSavedFilters() {
  return useQuery({ queryKey: ['planner', 'saved-filters'], queryFn: searchApi.listSavedFilters });
}

export function useAllTags() {
  return useQuery({ queryKey: ['planner', 'tags'], queryFn: searchApi.listAllTags, staleTime: 60_000 });
}

export function useTrash(enabled: boolean) {
  return useQuery({ queryKey: ['planner', 'trash'], queryFn: notesApi.listTrash, enabled });
}

export function useNoteSearch(query: SavedFilterQuery, enabled: boolean) {
  return useQuery({
    queryKey: ['planner', 'search', query],
    queryFn: () => searchApi.searchNotes(query),
    enabled,
  });
}

export function useBacklinks(noteId: string | null) {
  return useQuery({
    queryKey: ['planner', 'backlinks', noteId],
    queryFn: () => notesApi.getBacklinks(noteId!),
    enabled: !!noteId,
  });
}

export function useRevisions(noteId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['planner', 'revisions', noteId],
    queryFn: () => notesApi.listRevisions(noteId!),
    enabled: !!noteId && enabled,
  });
}

/** Invalidate everything under the planner cache umbrella. */
export function useInvalidatePlanner() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['planner'] });
}

export function useSetTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksApi.setTaskStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planner'] }),
    onError: () => toast.error('Could not update the task'),
  });
}

export function useRescheduleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date: string | null }) =>
      tasksApi.rescheduleTask(id, date),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planner', 'tasks'] })
      .then(() => qc.invalidateQueries({ queryKey: ['planner', 'tasks-date'] }))
      .then(() => qc.invalidateQueries({ queryKey: ['planner', 'task-counts'] })),
    onError: () => toast.error('Could not reschedule the task'),
  });
}
