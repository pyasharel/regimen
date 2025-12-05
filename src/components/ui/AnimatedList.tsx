import { Children, cloneElement, isValidElement, ReactElement } from "react";

interface AnimatedListProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export const AnimatedList = ({ children, staggerDelay = 50, className = "" }: AnimatedListProps) => {
  return (
    <div className={className}>
      {Children.map(children, (child, index) => {
        if (isValidElement(child)) {
          return cloneElement(child as ReactElement<any>, {
            className: `${(child.props as any).className || ''} animate-list-item`,
            style: {
              ...(child.props as any).style,
              animationDelay: `${index * staggerDelay}ms`,
            },
          });
        }
        return child;
      })}
    </div>
  );
};
