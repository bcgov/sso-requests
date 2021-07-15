import styled from 'styled-components';

interface BoxProps {
  active: boolean | undefined;
}

export interface FormStageBox {
  title: string;
  stageNumber: number;
  active?: boolean;
}

const Box = styled.div<BoxProps>`
  height: 60px;
  width: 200px;
  background-color: #ebf7ff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  border-radius: 5px;
  padding: 20px;

  border: 1px solid #006fc4;
  opacity: ${(props: BoxProps) => (props.active ? '1' : '0.5')};
  color: ${(props: BoxProps) => !props.active && '#003366'};
`;

const Circle = styled.div`
  height: 40px;
  width: 40px;
  text-align: center;
  line-height: 40px;
  border-radius: 40px;
  background-color: white;
`;

const Text = styled.p`
  width: 100px;
  margin: 0;
`;

export default function FormStagebox({ stageNumber, title, active }: FormStageBox) {
  return (
    <Box active={active}>
      <Circle>{stageNumber}</Circle>
      <Text>{title}</Text>
    </Box>
  );
}
