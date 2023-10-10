import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { faDownLeftAndUpRightToCenter, faStar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SECONDARY_BLUE } from 'styles/theme';
import Button from '@button-inc/bcgov-theme/Button';
import Textarea from '@button-inc/bcgov-theme/Textarea';
import { submitSurvey } from '@app/services/user';

const HEADER_HEIGHT = '4rem';

const SContainer = styled.div`
  position: fixed;
  right: 0;
  bottom: 0;
  width: 400px;
`;

const SBox = styled.div`
  border-radius: 0.5rem 0.5rem 0 0;
  background-color: white;
  transition: height 500ms ease;
  box-shadow: rgba(0, 0, 0, 0.15) -2px 2px 2.5px;
  overflow: hidden;
  position: absolute;
  width: 100%;
  bottom: 0;

  &.open {
    height: 500px;
  }

  &.closed {
    height: ${HEADER_HEIGHT};
  }

  &.hidden {
    height: 0;
  }

  .header {
    background-color: ${SECONDARY_BLUE};
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    height: ${HEADER_HEIGHT};
    padding: 1rem;
    align-items: center;
    color: white;
    font-weight: bold;
    cursor: pointer;
    font-size: 1.2rem;

    p {
      padding: 0;
      margin: 0;
    }
  }

  .body {
    display: flex;
    flex-direction: column;
    padding: 1em;
    height: calc(100% - ${HEADER_HEIGHT});
  }

  .button-container {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-top: auto;
  }

  p {
    margin: 0;

    &.title {
      margin-bottom: 0.5rem;
    }
  }
`;

const SRatingsContainer = styled.div`
  width: 100%;

  margin: 1.5rem 0 1.5rem 0;

  .stars-box,
  .stars-text {
    width: 100%;
    display: flex;
    justify-content: space-between;
  }

  .stars-text {
    padding: 0.5rem 0.1rem 0 0.1rem;
  }
`;

interface Props {
  setOpenSurvey: (open: boolean) => void;
  setDisplaySurvey: (open: boolean) => void;
  open: boolean;
  display: boolean;
}

const defaultRatings = [
  { selected: false, id: 1 },
  { selected: false, id: 2 },
  { selected: false, id: 3 },
  { selected: false, id: 4 },
  { selected: false, id: 5 },
];

function SurveyBox({ setOpenSurvey, setDisplaySurvey, open, display }: Props) {
  const [ratings, setRatings] = useState(defaultRatings);
  const [surveyMessage, setSurveyMessage] = useState('');

  const handleToggle = () => {
    setOpenSurvey(!open);
  };

  const handleRatingsClick = (clickedIndex: number) => {
    // Toggle rating back to 0 if clicking the current rating
    const previousRating = ratings.filter((rating) => rating.selected).length;
    const selectedRating = clickedIndex + 1;
    if (previousRating === selectedRating) {
      setRatings(defaultRatings);
    } else {
      setRatings(ratings.map((rating, i) => ({ ...rating, selected: i <= clickedIndex })));
    }
  };

  const hideSurvey = () => setDisplaySurvey(false);

  // Clear internal form state when removed from display
  useEffect(() => {
    if (display === false) {
      setRatings(defaultRatings);
      setSurveyMessage('');
    }
  }, [display]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSurveyMessage(e.target.value);
  };

  const saveSurvey = async () => {
    // Currently just closing survey and not showing user any error message.
    submitSurvey({
      message: surveyMessage,
      rating: ratings.filter((rating) => rating.selected).length,
    });
    setDisplaySurvey(false);
    setOpenSurvey(false);
  };

  const surveyBoxClass = `${open ? 'open' : 'closed'} ${!display && 'hidden'}`;
  return (
    <SContainer>
      <SBox className={surveyBoxClass}>
        <div className="header" onClick={handleToggle}>
          <p>We'd love to hear from you</p>
          <FontAwesomeIcon icon={faDownLeftAndUpRightToCenter} />
        </div>
        <div className="body">
          <p className="title">
            <strong>Rate our service</strong>
          </p>
          <p>How was your experience with the CSS app?</p>
          <SRatingsContainer>
            <div className="stars-box">
              {ratings.map((rating, i) => (
                <FontAwesomeIcon
                  key={rating.id}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  size="3x"
                  icon={faStar}
                  color={rating.selected ? 'gold' : 'grey'}
                  onClick={() => handleRatingsClick(i)}
                />
              ))}
            </div>
            <div className="stars-text">
              <span>Bad</span>
              <span>Great</span>
            </div>
          </SRatingsContainer>

          <Textarea
            fullWidth
            placeholder="Leave a message..."
            rows={4}
            value={surveyMessage}
            onChange={handleMessageChange}
          />
          <div className="button-container">
            <Button variant="secondary" onClick={hideSurvey}>
              Maybe Later
            </Button>
            <Button onClick={saveSurvey}>Rate now</Button>
          </div>
        </div>
      </SBox>
    </SContainer>
  );
}
export default SurveyBox;
