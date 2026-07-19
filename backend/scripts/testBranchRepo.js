import BranchRepository from '../src/repositories/BranchRepository.js';

const result = await BranchRepository.findAllPaginated({ page: 1, limit: 5 });
console.log(JSON.stringify(result, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
, 2));

process.exit(0);