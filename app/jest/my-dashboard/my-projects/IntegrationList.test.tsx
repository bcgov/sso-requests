import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import IntegrationList from 'page-partials/my-dashboard/IntegrationList';
import { Integration } from 'interfaces/Request';
import noop from 'lodash.noop';

const setIntegration = () => {};
const setIntegrationCount = () => {};
//const setIntegrationCount = noop;

// describe('Selected Integration', ()=>{
//     it('should match the selected integration ID and match the color', async () => {
//         render(<IntegrationList setIntegration={setIntegration} setIntegrationCount={setIntegrationCount} />);
//         expect(screen.getByText('Request ID'));
//     });

//     it('should match table headers, data, rows and action buttons', async () => {

//     })
// });
