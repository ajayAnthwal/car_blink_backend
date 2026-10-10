import mongoose from 'mongoose';
import { PartnerModel, IPartner, IDuplicateFlag } from './partner.model';
import { UserModel } from '../user/user.model';
import { PartnerVerificationLogModel } from './partner-verification-log.model';
import { ROLES } from '../../common/constants/roles.constant';
import { emitToRole } from '../../sockets';

export class PartnerAntiFakeService {
  /**
   * Masks sensitive strings for audit logs and duplicate warnings.
   */
  public static maskValue(field: string, val?: string | null): string {
    if (!val) return 'Not Provided';
    const clean = String(val).trim();
    if (field === 'PAN') {
      return clean.length >= 4 ? `••••••${clean.slice(-4)}` : '••••';
    }
    if (field === 'BANK_ACCOUNT') {
      return clean.length >= 4 ? `•••• •••• ${clean.slice(-4)}` : '••••';
    }
    if (field === 'MOBILE') {
      return clean.length >= 4 ? `••••••${clean.slice(-4)}` : '••••';
    }
    if (field === 'GSTIN') {
      return clean.length >= 5 ? `••••••••••${clean.slice(-5)}` : '••••';
    }
    return clean;
  }

  /**
   * Calculates spherical Haversine distance in meters between two GPS coordinates [lng, lat].
   */
  public static calculateDistanceMeters(coord1: number[], coord2: number[]): number {
    if (!coord1 || !coord2 || coord1.length < 2 || coord2.length < 2) return Infinity;
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;

    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Normalizes business/workshop name by removing generic suffixes and punctuation.
   */
  public static normalizeName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(
        /\b(garage|workshop|motors|motor|works|service|services|center|centre|automobiles|auto|car|cars|care|station|hub|point|pvt|ltd|enterprises)\b/gi,
        ''
      )
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Computes string similarity using Dice coefficient / token overlap (0 to 1).
   */
  public static calculateNameSimilarity(str1: string, str2: string): number {
    const s1 = PartnerAntiFakeService.normalizeName(str1);
    const s2 = PartnerAntiFakeService.normalizeName(str2);

    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1.0;

    const tokens1 = s1.split(' ').filter((w) => w.length > 1);
    const tokens2 = s2.split(' ').filter((w) => w.length > 1);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    let overlap = 0;
    for (const t1 of tokens1) {
      if (tokens2.includes(t1)) overlap++;
    }

    const dice = (2 * overlap) / (tokens1.length + tokens2.length);
    return dice;
  }

  /**
   * Scans existing partners in DB to detect duplicate mobile, PAN, GSTIN, bank account,
   * registration numbers, workshop location proximity (<= 150m), and name similarity.
   *
   * IMPORTANT: Does NOT silently delete or auto-reject. Flags are stored for Admin review.
   */
  public static async runDuplicateDetection(
    partnerId: string | mongoose.Types.ObjectId | undefined,
    data: {
      mobile?: string;
      pan?: string;
      gstin?: string;
      udyamNumber?: string;
      businessRegistrationProofRef?: string;
      accountNumber?: string;
      location?: { coordinates?: number[] };
      workshopName?: string;
      businessName?: string;
      addressLine?: string;
      businessAddress?: string;
    }
  ): Promise<IDuplicateFlag[]> {
    const flags: IDuplicateFlag[] = [];
    const currentId = partnerId ? new mongoose.Types.ObjectId(String(partnerId)) : null;

    const cleanMobile = data.mobile?.trim();
    const cleanPan = data.pan?.trim().toUpperCase();
    const cleanGstin = data.gstin?.trim().toUpperCase();
    const cleanUdyam = data.udyamNumber?.trim().toUpperCase();
    const cleanAcc = data.accountNumber?.trim();
    const targetCoords = data.location?.coordinates;
    const workshopName = (data.workshopName || data.businessName || '').trim();

    // 1. Mobile Number Check
    if (cleanMobile) {
      const mobileQuery: any = {
        $or: [{ mobile: cleanMobile }, { 'representativeDetails.mobile': cleanMobile }],
      };
      if (currentId) mobileQuery._id = { $ne: currentId };

      const matchedPartners = await PartnerModel.find(mobileQuery)
        .select('_id uniquePartnerId businessName workshopName verificationStatus isActive')
        .lean();

      for (const other of matchedPartners) {
        const isActiveVerified = other.isActive && (other.verificationStatus === 'APPROVED_VERIFIED' || other.verificationStatus === 'APPROVED');
        flags.push({
          field: 'MOBILE',
          matchedPartnerId: other._id as any,
          matchedUniquePartnerId: other.uniquePartnerId,
          matchedWorkshopName: other.workshopName || other.businessName,
          matchedValue: PartnerAntiFakeService.maskValue('MOBILE', cleanMobile),
          severity: 'HIGH',
          reason: isActiveVerified
            ? `Verified mobile is already active on partner account ${other.uniquePartnerId || other.businessName}. Multiple active partner accounts without Admin approval are prohibited.`
            : `Mobile number is also registered to partner ${other.uniquePartnerId || other.businessName} (${other.verificationStatus}).`,
          flaggedAt: new Date(),
        });
      }
    }

    // 2. PAN Number Check
    if (cleanPan) {
      const panQuery: any = { pan: cleanPan };
      if (currentId) panQuery._id = { $ne: currentId };

      const matchedPan = await PartnerModel.find(panQuery)
        .select('_id uniquePartnerId businessName workshopName verificationStatus')
        .lean();

      for (const other of matchedPan) {
        flags.push({
          field: 'PAN',
          matchedPartnerId: other._id as any,
          matchedUniquePartnerId: other.uniquePartnerId,
          matchedWorkshopName: other.workshopName || other.businessName,
          matchedValue: PartnerAntiFakeService.maskValue('PAN', cleanPan),
          severity: 'HIGH',
          reason: `Identical PAN (${PartnerAntiFakeService.maskValue('PAN', cleanPan)}) registered to partner ${other.uniquePartnerId || other.businessName}.`,
          flaggedAt: new Date(),
        });
      }
    }

    // 3. GSTIN Check
    if (cleanGstin) {
      const gstQuery: any = { gstin: cleanGstin };
      if (currentId) gstQuery._id = { $ne: currentId };

      const matchedGst = await PartnerModel.find(gstQuery)
        .select('_id uniquePartnerId businessName workshopName verificationStatus')
        .lean();

      for (const other of matchedGst) {
        flags.push({
          field: 'GSTIN',
          matchedPartnerId: other._id as any,
          matchedUniquePartnerId: other.uniquePartnerId,
          matchedWorkshopName: other.workshopName || other.businessName,
          matchedValue: PartnerAntiFakeService.maskValue('GSTIN', cleanGstin),
          severity: 'HIGH',
          reason: `Identical GSTIN (${PartnerAntiFakeService.maskValue('GSTIN', cleanGstin)}) registered to partner ${other.uniquePartnerId || other.businessName}.`,
          flaggedAt: new Date(),
        });
      }
    }

    // 4. Business Registration / Udyam Check
    if (cleanUdyam) {
      const regQuery: any = {
        $or: [{ udyamNumber: cleanUdyam }, { msmeNumber: cleanUdyam }],
      };
      if (currentId) regQuery._id = { $ne: currentId };

      const matchedReg = await PartnerModel.find(regQuery)
        .select('_id uniquePartnerId businessName workshopName verificationStatus')
        .lean();

      for (const other of matchedReg) {
        flags.push({
          field: 'REGISTRATION_NO',
          matchedPartnerId: other._id as any,
          matchedUniquePartnerId: other.uniquePartnerId,
          matchedWorkshopName: other.workshopName || other.businessName,
          matchedValue: cleanUdyam,
          severity: 'HIGH',
          reason: `Business registration number (${cleanUdyam}) registered to partner ${other.uniquePartnerId || other.businessName}.`,
          flaggedAt: new Date(),
        });
      }
    }

    // 5. Bank Account Number Check
    if (cleanAcc) {
      const bankQuery: any = {
        $or: [{ accountNumber: cleanAcc }, { 'bankDetails.accountNumber': cleanAcc }],
      };
      if (currentId) bankQuery._id = { $ne: currentId };

      const matchedBank = await PartnerModel.find(bankQuery)
        .select('_id uniquePartnerId businessName workshopName verificationStatus')
        .lean();

      for (const other of matchedBank) {
        flags.push({
          field: 'BANK_ACCOUNT',
          matchedPartnerId: other._id as any,
          matchedUniquePartnerId: other.uniquePartnerId,
          matchedWorkshopName: other.workshopName || other.businessName,
          matchedValue: PartnerAntiFakeService.maskValue('BANK_ACCOUNT', cleanAcc),
          severity: 'HIGH',
          reason: `Identical bank account number (${PartnerAntiFakeService.maskValue('BANK_ACCOUNT', cleanAcc)}) registered to partner ${other.uniquePartnerId || other.businessName}.`,
          flaggedAt: new Date(),
        });
      }
    }

    // 6. Workshop Location Proximity (within 150 meters)
    if (
      targetCoords &&
      Array.isArray(targetCoords) &&
      targetCoords.length === 2 &&
      (targetCoords[0] !== 0 || targetCoords[1] !== 0)
    ) {
      const locQuery: any = {
        'location.coordinates': { $exists: true, $ne: [0, 0] },
      };
      if (currentId) locQuery._id = { $ne: currentId };

      const allWorkshops = await PartnerModel.find(locQuery)
        .select('_id uniquePartnerId businessName workshopName location')
        .lean();

      for (const other of allWorkshops) {
        const otherCoords = other.location?.coordinates;
        if (otherCoords && otherCoords.length === 2) {
          const distMeters = PartnerAntiFakeService.calculateDistanceMeters(targetCoords, otherCoords);
          if (distMeters <= 150) {
            flags.push({
              field: 'LOCATION_PROXIMITY',
              matchedPartnerId: other._id as any,
              matchedUniquePartnerId: other.uniquePartnerId,
              matchedWorkshopName: other.workshopName || other.businessName,
              matchedValue: `${Math.round(distMeters)} meters away`,
              severity: 'MEDIUM',
              reason: `Workshop GPS coordinates are only ${Math.round(distMeters)}m from existing workshop ${other.uniquePartnerId || other.businessName}.`,
              flaggedAt: new Date(),
            });
          }
        }
      }
    }

    // 7. Workshop Name Similarity Check (similarity >= 0.82)
    if (workshopName) {
      const nameQuery: any = {};
      if (currentId) nameQuery._id = { $ne: currentId };

      const allNames = await PartnerModel.find(nameQuery)
        .select('_id uniquePartnerId businessName workshopName')
        .lean();

      for (const other of allNames) {
        const otherName = other.workshopName || other.businessName || '';
        const similarity = PartnerAntiFakeService.calculateNameSimilarity(workshopName, otherName);

        if (similarity >= 0.82) {
          flags.push({
            field: 'NAME_SIMILARITY',
            matchedPartnerId: other._id as any,
            matchedUniquePartnerId: other.uniquePartnerId,
            matchedWorkshopName: otherName,
            matchedValue: `${Math.round(similarity * 100)}% match`,
            severity: 'MEDIUM',
            reason: `Workshop name "${workshopName}" is highly similar (${Math.round(similarity * 100)}%) to existing workshop "${otherName}" (${other.uniquePartnerId || 'Pending'}).`,
            flaggedAt: new Date(),
          });
        }
      }
    }

    return flags;
  }

  /**
   * Checks incoming profile / KYC updates against verified values.
   * If partner is already approved and critical fields are modified:
   * Sets reVerificationRequired=true, moves status to UNDER_REVIEW,
   * creates an immutable audit log, and notifies Admin.
   *
   * Critical fields: PAN, GSTIN, Bank details, Workshop address, Map pin, Owner name.
   */
  public static async processReVerificationCheck(
    partner: IPartner,
    incomingUpdates: {
      pan?: string;
      gstin?: string;
      accountNumber?: string;
      ifsc?: string;
      accountHolderName?: string;
      bankDetails?: { accountNumber?: string; ifscCode?: string; accountHolderName?: string };
      businessAddress?: string;
      addressLine?: string;
      location?: { coordinates?: number[] };
      latitude?: number | string;
      longitude?: number | string;
      ownerName?: string;
    }
  ): Promise<{
    reVerificationTriggered: boolean;
    changedFields: string[];
    oldValues: Record<string, any>;
    newValues: Record<string, any>;
  }> {
    const isApproved =
      partner.verificationStatus === 'APPROVED_VERIFIED' || partner.verificationStatus === 'APPROVED';

    if (!isApproved) {
      return { reVerificationTriggered: false, changedFields: [], oldValues: {}, newValues: {} };
    }

    const changedFields: string[] = [];
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    // 1. PAN
    if (incomingUpdates.pan !== undefined) {
      const newPan = incomingUpdates.pan.trim().toUpperCase();
      const oldPan = (partner.pan || '').trim().toUpperCase();
      if (newPan && newPan !== oldPan) {
        changedFields.push('PAN');
        oldValues.pan = PartnerAntiFakeService.maskValue('PAN', oldPan);
        newValues.pan = PartnerAntiFakeService.maskValue('PAN', newPan);
      }
    }

    // 2. GSTIN
    if (incomingUpdates.gstin !== undefined) {
      const newGst = incomingUpdates.gstin.trim().toUpperCase();
      const oldGst = (partner.gstin || '').trim().toUpperCase();
      if (newGst !== oldGst) {
        changedFields.push('GSTIN');
        oldValues.gstin = PartnerAntiFakeService.maskValue('GSTIN', oldGst);
        newValues.gstin = PartnerAntiFakeService.maskValue('GSTIN', newGst);
      }
    }

    // 3. Bank Details
    const incomingAcc =
      incomingUpdates.accountNumber?.trim() || incomingUpdates.bankDetails?.accountNumber?.trim();
    const incomingIfsc =
      incomingUpdates.ifsc?.trim().toUpperCase() ||
      incomingUpdates.bankDetails?.ifscCode?.trim().toUpperCase();
    const incomingHolder =
      incomingUpdates.accountHolderName?.trim() ||
      incomingUpdates.bankDetails?.accountHolderName?.trim();

    const currentAcc = (partner.accountNumber || partner.bankDetails?.accountNumber || '').trim();
    const currentIfsc = (partner.ifsc || partner.bankDetails?.ifscCode || '').trim().toUpperCase();
    const currentHolder = (
      partner.accountHolderName ||
      partner.bankDetails?.accountHolderName ||
      ''
    ).trim();

    if (
      (incomingAcc && incomingAcc !== currentAcc) ||
      (incomingIfsc && incomingIfsc !== currentIfsc) ||
      (incomingHolder && incomingHolder !== currentHolder)
    ) {
      changedFields.push('Bank Details');
      oldValues.bankDetails = {
        accountNumber: PartnerAntiFakeService.maskValue('BANK_ACCOUNT', currentAcc),
        ifsc: currentIfsc,
        accountHolderName: currentHolder,
      };
      newValues.bankDetails = {
        accountNumber: PartnerAntiFakeService.maskValue('BANK_ACCOUNT', incomingAcc || currentAcc),
        ifsc: incomingIfsc || currentIfsc,
        accountHolderName: incomingHolder || currentHolder,
      };
    }

    // 4. Workshop Address
    const incomingAddr = (
      incomingUpdates.businessAddress ||
      incomingUpdates.addressLine ||
      ''
    ).trim();
    const currentAddr = (partner.businessAddress || partner.addressLine || '').trim();
    if (incomingAddr && incomingAddr !== currentAddr) {
      changedFields.push('Workshop Address');
      oldValues.businessAddress = currentAddr;
      newValues.businessAddress = incomingAddr;
    }

    // 5. Map Pin / Coordinates
    let newCoords: number[] | null = null;
    if (incomingUpdates.location?.coordinates?.length === 2) {
      newCoords = incomingUpdates.location.coordinates;
    } else if (
      incomingUpdates.longitude !== undefined &&
      incomingUpdates.latitude !== undefined
    ) {
      const lng = Number(incomingUpdates.longitude);
      const lat = Number(incomingUpdates.latitude);
      if (!isNaN(lng) && !isNaN(lat)) {
        newCoords = [lng, lat];
      }
    }

    const currentCoords = partner.location?.coordinates;
    if (newCoords && currentCoords && currentCoords.length === 2) {
      const dist = PartnerAntiFakeService.calculateDistanceMeters(newCoords, currentCoords);
      // Trigger if map pin moved by more than 50 meters
      if (dist > 50) {
        changedFields.push('Google Maps Pin');
        oldValues.coordinates = currentCoords;
        newValues.coordinates = newCoords;
      }
    }

    // 6. Owner Name
    if (incomingUpdates.ownerName !== undefined) {
      const newOwner = incomingUpdates.ownerName.trim();
      const currentOwner = (partner.ownerName || '').trim();
      if (newOwner && newOwner !== currentOwner) {
        changedFields.push('Owner Name');
        oldValues.ownerName = currentOwner;
        newValues.ownerName = newOwner;
      }
    }

    if (changedFields.length === 0) {
      return { reVerificationTriggered: false, changedFields: [], oldValues: {}, newValues: {} };
    }

    // Trigger Re-Verification: move to UNDER_REVIEW, flag reVerificationRequired
    partner.reVerificationRequired = true;
    partner.verificationStatus = 'UNDER_REVIEW';
    partner.reVerificationDetails = {
      changedFields,
      requestedAt: new Date(),
      oldValues,
      newValues,
    };

    // Log to immutable PartnerVerificationLog
    await PartnerVerificationLogModel.create({
      partnerId: partner._id,
      action: 'RE_VERIFICATION_TRIGGERED',
      fromStatus: 'APPROVED_VERIFIED',
      toStatus: 'UNDER_REVIEW',
      notes: `Re-verification triggered: Partner changed critical field(s) [${changedFields.join(
        ', '
      )}]. Existing jobs continue; new leads and payouts paused until re-approval.`,
      timestamp: new Date(),
      metadata: {
        changedFields,
        oldValues,
        newValues,
      },
    });

    try {
      emitToRole('SUPER_ADMIN', 'partner_reverification_triggered', {
        partnerId: partner._id,
        uniquePartnerId: partner.uniquePartnerId,
        changedFields,
      });
      emitToRole('EXECUTIVE', 'partner_reverification_triggered', {
        partnerId: partner._id,
        uniquePartnerId: partner.uniquePartnerId,
        changedFields,
      });
    } catch (err) {
      // socket errors ignored
    }

    return {
      reVerificationTriggered: true,
      changedFields,
      oldValues,
      newValues,
    };
  }
}

export default PartnerAntiFakeService;
