import styled from 'styled-components';
import FormStageBox from 'form-components/FormStageBox';
import { Schema } from '@app/schemas/index';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

interface Props {
  currentStage: number;
  setFormStage: Function;
  errors: any;
  visited: any;
  isNew: boolean;
  schemas: Schema[];
}

const Container = styled.div`
  width: 824px;
  max-width: 100%;
`;

export default function Formstage({ currentStage, setFormStage, errors, isNew, visited, schemas }: Props) {
  const handleClick = (stage: number) => {
    // Disable navigation if record is not yet created
    if (isNew) return;
    setFormStage(stage);
  };

  return (
    <Container>
      <Row md={4} xs={1} className="g-0">
        {schemas?.map((schema, index) => (
          <Col key={schema.stepText}>
            <FormStageBox
              title={schema.stepText}
              stageNumber={index + 1}
              active={index === currentStage}
              key={index}
              hasError={!!errors[index]}
              visited={visited[index]}
              handleClick={() => handleClick(index)}
            />
          </Col>
        ))}
      </Row>
    </Container>
  );
}
