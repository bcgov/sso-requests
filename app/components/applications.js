import React, { PureComponent } from 'react';
import { Container, Button, Table, Form, Pagination } from 'react-bootstrap';
import SearchField from 'components/SearchField';
import Link from 'next/link';
import DropDownOption from 'components/DropDownOption';
import { getFilterStatuses, getStatusDisplayName } from 'shared/status-meta';
import { getAdminApplications } from 'services/application';

const allLimits = [
  { value: 5, displayName: '5 per page' },
  { value: 10, displayName: '10 per page' },
  { value: 15, displayName: '15 per page' },
  { value: 30, displayName: '30 per page' },
  { value: 50, displayName: '50 per page' },
  { value: 100, displayName: '100 per page' },
];

const defaultLimit = allLimits[1].value;

const getUserFriendlyDate = (date) => new Date(date).toLocaleString();

// Note:
// 1. It loads one extra application to get hint of next page.
// 2. It manages a list of application ids to make pagination work.
export default class Applications extends PureComponent {
  state = {
    applications: [],
    searchTerm: '',
    searchLimit: defaultLimit,
    lastIds: [0],
    filterStatuses: [],
    status: null,
  };

  handleSearchClick = this.handleSearchClick.bind(this);
  handleSearchTermChange = this.handleSearchTermChange.bind(this);
  handleStatusChange = this.handleStatusChange.bind(this);
  handleLimitChange = this.handleLimitChange.bind(this);
  handlePrevClick = this.handlePrevClick.bind(this);
  handleNextClick = this.handleNextClick.bind(this);

  componentDidMount() {
    const { session } = this.props;

    let storedState = localStorage.getItem('APPLICATIONS_STATE');
    storedState = storedState ? JSON.parse(storedState) : {};
    const filterStatuses = getFilterStatuses(session.context);
    this.setState({ ...storedState, filterStatuses, status: filterStatuses[0]?.value }, this.loadApplications);
  }

  async loadApplications() {
    const { searchTerm, searchLimit, lastIds, status } = this.state;

    const applications = await getAdminApplications({
      searchTerm,
      searchLimit: searchLimit + 1,
      lastId: lastIds[lastIds.length - 1],
      status,
    });

    localStorage.setItem('APPLICATIONS_STATE', JSON.stringify({ searchTerm, lastIds, status, searchLimit }));
    this.setState({ applications });
  }

  handleSearchTermChange(value) {
    this.setState({ searchTerm: value });
  }

  handleStatusChange(evt) {
    this.setState({ status: evt.target.value, lastIds: [0] }, this.loadApplications);
  }

  handleLimitChange(evt) {
    this.setState({ searchLimit: Number(evt.target.value) }, this.loadApplications);
  }

  async handleSearchClick() {
    this.setState({ lastIds: [0] }, this.loadApplications);
  }

  async handlePrevClick() {
    const { lastIds } = this.state;
    this.setState({ lastIds: lastIds.slice(0, -1) }, this.loadApplications);
  }

  async handleNextClick() {
    const { applications, lastIds } = this.state;
    const lastId = applications[applications.length - 2].application_id;
    this.setState({ lastIds: [...lastIds, lastId] }, this.loadApplications);
  }

  render() {
    const { applications, lastIds, searchLimit, searchTerm, status, filterStatuses } = this.state;

    return (
      <Container className="home">
        <h3 className="mt-5 mb-4">Manage Applications</h3>
        <div>
          <DropDownOption
            style={{ width: '130px' }}
            items={filterStatuses}
            defaultValue={status}
            onChange={this.handleStatusChange}
          />
          <div className="float-right">
            <SearchField
              value={searchTerm}
              setSearchTerm={this.handleSearchTermChange}
              onSearch={this.handleSearchClick}
            />
          </div>
        </div>
        <div className="applications mt-4">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Id</th>
                <th>Business Name</th>
                <th>Business Registration #</th>
                <th>Status</th>
                <th>Update Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan="6">No applications match this search.</td>
                </tr>
              ) : (
                applications.map((application, index) => {
                  // Since it loads one extra application to get hint of next page,
                  // skip the redundant application to display.
                  if (searchLimit <= index) return null;

                  return (
                    <tr key={application.application_id}>
                      <td> {application.application_id} </td>
                      <td> {application.business_name} </td>
                      <td> {application.business_registry_number} </td>
                      <td> {getStatusDisplayName(application.status)} </td>
                      <td> {getUserFriendlyDate(application.updated_at)} </td>
                      <td>
                        <Link href={`/admin/application/view?id=${application.application_id}`}>
                          <Button size="sm" variant="primary">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
          <div>
            <Pagination>
              <Pagination.Prev disabled={lastIds.length <= 1} onClick={this.handlePrevClick}>
                Previous
              </Pagination.Prev>
              <Pagination.Next disabled={applications.length <= searchLimit} onClick={this.handleNextClick}>
                Next
              </Pagination.Next>
              <DropDownOption
                style={{ width: '200px', marginLeft: 'auto', order: 2 }}
                items={allLimits}
                defaultValue={searchLimit}
                onChange={this.handleLimitChange}
              />
            </Pagination>
          </div>
        </div>
        <style jsx>
          {`
            .row {
              display: flex;
            }
            .m4 {
              padding-left: 20px;
            }
            .align-right {
              display: flex;
              justify-content: flex-end;
            }
            .searchField {
              width: 300px;
            }
          `}
        </style>
      </Container>
    );
  }
}
