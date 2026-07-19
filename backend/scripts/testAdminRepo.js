import AdminRepository from '../src/repositories/AdminRepository.js';

const admin = await AdminRepository.findByEmail('admin@selfiewash.com');
console.log(admin);

process.exit(0);