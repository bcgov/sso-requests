import FormStageBox from 'form-components/FormStageBox';
import Grid from '@button-inc/bcgov-theme/Grid';

interface Props {
  currentStage: number;
  setFormStage: Function;
  errors: any;
}

const stages = [
  { title: 'Requester Info', number: 1, errorKey: 'firstPageErrors' },
  { title: "Providers and URI's", number: 2, errorKey: 'secondPageErrors' },
  { title: 'Terms and conditions', number: 3, errorKey: 'thirdPageErrors' },
  { title: 'Review & Submit', number: 4, errorKey: 'fourthPageErrors' },
];

export default function Formstage({ currentStage, setFormStage, errors = {} }: Props) {
  const handleClick = (stage: number) => {
    setFormStage(stage);
  };

  return (
    <Grid cols={4}>
      <Grid.Row collapse="1000">
        {stages.map((stage) => (
          <Grid.Col>
            <FormStageBox
              title={stage.title}
              stageNumber={stage.number}
              active={stage.number === currentStage}
              key={stage.number}
              hasError={errors[stage.errorKey]?.length > 0}
              handleClick={() => handleClick(stage.number)}
            />
          </Grid.Col>
        ))}
      </Grid.Row>
    </Grid>
  );
}
