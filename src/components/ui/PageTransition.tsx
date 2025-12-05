import { useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState<'enter' | 'exit'>('enter');
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== previousPath.current) {
      setTransitionStage('exit');
      
      const timer = setTimeout(() => {
        setDisplayChildren(children);
        setTransitionStage('enter');
        previousPath.current = location.pathname;
      }, 150); // Short exit duration

      return () => clearTimeout(timer);
    } else {
      setDisplayChildren(children);
    }
  }, [location.pathname, children]);

  return (
    <div
      className={`page-transition ${transitionStage === 'enter' ? 'page-enter' : 'page-exit'}`}
    >
      {displayChildren}
    </div>
  );
};
