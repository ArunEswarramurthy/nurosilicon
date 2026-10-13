import { useState, useRef } from 'react';

export default function Tooltip({ content, children, placement = 'top' }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  if (!content) return children;

  const placementStyle = {
    top:    { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { top:    'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    left:   { right:  'calc(100% + 6px)', top:  '50%', transform: 'translateY(-50%)' },
    right:  { left:   'calc(100% + 6px)', top:  '50%', transform: 'translateY(-50%)' },
  }[placement] ?? {};

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className="tooltip" style={placementStyle}>
          {content}
        </span>
      )}
    </span>
  );
}
