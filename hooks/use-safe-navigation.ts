import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

const navigationHistory: string[] = [];

function normalizeRoute(pathname: string) {
  return pathname === '/' || pathname === '/index' ? '/(tabs)' : pathname;
}

export function useSafeNavigation(replace = true) {
  const router = useRouter();
  const pathname = usePathname();
  const navigating = useRef(false);

  useEffect(() => {
    navigating.current = false;
  }, [pathname]);

  const navigate = (route: string) => {
    const isCurrentRoute = route === '/(tabs)'
      ? pathname === '/' || pathname === '/index'
      : pathname === route;

    if (isCurrentRoute || navigating.current) {
      return;
    }

    navigating.current = true;
    const currentRoute = normalizeRoute(pathname);

    if (navigationHistory[navigationHistory.length - 1] !== currentRoute) {
      navigationHistory.push(currentRoute);
    }
    if (replace) {
      router.replace(route as never);
    } else {
      router.push(route as never);
    }
  };
  return navigate;
}

export function useSafeBack() {
  const router = useRouter();
  const pathname = usePathname();
  const goingBack = useRef(false);

  useEffect(() => {
    goingBack.current = false;
  }, [pathname]);

  return () => {
    if (goingBack.current) {
      return;
    }

    goingBack.current = true;

    const previousRoute = navigationHistory.pop() ?? '/(tabs)';
    router.replace(previousRoute as never);
  };
}