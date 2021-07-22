import FormStageBox from 'form-components/FormStageBox';
import Grid from '@button-inc/bcgov-theme/Grid';
import { isObject } from 'lodash';
import { FormErrors } from 'interfaces/form';
import styled from 'styled-components';
interface Props {
  currentStage: number;
  setFormStage: Function;
  errors: FormErrors | null;
  creatingNewForm: Function;
}

interface Stage {
  title: string;
  number: number;
  errorKey: 'firstPageErrors' | 'secondPageErrors' | 'thirdPageErrors' | 'fourthPageErrors';
}

const stages: Stage[] = [
  { title: 'Requester Info', number: 1, errorKey: 'firstPageErrors' },
  { title: "Providers and URI's", number: 2, errorKey: 'secondPageErrors' },
  { title: 'Terms and conditions', number: 3, errorKey: 'thirdPageErrors' },
  { title: 'Review & Submit', number: 4, errorKey: 'fourthPageErrors' },
];

const Container = styled.div`
  width: 824px;
`;

export default function Formstage({ currentStage, setFormStage, errors, creatingNewForm }: Props) {
  const handleClick = (stage: number) => {
    // Disable navigation if record is not yet created
    if (creatingNewForm()) return;
    setFormStage(stage);
  };

  return (
    <Container>
      <Grid cols={4}>
        <Grid.Row collapse="992" gutter={[]}>
          {stages.map((stage) => (
            <Grid.Col>
              <FormStageBox
                title={stage.title}
                stageNumber={stage.number}
                active={stage.number === currentStage}
                key={stage.number}
                hasError={isObject(errors) && (errors[stage.errorKey]?.length || 0) > 0}
                handleClick={() => handleClick(stage.number)}
              />
            </Grid.Col>
          ))}
        </Grid.Row>
      </Grid>
    </Container>
  );
}
