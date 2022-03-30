import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

interface BoxProps {
  active: boolean;
  visited?: boolean;
  onClick: any;
}

export interface FormStageBox {
  title: string;
  stageNumber: number;
  active?: boolean;
  visited?: boolean;
  handleClick: Function;
  hasError?: boolean;
}

const Box = styled.div<BoxProps>`
  height: 60px;
  width: 200px;
  background-color: #ebf7ff;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  border-radius: 5px;
  padding: 15px;
  cursor: pointer;
  margin: 3px 0;
  font-weight: ${(props: BoxProps) => props.active && 'bold'};
  color: ${(props: BoxProps) => (props.active || props.visited ? '#003366' : '#B0D4ED')};
  background-color: ${(props: BoxProps) => (props.active || props.visited ? '#BCE4FF' : '#F5FBFF')};
  border: ${(props: BoxProps) => (props.active || props.visited ? '1px solid #006fc4' : '1px solid #B9D8F0')};
`;

const Circle = styled.div`
  height: 40px;
  width: 40px;
  min-width: 40px;
  text-align: center;
  line-height: 40px;
  border-radius: 40px;
  border: 1px solid #b9d8f0;
  background-color: white;
  font-weight: bold;
`;

const Text = styled.p`
  margin: 0 0 0 5px;
`;

export default function FormStagebox({ stageNumber, title, active, visited, handleClick, hasError }: FormStageBox) {
  return (
    <Box active={active || false} visited={visited || false} onClick={handleClick} data-testid={`stage-${stageNumber}`}>
      <Circle>
        {hasError ? (
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            color="red"
            title="Some additional fields require your attention."
          />
        ) : (
          stageNumber
        )}
      </Circle>
      <Text>{title}</Text>
    </Box>
  );
}
