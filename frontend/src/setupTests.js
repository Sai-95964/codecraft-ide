import '@testing-library/jest-dom';

// Ensure Jest receives a CommonJS build of axios compatible with node's module resolution
jest.mock('axios', () => {
	const axios = require('axios/dist/node/axios.cjs');
	return { ...axios, default: axios };
});
