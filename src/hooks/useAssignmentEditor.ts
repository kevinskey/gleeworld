import { useState } from 'react';
import { Assignment } from '@/data/mus240Assignments';

export const useAssignmentEditor = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const updateAssignment = (updatedAssignment: Assignment) => {
    // In a real implementation, this would save to a database
    // For now, we'll just update local state
    setAssignments(prev => 
      prev.map(assignment => 
        assignment.id === updatedAssignment.id ? updatedAssignment : assignment
      )
    );
    
    // Store in localStorage as a temporary solution
    const existingUpdates = JSON.parse(localStorage.getItem('assignmentUpdates') || '{}');
    existingUpdates[updatedAssignment.id] = updatedAssignment;
    localStorage.setItem('assignmentUpdates', JSON.stringify(existingUpdates));
  };

  const getUpdatedAssignment = (originalAssignment: Assignment): Assignment => {
    const existingUpdates = JSON.parse(localStorage.getItem('assignmentUpdates') || '{}');
    return existingUpdates[originalAssignment.id] || originalAssignment;
  };

  return {
    updateAssignment,
    getUpdatedAssignment,
  };
};