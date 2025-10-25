jest.setTimeout(30000);

process.env.JWT_SECRET = 'testsecret';
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || '7.0.5';
