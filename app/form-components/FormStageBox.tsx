import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import kebabCase from 'lodash.kebabcase';

interface BoxProps {
  color: string;
  backgroundColor: string;
  fontWeight: string;
  border: string;
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
  ${({ color, backgroundColor, fontWeight, border }: BoxProps) => `
    color: ${color};
    background-color: ${backgroundColor};
    font-weight: ${fontWeight};
    border: ${border};
  `}
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
  color: #31393f;
`;

const Text = styled.p`
  margin: 0 0 0 5px;
`;

export default function FormStagebox({ stageNumber, title, active, visited, handleClick, hasError }: FormStageBox) {
  let color = '#999999';
  let backgroundColor = '#F0F8FE';
  let fontWeight = '400';
  let border = '1px solid #999999';

  if (active) {
    if (hasError) {
      color = '#FFFFFF';
      backgroundColor = '#D75757';
      fontWeight = '700';
      border = '2px solid #313131';
    } else {
      color = '#FFFFFF';
      backgroundColor = '#2A6FBE';
      fontWeight = '700';
      border = '2px solid #313131';
    }
  } else if (visited) {
    if (hasError) {
      color = '#1A1A1A';
      backgroundColor = '#F1C0C0';
      fontWeight = '700';
      border = '1px solid #313131';
    } else {
      color = '#31393F';
      backgroundColor = '#C3E3FC';
      fontWeight = '400';
      border = '1px solid #313131';
    }
  }

  return (
    <Box
      color={color}
      backgroundColor={backgroundColor}
      fontWeight={fontWeight}
      border={border}
      onClick={handleClick}
      data-testid={`stage-${kebabCase(title)}`}
    >
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
