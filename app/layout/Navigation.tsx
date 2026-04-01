import styled from 'styled-components';
import isFunction from 'lodash/isFunction';
import Image from 'next/image';
import { Col, Container, Nav, Navbar, Row } from 'react-bootstrap';
import { NavCollapseSVG } from '@app/components/NavCollapseSVG';
import {
  MAIN_NAV_APP_BAR_BOTTOM_BORDER_COLOR,
  MAIN_NAV_APP_BAR_COLOR,
  NAV_APP_BAR_TEXT_COLOR,
  SUB_NAV_APP_BAR_COLOR,
} from '@app/styles/theme';

const Title = styled.p`
  margin: 0;
  font-size: 1.75rem;
  color: ${NAV_APP_BAR_TEXT_COLOR};
`;

const DEFAULT_MOBILE_BREAK_POINT = '900';

function Navigation(props: any) {
  const {
    title = '',
    onBannerClick = () => null,
    children,
    mobileMenu,
    mobileBreakPoint = DEFAULT_MOBILE_BREAK_POINT,
    rightSide,
  } = props;
  const context = { mobileBreakPoint };

  return (
    <>
      <Navbar expand="lg" className="py-0">
        <Container fluid className="px-0 flex-column">
          <Row
            className="w-100 align-items-center py-2"
            style={{
              background: MAIN_NAV_APP_BAR_COLOR,
              borderBottom: `2px solid ${MAIN_NAV_APP_BAR_BOTTOM_BORDER_COLOR}`,
              paddingLeft: '2rem',
            }}
          >
            <Col xs="auto">
              <Navbar.Brand href="#">
                <Image
                  src="/bc_logo_header.svg"
                  alt="BC Government Logo"
                  width={150}
                  height={50}
                  onClick={onBannerClick}
                />
              </Navbar.Brand>
            </Col>

            <Col className="d-none d-lg-block" style={{ whiteSpace: 'nowrap' }}>
              <Title>{isFunction(title) ? title(context) : title}</Title>
            </Col>

            <Col className="text-end mx-5 d-none d-lg-block">{rightSide}</Col>

            <Col xs="auto" className="ms-auto d-lg-none">
              <Navbar.Toggle aria-controls="main-navbar-nav" className="border-0">
                <NavCollapseSVG />
              </Navbar.Toggle>
            </Col>
          </Row>
          <Row className="w-100 align-items-center">
            <Navbar.Collapse
              id="main-navbar-nav"
              className="w-100 d-lg-flex justify-content-center"
              style={{ background: SUB_NAV_APP_BAR_COLOR }}
            >
              <Nav className="w-100 px-2 py-2 pt-2 d-none d-lg-flex">{children}</Nav>

              <Nav className="d-lg-none flex-column mt-2" style={{ background: SUB_NAV_APP_BAR_COLOR }}>
                {mobileMenu()}
              </Nav>
            </Navbar.Collapse>
          </Row>
        </Container>
      </Navbar>
    </>
  );
}

export default Navigation;
