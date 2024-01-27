import { ITestimonial } from '@app/interfaces/Testimonial';
import styled from 'styled-components';
import { faStar, faStarHalf } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface Props {
  testimonial: ITestimonial;
}

const Card = styled.div`
  border-radius: 1em;
  background: #f2f8ff;
  padding: 1em;
  box-shadow: rgba(60, 64, 67, 0.3) 0px 1px 2px 0px, rgba(60, 64, 67, 0.15) 0px 2px 6px 2px;

  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .ratings {
    display: flex;
    margin-bottom: 0.5em;
  }

  .author {
    .name {
      font-weight: bold;
    }
  }

  .seperator {
    margin: 1em 0;
    padding: 0;
    background-color: black;
    height: 1px;
  }
`;

const MAX_RATING = 5;

const HalfStarContainer = styled.span`
  position: relative;
  * {
    position: absolute;
  }
`;

const HalfStar = () => {
  return (
    <HalfStarContainer>
      <FontAwesomeIcon color="gold" icon={faStarHalf} size="lg" fill="grey" />
      <FontAwesomeIcon color="grey" icon={faStarHalf} size="lg" transform={{ flipX: true }} />
    </HalfStarContainer>
  );
};

export default function Testimonial({ testimonial }: Readonly<Props>) {
  const hasHalfRating = testimonial.rating % 1 === 0.5;

  const ratings = Array.from(Array(Math.floor(testimonial.rating)).keys());
  const emptyRatings = Array.from(Array(MAX_RATING - Math.ceil(testimonial.rating)).keys());

  return (
    <Card>
      <div className="ratings">
        {ratings.map((i) => (
          <FontAwesomeIcon key={i} color="gold" icon={faStar} size="lg" />
        ))}
        {hasHalfRating && <HalfStar />}
        {emptyRatings.map((i) => (
          <FontAwesomeIcon key={i} color="grey" icon={faStar} size="lg" />
        ))}
      </div>

      <div className="body">{testimonial.body}</div>

      <div className="author">
        <hr className="seperator" />
        <span className="name">{testimonial.author.name}</span> |{' '}
        <span className="title">{testimonial.author.title}</span>
      </div>
    </Card>
  );
}
