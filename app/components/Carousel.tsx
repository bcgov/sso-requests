import { ReactNode, useEffect, useState } from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import useWindowDimensions from '@app/hooks/useWindowDimensions';

interface Props {
  viewableItems: number;
  children: ReactNode[];
}

const Container = styled.div<{ viewableItems: number; index: number; totalItems: number }>`
  width: 100%;
  .outer-window {
    padding: 1em 0;
    width: 100%;
    overflow-x: hidden;
    white-space: nowrap;
    .inner-window {
      transform: translate(-${(props) => (100 / props.viewableItems) * props.index}%);
      transition: transform 400ms ease-in-out;
      .item-container {
        display: inline-block;
        vertical-align: top;
        width: calc(100% / ${(props) => props.viewableItems});
        padding: 0 0.5em;
        white-space: wrap;
      }
    }
  }

  .controls {
    text-align: center;
    margin: 1em 0;

    .arrow-left {
      margin-right: 0.5em;
      cursor: ${(props) => (props.index === 0 ? 'not-allowed' : 'pointer')};
      color: ${(props) => (props.index === 0 ? 'grey' : '#036')};
    }

    .arrow-right {
      margin-left: 0.5em;
      cursor: ${(props) => (props.index === props.totalItems - props.viewableItems ? 'not-allowed' : 'pointer')};
      color: ${(props) => (props.index === props.totalItems - props.viewableItems ? 'grey' : '#036')};
    }
  }
`;

export default function Carousel({ viewableItems, children }: Readonly<Props>) {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const { width } = useWindowDimensions();

  const moveCarousel = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      if (carouselIndex <= 0) return;
      setCarouselIndex(carouselIndex - 1);
    } else {
      if (carouselIndex >= children.length - viewableItems) return;
      setCarouselIndex(carouselIndex + 1);
    }
  };

  useEffect(() => {
    // Adjust index if browser width changes
    if (carouselIndex >= children.length - viewableItems) {
      setCarouselIndex(children.length - viewableItems);
    }
  }, [width]);

  return (
    <Container viewableItems={viewableItems} index={carouselIndex} totalItems={children.length}>
      <div className="outer-window">
        <div className="inner-window">
          {children.map((child) => (
            <div className="item-container" key={(child as any).key}>
              {child}
            </div>
          ))}
        </div>
      </div>
      {children.length > viewableItems && (
        <div className="controls">
          <FontAwesomeIcon
            icon={faChevronLeft}
            size="2x"
            className="arrow arrow-left"
            onClick={() => moveCarousel('left')}
          />
          <FontAwesomeIcon
            icon={faChevronRight}
            size="2x"
            className="arrow arrow-right"
            onClick={() => moveCarousel('right')}
          />
        </div>
      )}
    </Container>
  );
}
