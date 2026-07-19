import UserRepository from '../src/repositories/UserRepository.js';

const result = await UserRepository.findAllPaginated({ page: 1, limit: 5 });
console.log(JSON.stringify(result, null, 2));

process.exit(0);