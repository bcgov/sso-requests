import React, { useState, useEffect } from 'react';
import Alert from 'html-components/Alert';

interface Props {
  variant?: string;
  size?: string;
  closable?: boolean;
  content?: string;
  fadeOut?: number;
  children?: React.ReactNode;
}

const FadingAlert = ({ children, variant, size, closable, content, fadeOut }: Props) => {
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    const timeout = fadeOut
      ? setTimeout(() => {
          setFaded(true);
        }, fadeOut)
      : null;

    return () => {
      timeout && clearTimeout(timeout);
    };
  }, []);

  if (faded) return null;

  return (
    <Alert variant={variant} size={size} closable={closable} content={content}>
      {children}
    </Alert>
  );
};

export default FadingAlert;
