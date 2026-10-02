jest.mock('@app/utils/authenticate');

jest.mock('@app/utils/ches', () => {
  return {
    ...jest.requireActual('@app/utils/ches'),
    sendEmail: jest.fn(),
  };
});

jest.mock('@app/queries/bcgov-unit', () => {
  return {
    listBcgovUnits: jest.fn(() => Promise.resolve([{ id: 1, name: 'Test Unit', code: 'TU' }])),
    getBcgovUnitById: jest.fn(() => Promise.resolve({ id: 1, name: 'Test Unit', code: 'TU' })),
  };
});

jest.mock('@app/queries/division', () => {
  return {
    listDivisions: jest.fn(() => Promise.resolve([{ id: 1, name: 'Test Division', code: 'TD', bcgovUnitId: 1 }])),
    getDivisionById: jest.fn(() => Promise.resolve({ id: 1, name: 'Test Division', code: 'TD', bcgovUnitId: 1 })),
    getByBcgovUnitAndDivision: jest.fn(() =>
      Promise.resolve({ id: 1, name: 'Test Division', code: 'TD', bcgovUnitId: 1 }),
    ),
  };
});
