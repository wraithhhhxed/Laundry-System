import { readBsonDocs } from './migrate/lib/readBson.js';
import path from 'path';

const filePath = path.resolve('C:/Users/cell2/Desktop/mongo-backup/laundryDB/appointments.bson');
const docs = readBsonDocs(filePath);

const oldShape = docs.filter(d => !d.services && d.service !== undefined);
const newShape = docs.filter(d => Array.isArray(d.services));
const neither = docs.filter(d => !d.services && d.service === undefined);

console.log('OLD shape (flat "service" string):', oldShape.length);
console.log('NEW shape (has "services" array):', newShape.length);
console.log('NEITHER (unexpected):', neither.length);

// tignan kung meron bang new-shape docs na may EMPTY services array
const emptyServicesArr = newShape.filter(d => d.services.length === 0);
console.log('NEW shape pero EMPTY services[]:', emptyServicesArr.length);

// tignan distinct na service names sa loob ng bagong services[] array
const serviceNamesInNewShape = new Set();
newShape.forEach(d => d.services.forEach(s => serviceNamesInNewShape.add(s.name)));
console.log('Unique service names sa loob ng services[]:', [...serviceNamesInNewShape]);

// tignan kung ilan sa new-shape ang may addOns, clothingTypes na may laman
console.log('NEW shape na may addOns:', newShape.filter(d => d.addOns?.length > 0).length);
console.log('NEW shape na may non-empty clothingTypes:', newShape.filter(d => d.clothingTypes?.length > 0).length);