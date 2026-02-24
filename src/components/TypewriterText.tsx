import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  lines: string[];
  speed?: number;
  onComplete?: () => void;
  className?: string;
  lineClassName?: string;
}

export default function TypewriterText({
  lines,
  speed = 60,
  onComplete,
  className = '',
  lineClassName = '',
}: TypewriterTextProps) {
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (currentLine >= lines.length) {
      setCompleted(true);
      onComplete?.();
      return;
    }

    const line = lines[currentLine];
    if (currentChar >= line.length) {
      const timer = setTimeout(() => {
        setCurrentLine(prev => prev + 1);
        setCurrentChar(0);
      }, 300);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCurrentChar(prev => prev + 1);
    }, speed);
    return () => clearTimeout(timer);
  }, [currentLine, currentChar, lines, speed, onComplete]);

  return (
    <div className={className}>
      {lines.map((line, i) => {
        if (i > currentLine) return null;
        const displayText = i === currentLine ? line.slice(0, currentChar) : line;
        return (
          <p key={i} className={lineClassName}>
            {displayText}
            {i === currentLine && !completed && (
              <span className="inline-block w-[2px] h-[1em] bg-foreground ml-[2px] animate-pulse align-middle" />
            )}
          </p>
        );
      })}
    </div>
  );
}
