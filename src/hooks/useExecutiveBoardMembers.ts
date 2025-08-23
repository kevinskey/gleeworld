import { useState, useEffect } from 'react';

interface ExecutiveBoardMember {
  user_id: string;
  position: string;
  full_name: string;
  email: string;
}

export const useExecutiveBoardMembers = () => {
  const [members, setMembers] = useState<ExecutiveBoardMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        
        // Mock executive board members for demonstration
        const mockMembers: ExecutiveBoardMember[] = [
          {
            user_id: 'mock-president-id',
            position: 'President',
            full_name: 'Sarah Johnson',
            email: 'president@example.com'
          },
          {
            user_id: 'mock-vp-id', 
            position: 'Vice President',
            full_name: 'Maria Rodriguez',
            email: 'vp@example.com'
          },
          {
            user_id: 'mock-secretary-id',
            position: 'Secretary',
            full_name: 'Ashley Davis',
            email: 'secretary@example.com'
          },
          {
            user_id: 'mock-treasurer-id',
            position: 'Treasurer', 
            full_name: 'Jennifer Williams',
            email: 'treasurer@example.com'
          },
          {
            user_id: '',
            position: 'Public Relations',
            full_name: '',
            email: ''
          }
        ];

        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setMembers(mockMembers);
      } catch (error) {
        console.error('Error fetching executive board members:', error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  return { members, loading };
};