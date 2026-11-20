/**
 * Data Consistency Cleanup Script for Cancelled Bookings
 * 
 * Purpose:
 * Finds Job documents whose associated Booking is CANCELLED but whose job status is still active.
 * Sets job.status to 'CANCELLED'.
 * 
 * STRICT SAFETY RULES:
 * - Touches ONLY Job documents on CANCELLED bookings.
 * - Does NOT touch bids, payments, refunds, wallets, or assignments.
 * - Dry-run by default. Requires explicit '--apply' flag to execute updates.
 * 
 * Usage:
 * Dry-run:  npx ts-node scripts/cleanup-cancelled-jobs.ts
 * Apply:    npx ts-node scripts/cleanup-cancelled-jobs.ts --apply
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function runCleanup() {
  const isApply = process.argv.includes('--apply');
  console.log(`========================================================`);
  console.log(`  CLEANUP CANCELLED BOOKING JOBS [${isApply ? 'MODE: APPLY' : 'MODE: DRY-RUN'}]`);
  console.log(`========================================================\n`);

  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI environment variable not found.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed or db is undefined.');
  }

  try {
    // 1. Fetch all cancelled booking IDs
    const cancelledBookings = await db.collection('bookings').find(
      { status: 'CANCELLED' },
      { projection: { _id: 1, cancellationReason: 1 } }
    ).toArray();

    const cancelledIds = cancelledBookings.map(b => b._id);
    console.log(`Found ${cancelledBookings.length} total CANCELLED bookings in database.`);

    // 2. Identify Job documents attached to these cancelled bookings where status != 'CANCELLED'
    const jobsNeedingUpdate = await db.collection('jobs').find({
      bookingId: { $in: cancelledIds },
      status: { $ne: 'CANCELLED' }
    }, {
      projection: { _id: 1, bookingId: 1, partnerId: 1, status: 1, createdAt: 1 }
    }).toArray();

    console.log(`Found ${jobsNeedingUpdate.length} Job(s) needing status -> CANCELLED:\n`);

    if (jobsNeedingUpdate.length === 0) {
      console.log('✓ No desynchronized jobs found. All jobs on cancelled bookings are already CANCELLED.');
      return;
    }

    for (const job of jobsNeedingUpdate) {
      console.log(`  • Job ID: ${job._id} | Booking ID: ${job.bookingId} | Current Status: ${job.status}`);
    }

    if (!isApply) {
      console.log(`\n[DRY-RUN COMPLETE] 0 records modified.`);
      console.log(`To apply these updates, run with the --apply flag:`);
      console.log(`  npx ts-node scripts/cleanup-cancelled-jobs.ts --apply\n`);
    } else {
      console.log(`\n[APPLYING UPDATES] Updating ${jobsNeedingUpdate.length} job(s)...`);
      const updateResult = await db.collection('jobs').updateMany(
        {
          _id: { $in: jobsNeedingUpdate.map(j => j._id) },
          status: { $ne: 'CANCELLED' }
        },
        {
          $set: {
            status: 'CANCELLED',
            updatedAt: new Date()
          }
        }
      );
      console.log(`✓ Successfully updated ${updateResult.modifiedCount} job(s) to status 'CANCELLED'.\n`);
    }
  } catch (err: any) {
    console.error('Cleanup script encountered an error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

runCleanup();
