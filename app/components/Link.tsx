import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type Props = {
  external?: boolean;
  href: string;
  children: React.ReactNode;
  title?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
};

// mark the props as readonly to prevent accidental mutation
export default function Link({ external, href, children, title, onClick, style }: Readonly<Props>) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" title={title} onClick={onClick} style={style}>
        {children} <FontAwesomeIcon icon={faExternalLinkAlt} />
      </a>
    );
  }
  return (
    <a href={href} onClick={onClick} style={style} aria-label={title}>
      {children}
    </a>
  );
}
