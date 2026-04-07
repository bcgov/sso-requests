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

export default function Link({ external, href, children, title, onClick, style }: Props) {
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
