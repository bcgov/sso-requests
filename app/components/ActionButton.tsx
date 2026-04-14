import { PRIMARY_RED } from '@app/styles/theme';
import { FontAwesomeIcon, FontAwesomeIconProps } from '@fortawesome/react-fontawesome';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import styled from 'styled-components';

interface StyledActionButtonProps {
  disabled?: boolean;
  activeColor?: string;
  isUnread?: boolean;
  title?: string;
  icon: any;
  size?: 'xs' | 'sm' | 'lg' | 'xl';
}

const StyledActionButton = styled(({ disabled, activeColor, isUnread, ...props }) => (
  <FontAwesomeIcon {...props} aria-disabled={disabled} />
))<StyledActionButtonProps>`
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  ${(props) =>
    props.disabled ? `color: #CACACA;` : `color: inherit; &:hover { color: ${props.activeColor || '#000'}; }`}
  ${(props) => (props.isUnread ? `color: ${PRIMARY_RED}` : '')};
`;

const ActionButton = (props: StyledActionButtonProps & FontAwesomeIconProps) => {
  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id={'tooltip-top'}>{props.title || props['aria-label']}</Tooltip>}
    >
      <StyledActionButton {...props} />
    </OverlayTrigger>
  );
};

export default ActionButton;
