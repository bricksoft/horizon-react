import { describe } from 'ava-spec';

import * as horizonClient from './index';

describe('interface:', (test) => {
  [
    'Connector',
    'subscribe',
  ].forEach((key) => {
    test(`it should export ${key}`, (t) => {
      t.true(horizonClient.hasOwnProperty(key));
    });
  });
});
