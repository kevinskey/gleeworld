import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Generate a unique session ID for this browser tab
const generateSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Get device type from user agent
const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

// Get browser name from user agent
const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Browser';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
};

// Extract module ID from URL params
const getModuleFromUrl = (search: string): string | null => {
  const params = new URLSearchParams(search);
  return params.get('module');
};

// Get page title from current route
const getPageTitle = (pathname: string): string => {
  const pathMap: Record<string, string> = {
    '/': 'Home',
    '/dashboard': 'Dashboard',
    '/login': 'Login',
    '/signup': 'Sign Up',
    '/alumnae': 'Alumnae Portal',
    '/academy': 'Glee Academy',
    '/mus-070': 'MUS 070',
    '/mus-240': 'MUS 240',
    '/mus-210': 'MUS 210',
    '/mus-101': 'MUS 101',
    '/mus-001': 'MUS 001',
    '/mus-000': 'MUS 000',
    '/glee-101': 'GLEE 101',
    '/lh-100': 'LH 100',
    '/profile': 'Profile',
    '/settings': 'Settings',
  };
  return pathMap[pathname] || pathname.replace(/\//g, ' ').trim() || 'Unknown';
};

// Session storage key
const SESSION_ID_KEY = 'gw_session_id';
const SESSION_DB_ID_KEY = 'gw_session_db_id';

export const useUsageTracking = () => {
  const location = useLocation();
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const sessionDbIdRef = useRef<string | null>(null);
  const lastPathRef = useRef<string | null>(null);
  const pageCountRef = useRef<number>(0);

  // Initialize or retrieve session ID
  useEffect(() => {
    let storedSessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!storedSessionId) {
      storedSessionId = generateSessionId();
      sessionStorage.setItem(SESSION_ID_KEY, storedSessionId);
    }
    sessionIdRef.current = storedSessionId;
    
    const storedDbId = sessionStorage.getItem(SESSION_DB_ID_KEY);
    if (storedDbId) {
      sessionDbIdRef.current = storedDbId;
    }
  }, []);

  // Create or update session in database
  const initSession = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Check if we have an active session
      if (sessionDbIdRef.current) {
        // Update last activity
        await supabase
          .from('user_sessions')
          .update({ 
            last_activity: new Date().toISOString(),
            page_count: pageCountRef.current
          })
          .eq('id', sessionDbIdRef.current);
        return;
      }

      // Create new session
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          device_type: getDeviceType(),
          browser: getBrowser(),
          is_active: true,
          page_count: 0
        })
        .select('id')
        .single();

      if (!error && data) {
        sessionDbIdRef.current = data.id;
        sessionStorage.setItem(SESSION_DB_ID_KEY, data.id);
      }
    } catch (err) {
      console.warn('Failed to init session:', err);
    }
  }, [user?.id]);

  // Track page view
  const trackPageView = useCallback(async () => {
    if (!user?.id) return;
    
    const fullPath = `${location.pathname}${location.search}`;
    
    // Don't track the same page twice in a row
    if (lastPathRef.current === fullPath) return;
    lastPathRef.current = fullPath;
    pageCountRef.current += 1;

    try {
      await supabase
        .from('user_page_views')
        .insert({
          user_id: user.id,
          page_path: location.pathname,
          page_title: getPageTitle(location.pathname),
          module_id: getModuleFromUrl(location.search),
          referrer: document.referrer || null,
          session_id: sessionIdRef.current,
          device_type: getDeviceType(),
          browser: getBrowser()
        });

      // Update daily engagement
      const today = new Date().toISOString().split('T')[0];
      const moduleId = getModuleFromUrl(location.search);
      
      const { data: existing } = await supabase
        .from('user_engagement_daily')
        .select('id, page_views, modules_visited')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (existing) {
        const modulesVisited = existing.modules_visited || [];
        if (moduleId && !modulesVisited.includes(moduleId)) {
          modulesVisited.push(moduleId);
        }
        
        await supabase
          .from('user_engagement_daily')
          .update({
            page_views: (existing.page_views || 0) + 1,
            modules_visited: modulesVisited,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('user_engagement_daily')
          .insert({
            user_id: user.id,
            date: today,
            page_views: 1,
            unique_pages: 1,
            session_count: 1,
            modules_visited: moduleId ? [moduleId] : []
          });
      }

      // Update session page count
      if (sessionDbIdRef.current) {
        await supabase
          .from('user_sessions')
          .update({ 
            page_count: pageCountRef.current,
            last_activity: new Date().toISOString()
          })
          .eq('id', sessionDbIdRef.current);
      }
    } catch (err) {
      console.warn('Failed to track page view:', err);
    }
  }, [user?.id, location.pathname, location.search]);

  // Track login
  const trackLogin = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      await supabase.rpc('log_activity', {
        p_user_id: user.id,
        p_action_type: 'user_login',
        p_resource_type: 'auth',
        p_resource_id: null,
        p_details: {
          device_type: getDeviceType(),
          browser: getBrowser(),
          timestamp: new Date().toISOString()
        },
        p_ip_address: null,
        p_user_agent: navigator.userAgent
      });
    } catch (err) {
      console.warn('Failed to track login:', err);
    }
  }, [user?.id]);

  // End session on page unload
  useEffect(() => {
    const endSession = async () => {
      if (sessionDbIdRef.current) {
        try {
          // Use sendBeacon for reliable unload tracking
          const payload = JSON.stringify({
            session_id: sessionDbIdRef.current,
            session_end: new Date().toISOString(),
            is_active: false
          });
          
          navigator.sendBeacon?.(
            `https://oopmlreysjzuxzylyheb.supabase.co/rest/v1/user_sessions?id=eq.${sessionDbIdRef.current}`,
            payload
          );
        } catch (err) {
          // Silently fail on unload
        }
      }
    };

    window.addEventListener('beforeunload', endSession);
    return () => window.removeEventListener('beforeunload', endSession);
  }, []);

  // Initialize session when user logs in
  useEffect(() => {
    if (user?.id) {
      initSession();
    }
  }, [user?.id, initSession]);

  // Track page views on route change
  useEffect(() => {
    if (user?.id) {
      trackPageView();
    }
  }, [location.pathname, location.search, user?.id, trackPageView]);

  return {
    trackPageView,
    trackLogin,
    sessionId: sessionIdRef.current
  };
};

// Hook for tracking specific module usage
export const useModuleTracking = (moduleId: string) => {
  const { user } = useAuth();
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();

    return () => {
      // Track time spent in module on unmount
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      
      if (user?.id && timeSpent > 5) { // Only track if spent more than 5 seconds
        const logPromise = supabase.rpc('log_activity', {
          p_user_id: user.id,
          p_action_type: 'module_time_spent',
          p_resource_type: 'module',
          p_resource_id: moduleId,
          p_details: { seconds: timeSpent },
          p_ip_address: null,
          p_user_agent: navigator.userAgent
        });
        // Fire and forget - don't block cleanup
        Promise.resolve(logPromise).catch(() => {});
      }
    };
  }, [moduleId, user?.id]);
};
