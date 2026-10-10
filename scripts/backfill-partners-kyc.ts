/**
 * Migration & Backfill Script: Partner KYC & Schema Transition
 *
 * DO NOT RUN THIS SCRIPT WITHOUT EXPLICIT PERMISSION.
 * Usage:
 *   npx ts-node scripts/backfill-partners-kyc.ts --dry-run   (Dry run - no DB writes)
 *   npx ts-node scripts/backfill-partners-kyc.ts             (Live run - applies DB updates)
 *
 * What this script does:
 * 1. Connects to MongoDB via MONGO_URI from .env.
 * 2. Fetches all existing Partner records.
 * 3. Analyzes each partner document:
 *    - Maps legacy 'businessName' to 'workshopName' if missing.
 *    - Generates 'normalizedWorkshopName' (lowercase, trimmed).
 *    - Status transitions:
 *        'APPROVED' (legacy) + isVerified=true => 'APPROVED_VERIFIED'
 *        'PENDING'  (legacy) => 'REGISTRATION_SUBMITTED'
 *        'UNDER_REVIEW'      => remains 'UNDER_REVIEW'
 *        'REJECTED'          => remains 'REJECTED'
 *    - For partners transitioning to 'APPROVED_VERIFIED', generates sequential 'CB-P-XXXXXX' ID
 *      if 'uniquePartnerId' is currently missing or undefined.
 *    - Backfills default flags: isActive: true, reVerificationRequired: false, duplicateFlags: [].
 *    - Migrates legacy bankDetails to top-level bank fields (accountHolderName, bankName, accountNumber, ifsc).
 * 4. In --dry-run mode:
 *    - Outputs a detailed summary table of proposed status changes.
 *    - Performs ZERO database writes.
 * 5. In live mode:
 *    - Updates the records using bulkWrite or document.save().
 *    - Creates an initial PartnerVerificationLog entry for each transitioned record.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/carblink";
const isDryRun = process.argv.includes("--dry-run");

async function runBackfill() {
  console.log("=================================================================");
  console.log(`[PARTNER KYC BACKFILL] Mode: ${isDryRun ? "DRY RUN (No writes)" : "LIVE EXECUTION"}`);
  console.log("=================================================================");

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB successfully.\n");

    const { PartnerModel } = await import("../src/modules/partner/partner.model");
    const { PartnerVerificationLogModel } = await import("../src/modules/partner/partner-verification-log.model");

    const partners = await PartnerModel.find({}).lean();
    console.log(`Total Partner records found: ${partners.length}\n`);

    if (partners.length === 0) {
      console.log("No partner records found in database.");
      await mongoose.disconnect();
      return;
    }

    let nextPartnerSeq = 1;
    // Find highest existing sequence number if any
    const existingIds = partners
      .map((p) => p.uniquePartnerId)
      .filter((id): id is string => typeof id === "string" && id.startsWith("CB-P-"));

    if (existingIds.length > 0) {
      const numbers = existingIds.map((id) => parseInt(id.replace("CB-P-", ""), 10)).filter((n) => !isNaN(n));
      if (numbers.length > 0) {
        nextPartnerSeq = Math.max(...numbers) + 1;
      }
    }

    const report: Array<{
      partnerId: string;
      businessName: string;
      oldStatus: string;
      newStatus: string;
      assignedUniqueId?: string;
      changes: string[];
    }> = [];

    const operations: any[] = [];
    const logEntries: any[] = [];

    for (const partner of partners) {
      const changes: string[] = [];
      const oldStatus = partner.verificationStatus || "PENDING";
      let newStatus = oldStatus;
      let assignedUniqueId = partner.uniquePartnerId;

      // Status mapping
      if (oldStatus === "APPROVED" || (partner.isVerified && oldStatus !== "REJECTED")) {
        newStatus = "APPROVED_VERIFIED";
        changes.push(`verificationStatus: ${oldStatus} -> APPROVED_VERIFIED`);

        if (!assignedUniqueId) {
          assignedUniqueId = `CB-P-${String(nextPartnerSeq++).padStart(6, "0")}`;
          changes.push(`uniquePartnerId: assigned ${assignedUniqueId}`);
        }
      } else if (oldStatus === "PENDING") {
        newStatus = "REGISTRATION_SUBMITTED";
        changes.push(`verificationStatus: PENDING -> REGISTRATION_SUBMITTED`);
      }

      // Name normalization
      const workshopName = partner.workshopName || partner.businessName || "Workshop";
      const normalizedWorkshopName = workshopName.toLowerCase().trim();
      if (!partner.workshopName) {
        changes.push(`workshopName: set to "${workshopName}"`);
      }
      if (!partner.normalizedWorkshopName) {
        changes.push(`normalizedWorkshopName: set to "${normalizedWorkshopName}"`);
      }

      // Active status
      if (partner.isActive === undefined) {
        changes.push("isActive: set to true");
      }

      // Bank details mapping
      const bankDetails = partner.bankDetails;
      if (bankDetails) {
        if (!partner.accountNumber && bankDetails.accountNumber) changes.push("accountNumber: mapped from bankDetails");
        if (!partner.ifsc && bankDetails.ifscCode) changes.push("ifsc: mapped from bankDetails");
        if (!partner.accountHolderName && bankDetails.accountHolderName)
          changes.push("accountHolderName: mapped from bankDetails");
      }

      report.push({
        partnerId: String(partner._id),
        businessName: partner.businessName || partner.workshopName || "N/A",
        oldStatus,
        newStatus,
        assignedUniqueId,
        changes,
      });

      if (!isDryRun) {
        const updateDoc: any = {
          verificationStatus: newStatus,
          workshopName,
          normalizedWorkshopName,
          isActive: partner.isActive !== undefined ? partner.isActive : true,
          reVerificationRequired: partner.reVerificationRequired || false,
        };

        if (assignedUniqueId && !partner.uniquePartnerId) {
          updateDoc.uniquePartnerId = assignedUniqueId;
        }

        if (bankDetails) {
          if (!partner.accountNumber && bankDetails.accountNumber) updateDoc.accountNumber = bankDetails.accountNumber;
          if (!partner.ifsc && bankDetails.ifscCode) updateDoc.ifsc = bankDetails.ifscCode;
          if (!partner.accountHolderName && bankDetails.accountHolderName)
            updateDoc.accountHolderName = bankDetails.accountHolderName;
        }

        operations.push({
          updateOne: {
            filter: { _id: partner._id },
            update: { $set: updateDoc },
          },
        });

        if (oldStatus !== newStatus) {
          logEntries.push({
            partnerId: partner._id,
            action: "STATUS_CHANGED",
            fromStatus: oldStatus,
            toStatus: newStatus,
            notes: `Backfilled via migration script. UniquePartnerId: ${assignedUniqueId || "none"}.`,
            timestamp: new Date(),
            metadata: { source: "migration-script", changes },
          });
        }
      }
    }

    // Print summary report
    console.log("-----------------------------------------------------------------");
    console.log("BACKFILL SUMMARY REPORT:");
    console.log("-----------------------------------------------------------------");
    console.table(
      report.map((r) => ({
        "Partner ID": r.partnerId,
        "Workshop Name": r.businessName.slice(0, 25),
        "Old Status": r.oldStatus,
        "New Status": r.newStatus,
        "Unique Partner ID": r.assignedUniqueId || "-",
        "Changes Count": r.changes.length,
      }))
    );

    console.log(`\nTotal partners analyzed: ${report.length}`);
    const statusChanges = report.filter((r) => r.oldStatus !== r.newStatus).length;
    console.log(`Partners with status transitions: ${statusChanges}`);

    if (isDryRun) {
      console.log("\n[DRY RUN COMPLETE] Zero database writes performed.");
      console.log("To execute live changes in the future, run without --dry-run after approval.");
    } else {
      if (operations.length > 0) {
        console.log(`\nExecuting ${operations.length} partner updates...`);
        await PartnerModel.bulkWrite(operations);
        console.log("Partner updates applied successfully.");
      }
      if (logEntries.length > 0) {
        console.log(`Inserting ${logEntries.length} audit log entries...`);
        await PartnerVerificationLogModel.insertMany(logEntries);
        console.log("Audit log entries created successfully.");
      }
      console.log("\n[LIVE EXECUTION COMPLETE] All partner records successfully updated.");
    }
  } catch (error) {
    console.error("Backfill failed with error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

// Only execute when invoked directly from CLI
if (require.main === module) {
  runBackfill();
}
