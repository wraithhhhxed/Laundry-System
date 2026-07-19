// backend/scripts/seedAppointments.js
//
// Gumagawa ng ~90 fresh na dummy appointments para sa testing, base sa
// totoong ground truth pricing (5 fixed services, hindi per-kilo) at totoong
// IDs mula sa Postgres (branches, users, services, clothing types, products,
// promo codes).
//
// RESETTABLE/IDEMPOTENT: lahat ng appointments na gawa ng script na ito ay
// may sessionId na nagsisimula sa "SEED-". Tuwing paulit-ulit itong patakbuhin,
// aalisin muna ang dating SEED- appointments (at mga related rows nila) bago
// gumawa ng bago. Hindi nito gagalawin ang totoong/manual na data.
import 'dotenv/config';
import crypto from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const TOTAL_APPOINTMENTS = 90;
const VAT_RATE = 0.12;

// Totoong 8 Selfie Wash branches lang (excluded: test/example/junk entries)
const REAL_BRANCH_NAME_PREFIX = 'Selfie Wash';

const DELIVERY_STATUSES = [
  'pending_approval',
  'approved',
  'picked_up',
  'in_progress',
  'out_for_delivery',
  'delivered',
];

const REFUND_STATUSES = ['requested', 'approved', 'rejected', 'completed'];
const REFUND_REASONS = [
  'Nasira ang damit',
  'Mali ang na-deliver na order',
  'Huli ang delivery',
  'Nagbago ng isip ang customer',
];

const PAYMENT_METHODS = ['cash', 'gcash', 'paymaya', 'instapay', 'bdo'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinLastNDays(days) {
  const now = Date.now();
  const past = now - randInt(0, days) * 24 * 60 * 60 * 1000;
  return new Date(past);
}

function toSlotDate(date) {
  return date.toISOString().slice(0, 10);
}

function toSlotTime() {
  const hour = randInt(7, 18);
  const minute = pick(['00', '15', '30', '45']);
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

async function main() {
  console.log('Kinukuha ang reference data mula Postgres...');

  const allBranches = await prisma.branch.findMany({
    select: { id: true, name: true, email: true, phone: true, address: true, image: true },
  });
  const branches = allBranches.filter((b) => b.name.startsWith(REAL_BRANCH_NAME_PREFIX));

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, phone: true, address: true, image: true },
  });

  const services = await prisma.service.findMany({
    where: { isActive: true },
    select: { id: true, name: true, price: true },
  });

  const clothingTypes = await prisma.clothingType.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, price: true },
  });

  const promoCodes = await prisma.promoCode.findMany({
    where: { isActive: true },
    select: { id: true, code: true, discountType: true, discountValue: true, minOrderAmount: true },
  });

  if (branches.length === 0) throw new Error('Walang nahanap na totoong Selfie Wash branches.');
  if (users.length === 0) throw new Error('Walang User records.');
  if (services.length === 0) throw new Error('Walang active Service records.');

  console.log(
    `Branches: ${branches.length}, Users: ${users.length}, Services: ${services.length}, ClothingTypes: ${clothingTypes.length}, Products: ${products.length}, PromoCodes: ${promoCodes.length}`
  );

  // --- Cleanup: alisin muna ang dating SEED- appointments (idempotent) ---
  console.log('Nililinis ang dating SEED- appointments (kung meron)...');
  const oldSeeded = await prisma.appointment.findMany({
    where: { sessionId: { startsWith: 'SEED-' } },
    select: { id: true },
  });
  const oldSeededIds = oldSeeded.map((a) => a.id);
  if (oldSeededIds.length > 0) {
    await prisma.appointmentService.deleteMany({ where: { appointmentId: { in: oldSeededIds } } });
    await prisma.appointmentAddOn.deleteMany({ where: { appointmentId: { in: oldSeededIds } } });
    await prisma.appointmentClothingType.deleteMany({ where: { appointmentId: { in: oldSeededIds } } });
    await prisma.appointment.deleteMany({ where: { id: { in: oldSeededIds } } });
    console.log(`Tinanggal ang ${oldSeededIds.length} lumang seed appointments.`);
  }

  // --- Gumawa ng bagong appointments ---
  const statusCounts = {};
  let cancelledCount = 0;
  let refundedCount = 0;

  for (let i = 0; i < TOTAL_APPOINTMENTS; i++) {
    const branch = pick(branches);
    const user = pick(users);
    const deliveryStatus = DELIVERY_STATUSES[i % DELIVERY_STATUSES.length]; // even distribution
    statusCounts[deliveryStatus] = (statusCounts[deliveryStatus] || 0) + 1;

    const isCancelled = Math.random() < 0.1; // ~10% cancelled
    if (isCancelled) cancelledCount++;

    const isCompleted = deliveryStatus === 'delivered' && !isCancelled;

    // 1-3 loads bawat appointment
    const numLoads = randInt(1, 3);
    const loadServices = Array.from({ length: numLoads }, () => pick(services));

    // Weight confirmation: totoo lang kung lumagpas na sa "approved" stage
    const pastApproved = ['picked_up', 'in_progress', 'out_for_delivery', 'delivered'].includes(deliveryStatus);
    const weightConfirmed = pastApproved && Math.random() < 0.85; // ilan pa rin walang confirm kahit past approved (edge case)

    const appointmentId = crypto.randomUUID();
    const sessionId = `SEED-${appointmentId}`;
    const createdAt = randomDateWithinLastNDays(60);
    const slotDate = toSlotDate(createdAt);
    const slotTime = toSlotTime();

    // --- Services (loads) ---
    const appointmentServices = loadServices.map((svc) => {
      const kg = randInt(1, 7);
      const actualKg = weightConfirmed ? Math.min(7, Math.max(1, kg + randInt(-1, 1))) : null;
      return {
        serviceId: svc.id,
        name: svc.name,
        price: svc.price,
        kg,
        actualKg,
      };
    });
    const servicesTotal = appointmentServices.reduce((sum, s) => sum + s.price, 0);

    // --- AddOns (~45% ng appointments) ---
    const hasAddOns = products.length > 0 && Math.random() < 0.45;
    const chosenProducts = hasAddOns ? pickN(products, randInt(1, 2)) : [];
    const appointmentAddOns = chosenProducts.map((p) => ({
      productId: p.id,
      name: p.name,
      price: p.price,
      quantity: randInt(1, 2),
    }));
    const addOnsTotal = appointmentAddOns.reduce((sum, a) => sum + a.price * a.quantity, 0);

    // --- ClothingTypes (~35% ng appointments) ---
    const hasClothingTypes = clothingTypes.length > 0 && Math.random() < 0.35;
    const chosenClothingTypes = hasClothingTypes ? pickN(clothingTypes, randInt(1, 2)) : [];
    const appointmentClothingTypes = chosenClothingTypes.map((ct) => ({
      clothingTypeId: ct.id,
    }));

    // --- Promo code (~25% ng appointments, dapat may minOrderAmount na naabot) ---
    const subtotalBeforeDiscount = servicesTotal + addOnsTotal;
    const eligiblePromos = promoCodes.filter((p) => subtotalBeforeDiscount >= p.minOrderAmount);
    const usePromo = eligiblePromos.length > 0 && Math.random() < 0.25;
    const promo = usePromo ? pick(eligiblePromos) : null;

    let discountAmount = 0;
    if (promo) {
      discountAmount =
        promo.discountType === 'percent'
          ? +(subtotalBeforeDiscount * (promo.discountValue / 100)).toFixed(2)
          : Math.min(promo.discountValue, subtotalBeforeDiscount);
    }

    const totalAmount = +(subtotalBeforeDiscount - discountAmount).toFixed(2);
    const vatAmount = +(totalAmount * VAT_RATE).toFixed(2);
    const finalAmount = +(totalAmount + vatAmount).toFixed(2);

    // --- Payment ---
    const paymentStatus = isCancelled ? 'unpaid' : pick(['unpaid', 'paid', 'paid', 'paid']); // mas malamang bayad na
    const payment = paymentStatus === 'paid';
    const paymentMethod = payment ? pick(PAYMENT_METHODS) : null;
    const paymentPaidAt = payment ? randomDateWithinLastNDays(30) : null;

    // --- Refund (~12% ng appointments, mas malamang sa cancelled) ---
    const refundEligible = isCancelled || deliveryStatus === 'delivered';
    const hasRefund = refundEligible && Math.random() < (isCancelled ? 0.4 : 0.08);
    let refundFields = {
      refundStatus: 'none',
      refundAmount: null,
      refundReason: null,
      refundNote: null,
      refundedAt: null,
      refundRejectedAt: null,
      refundRejectedBy: null,
      refundRejectionNote: null,
    };
    if (hasRefund) {
      refundedCount++;
      const refundStatus = pick(REFUND_STATUSES);
      refundFields = {
        refundStatus,
        refundAmount: refundStatus === 'completed' || refundStatus === 'approved' ? finalAmount : null,
        refundReason: pick(REFUND_REASONS),
        refundNote: 'Auto-generated seed note.',
        refundedAt: refundStatus === 'completed' ? randomDateWithinLastNDays(15) : null,
        refundRejectedAt: refundStatus === 'rejected' ? randomDateWithinLastNDays(15) : null,
        refundRejectedBy: refundStatus === 'rejected' ? 'admin@selfiewash.com' : null,
        refundRejectionNote: refundStatus === 'rejected' ? 'Lumagpas na sa refund window.' : null,
      };
    }

    await prisma.appointment.create({
      data: {
        id: appointmentId,
        userId: user.id,
        branchId: branch.id,
        branchData: {
          id: branch.id,
          name: branch.name,
          email: branch.email,
          phone: branch.phone,
          address: branch.address,
          image: branch.image,
        },
        userData: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          image: user.image,
        },

        servicesTotal,
        addOnsTotal,
        totalAmount,

        vatRate: VAT_RATE,
        vatAmount,

        promoCodeId: promo ? promo.id : null,
        promoCode: promo ? promo.code : null,
        discountType: promo ? promo.discountType : null,
        discountValue: promo ? promo.discountValue : 0,
        discountAmount,

        finalAmount,

        weightConfirmedAt: weightConfirmed ? randomDateWithinLastNDays(20) : null,
        weightConfirmedBy: weightConfirmed ? branch.email : null,

        preferredPaymentMethod: pick(PAYMENT_METHODS),
        paymentStatus,
        paymentMethod,
        paymentPaidAt,
        payment,

        ...refundFields,

        slotDate,
        slotTime,
        date: BigInt(createdAt.getTime()),

        pickupAddress: { line1: 'Sample Street', line2: 'Taguig City' },
        deliveryAddress: { line1: 'Sample Street', line2: 'Taguig City' },

        deliveryStatus,
        cancelled: isCancelled,
        isCompleted,

        specialInstructions: Math.random() < 0.2 ? 'Please handle with care.' : null,
        sessionId,

        createdAt,

        services: { create: appointmentServices },
        addOns: { create: appointmentAddOns },
        clothingTypes: { create: appointmentClothingTypes },
      },
    });

    if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${TOTAL_APPOINTMENTS} nagawa na...`);
  }

  console.log('\n=== SUMMARY ===');
  console.log('Total appointments:', TOTAL_APPOINTMENTS);
  console.log('Distribution per deliveryStatus:', statusCounts);
  console.log('Cancelled:', cancelledCount);
  console.log('May refund record:', refundedCount);
  console.log('Done!');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});