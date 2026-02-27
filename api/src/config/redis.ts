// Mock Redis for local development without the Redis server
// Updated to fix TS6133 unused variable error
const redisClient = {
  // We use ...args: any[] to tell TypeScript we don't care about the arguments
  on: (...args: any[]) => {
    // This is an empty mock function to satisfy the interface
    return args; 
  },
  connect: async () => {
    console.log('✅ Redis Layer: Bypassed (Mock Mode Active)');
    return Promise.resolve();
  },
  setEx: async () => { return 'OK'; },
  get: async () => { return null; },
  del: async () => { return 0; },
  exists: async () => { return 0; },
  quit: async () => { return 'OK'; },
  keys: async () => { return []; },
};

export default redisClient as any;