import { KycDocumentModel, IKycDocument } from './kyc.model';
import { PartnerModel, IPartner } from '../../partner.model';
import { PartnerVerificationLogModel } from '../../partner-verification-log.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { emitToRole } from '../../../../sockets';
import { verificationProvider } from '../../adapters/verification.adapter';
import { PartnerAntiFakeService } from '../../partner-anti-fake.service';
import {
  SubmitBusinessKycInput,
  SubmitWorkshopProofInput,
  SubmitBankDetailsInput,
  SubmitWorkshopCapabilitiesInput,
} from './kyc.validation';


/**
 * Normalizes a name string for comparison (removes punctuation, excess spaces, lowercase).
 */
function normalizeName(name?: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether two names match using normalized token containment.
 */
function isNameMatching(registeredOwner: string, kycName: string): boolean {
  const norm1 = normalizeName(registeredOwner);
  const norm2 = normalizeName(kycName);

  if (!norm1 || !norm2) return true; // Cannot determine mismatch if one is missing
  if (norm1 === norm2) return true;

  const tokens1 = norm1.split(' ').filter(Boolean);
  const tokens2 = norm2.split(' ').filter(Boolean);

  // Check if all tokens of registered name are present in KYC name, or vice versa
  const match1 = tokens1.every((t) => tokens2.includes(t));
  const match2 = tokens2.every((t) => tokens1.includes(t));

  return match1 || match2;
}

export class KycService {
  /**
   * Submit Business KYC & Owner Verification step.
   * Runs verification through adapter, checks owner name vs KYC name,
   * handles representative flags, updates verificationStatus, and creates an audit log.
   */
  public static async submitBusinessKyc(userId: string, data: SubmitBusinessKycInput): Promise<IPartner> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found. Please complete basic registration first.');
    }

    const fromStatus = partner.verificationStatus || 'REGISTRATION_SUBMITTED';

    // 1. PAN Verification via Adapter
    const panResult = await verificationProvider.verifyPan(data.pan, partner.ownerName);
    partner.pan = panResult.panNumber;
    partner.panStatus = panResult.status;

    // 2. GSTIN or Alternate Business Proof
    if (data.isGstRegistered && data.gstin) {
      const gstResult = await verificationProvider.verifyGstin(data.gstin, partner.workshopName || partner.businessName);
      partner.isGstRegistered = true;
      partner.gstin = gstResult.gstin;
      partner.gstStatus = gstResult.status;
      partner.gstLegalName = gstResult.legalName || data.gstLegalName;
      partner.gstTradeName = gstResult.tradeName || data.gstTradeName;
      partner.gstRegistrationStatus = gstResult.registrationStatus || data.gstRegistrationStatus || 'ACTIVE';
    } else {
      partner.isGstRegistered = false;
      partner.gstin = undefined;
      partner.gstStatus = 'PENDING';
      partner.nonGstProofType = data.nonGstProofType;
      partner.proofRef = data.proofRef;
    }

    // 3. Udyam / MSME (Optional, stored as PENDING verification if provided)
    if (data.udyamNumber && data.udyamNumber.trim()) {
      partner.udyamNumber = data.udyamNumber.trim().toUpperCase();
      partner.udyamStatus = 'PENDING'; // Never mark verified on manual entry alone!
    }

    // 4. Business Registration Proof (for non-proprietorships or additional compliance)
    if (data.businessRegistrationProofRef && data.businessRegistrationProofRef.trim()) {
      partner.businessRegistrationProofRef = data.businessRegistrationProofRef.trim();
    }

    // 5. Owner Name vs KYC Name Comparison
    const registeredOwnerName = partner.ownerName || data.ownerName || '';
    const verifiedKycName = panResult.holderName || data.panHolderName || '';
    let nameMismatch = false;
    let mismatchReason = '';

    if (registeredOwnerName && verifiedKycName) {
      const namesMatch = isNameMatching(registeredOwnerName, verifiedKycName);
      if (!namesMatch) {
        nameMismatch = true;
        mismatchReason = `Owner name mismatch: Registered "${registeredOwnerName}" vs Government record "${verifiedKycName}"`;
        partner.duplicateFlags = partner.duplicateFlags || [];
        partner.duplicateFlags.push({
          field: 'NAME_SIMILARITY',
          severity: 'HIGH',
          reason: mismatchReason,
          flaggedAt: new Date(),
        });
      }
    }

    // 6. Representative handling
    partner.isRepresentative = !!data.isRepresentative;
    if (data.isRepresentative && data.representativeDetails) {
      partner.representativeDetails = {
        fullName: data.representativeDetails.fullName?.trim() || '',
        mobile: data.representativeDetails.mobile?.trim() || '',
        email: data.representativeDetails.email?.trim() || '',
        designation: data.representativeDetails.designation?.trim() || '',
      };
      partner.authorizationDocRef = data.authorizationDocRef?.trim();
    }

    // Task 8: Check for re-verification trigger on critical fields (PAN, GSTIN)
    await PartnerAntiFakeService.processReVerificationCheck(partner, {
      pan: data.pan,
      gstin: data.gstin,
      ownerName: data.ownerName,
    });

    // Task 8: Check for duplicate PAN, GSTIN, Udyam across all partners
    const dupFlags = await PartnerAntiFakeService.runDuplicateDetection(partner._id, {
      pan: partner.pan,
      gstin: partner.gstin,
      udyamNumber: partner.udyamNumber,
    });
    if (dupFlags.length > 0) {
      partner.duplicateFlags = [...(partner.duplicateFlags || []), ...dupFlags];
    }

    // 7. Determine Target Verification Status
    let targetStatus: string;
    let action: "MANUAL_REVIEW_REQUESTED" | "DOCUMENTS_UPLOADED";
    let notes: string;

    if (partner.reVerificationRequired) {
      targetStatus = 'UNDER_REVIEW';
      action = 'DOCUMENTS_UPLOADED';
      notes = 'Critical KYC fields updated post-approval. Moved to UNDER_REVIEW for Admin re-verification.';
    } else if (nameMismatch) {
      targetStatus = 'MANUAL_VERIFICATION_REQUIRED';
      action = 'MANUAL_REVIEW_REQUESTED';
      notes = `Business KYC submitted with owner name mismatch. Sent for manual review. ${mismatchReason}`;
    } else if (data.isRepresentative) {
      targetStatus = 'MANUAL_VERIFICATION_REQUIRED';
      action = 'MANUAL_REVIEW_REQUESTED';
      notes = `Business KYC submitted by authorized representative (${data.representativeDetails?.fullName || 'Representative'}). Requires manual verification of authorization letter.`;
    } else {
      // Validated successfully; remains DOCUMENTS_PENDING until all mandatory steps (photos, bank) are completed
      targetStatus = 'DOCUMENTS_PENDING';
      action = 'DOCUMENTS_UPLOADED';
      notes = 'Business KYC and Owner verification completed successfully. Government records verified.';
    }

    partner.verificationStatus = targetStatus as any;
    await partner.save();

    // 8. Write Immutable Entry to PartnerVerificationLog
    await PartnerVerificationLogModel.create({
      partnerId: partner._id,
      action,
      fromStatus,
      toStatus: targetStatus,
      notes,
      timestamp: new Date(),
      metadata: {
        pan: partner.pan,
        panStatus: partner.panStatus,
        gstin: partner.gstin,
        gstStatus: partner.gstStatus,
        isGstRegistered: partner.isGstRegistered,
        udyamNumber: partner.udyamNumber,
        isRepresentative: partner.isRepresentative,
        nameMismatch,
        mismatchReason: mismatchReason || undefined,
        verifiedKycName,
      },
    });

    // 9. Notify Admin & Executive Roles
    try {
      emitToRole('EXECUTIVE', 'partner_status_updated', {
        partnerId: partner._id,
        status: targetStatus,
        action,
      });
      emitToRole('SUPER_ADMIN', 'partner_status_updated', {
        partnerId: partner._id,
        status: targetStatus,
        action,
      });
    } catch (e) {
      // Ignore socket dispatch errors
    }

    return partner;
  }

  /**
   * Fetch current Business KYC status and saved records for the partner.
   */
  public static async getBusinessKycStatus(userId: string): Promise<any> {
    const partner = await PartnerModel.findOne({ userId }).lean();
    if (!partner) {
      throw new NotFoundError('Partner profile not found.');
    }

    const verificationLogs = await PartnerVerificationLogModel.find({ partnerId: partner._id })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    return {
      partnerId: partner._id,
      workshopName: partner.workshopName || partner.businessName,
      ownerName: partner.ownerName,
      businessType: partner.businessType || 'Proprietorship',
      verificationStatus: partner.verificationStatus || 'REGISTRATION_SUBMITTED',
      pan: partner.pan,
      panStatus: partner.panStatus || 'PENDING',
      gstin: partner.gstin,
      gstStatus: partner.gstStatus || 'PENDING',
      gstLegalName: partner.gstLegalName,
      gstTradeName: partner.gstTradeName,
      gstRegistrationStatus: partner.gstRegistrationStatus,
      isGstRegistered: partner.isGstRegistered,
      nonGstProofType: partner.nonGstProofType,
      proofRef: partner.proofRef,
      udyamNumber: partner.udyamNumber,
      udyamStatus: partner.udyamStatus || 'PENDING',
      businessRegistrationProofRef: partner.businessRegistrationProofRef,
      isRepresentative: partner.isRepresentative,
      representativeDetails: partner.representativeDetails,
      authorizationDocRef: partner.authorizationDocRef,
      verificationLogs,
    };
  }

  public static async uploadKycDocument(
    userId: string,
    data: { documentType: string; documentUrl: string }
  ): Promise<IKycDocument> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found. Please create a profile first.');
    }

    const doc = await KycDocumentModel.create({
      partnerId: partner._id,
      documentType: data.documentType,
      documentUrl: data.documentUrl,
      status: 'PENDING',
    });

    if (partner.verificationStatus === 'PENDING' || partner.verificationStatus === 'REJECTED') {
      partner.verificationStatus = 'UNDER_REVIEW';
      await partner.save();

      try {
        emitToRole('EXECUTIVE', 'kyc_update', {
          partnerId: partner._id,
          message: 'New KYC document uploaded by partner',
        });
      } catch (err) {
        // ignore socket errors
      }
    }

    return doc;
  }

  public static async getMyKycDocuments(userId: string): Promise<IKycDocument[]> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found.');
    }

    return KycDocumentModel.find({ partnerId: partner._id });
  }

  /**
   * Evaluates all mandatory KYC & onboarding items from Task 3 + Task 4.
   * Returns a detailed checklist of what is completed vs what is still pending.
   */
  public static evaluateKycCompletion(partner: IPartner): {
    isComplete: boolean;
    pendingItems: string[];
    completedItems: string[];
    checklist: Record<string, boolean>;
  } {
    const checklist: Record<string, boolean> = {
      // Task 3: Business KYC
      panSubmitted: !!(partner.pan && partner.pan.trim()),
      gstOrAlternateProofSubmitted: partner.isGstRegistered
        ? !!(partner.gstin && partner.gstin.trim())
        : !!(partner.nonGstProofType && partner.proofRef && partner.proofRef.trim()),
      representativeAuthorizationSubmitted: partner.isRepresentative
        ? !!(partner.authorizationDocRef && partner.authorizationDocRef.trim())
        : true,

      // Task 4 - Step A: Workshop Physical Proof
      exteriorPhotoSubmitted: !!(partner.exteriorPhotoRef && partner.exteriorPhotoRef.trim()),
      interiorPhotoSubmitted: !!(partner.interiorPhotoRef && partner.interiorPhotoRef.trim()),
      signboardPhotoSubmitted: !!(partner.signboardPhotoRef && partner.signboardPhotoRef.trim()),
      addressProofSubmitted: !!(partner.addressProofRef && partner.addressProofRef.trim()),
      mapLocationSubmitted: !!(
        partner.location &&
        Array.isArray(partner.location.coordinates) &&
        partner.location.coordinates.length === 2 &&
        (partner.location.coordinates[0] !== 0 || partner.location.coordinates[1] !== 0)
      ),

      // Task 4 - Step B: Bank & Settlement
      bankAccountSubmitted: !!(partner.accountNumber && partner.accountNumber.trim()),
      bankIfscSubmitted: !!(partner.ifsc && partner.ifsc.trim()),
      bankProofSubmitted: !!(partner.bankProofRef && partner.bankProofRef.trim()),

      // Task 4 - Step C: Capabilities
      servicesSelected: Array.isArray(partner.services) && partner.services.length > 0,
      serviceBaysSpecified: Number(partner.serviceBays) >= 1,
      techniciansSpecified: Number(partner.technicianCount) >= 1,
      authorizedProofSubmitted: partner.authorizedServiceClaim
        ? !!(partner.authorizedServiceProofRef && partner.authorizedServiceProofRef.trim())
        : true,
    };

    const itemLabels: Record<string, string> = {
      panSubmitted: "PAN Card Registration",
      gstOrAlternateProofSubmitted: partner.isGstRegistered ? "GSTIN Verification" : "Alternate Business Proof Upload",
      representativeAuthorizationSubmitted: "Owner Authorization Letter",
      exteriorPhotoSubmitted: "Workshop Exterior Photo",
      interiorPhotoSubmitted: "Workshop Interior / Service Bay Photo",
      signboardPhotoSubmitted: "Signboard / Nameplate Photo",
      addressProofSubmitted: "Workshop Address Proof",
      mapLocationSubmitted: "Google Maps Location Coordinates",
      bankAccountSubmitted: "Bank Account Number",
      bankIfscSubmitted: "Bank IFSC Code",
      bankProofSubmitted: "Cancelled Cheque / Passbook Proof",
      servicesSelected: "Services Offered Selection",
      serviceBaysSpecified: "Service Bays Capacity",
      techniciansSpecified: "Technician Count",
      authorizedProofSubmitted: "Authorized Service Certificate Proof",
    };

    const pendingItems: string[] = [];
    const completedItems: string[] = [];

    for (const [key, isDone] of Object.entries(checklist)) {
      const label = itemLabels[key] || key;
      if (isDone) {
        completedItems.push(label);
      } else {
        pendingItems.push(label);
      }
    }

    return {
      isComplete: pendingItems.length === 0,
      pendingItems,
      completedItems,
      checklist,
    };
  }

  /**
   * Helper to check and apply auto-transition to UNDER_REVIEW if all mandatory items are done.
   */
  private static async syncStatusOnStepCompletion(partner: IPartner, actionNotes: string): Promise<string> {
    const evalResult = KycService.evaluateKycCompletion(partner);
    const fromStatus = partner.verificationStatus || 'REGISTRATION_SUBMITTED';

    let targetStatus = fromStatus;

    // Do NOT overwrite MANUAL_VERIFICATION_REQUIRED, REJECTED, SUSPENDED, or APPROVED
    if (
      fromStatus !== 'MANUAL_VERIFICATION_REQUIRED' &&
      fromStatus !== 'REJECTED' &&
      fromStatus !== 'SUSPENDED' &&
      fromStatus !== 'APPROVED' &&
      fromStatus !== 'APPROVED_VERIFIED'
    ) {
      if (evalResult.isComplete) {
        targetStatus = 'UNDER_REVIEW';
      } else {
        targetStatus = 'DOCUMENTS_PENDING';
      }
    }

    if (targetStatus !== fromStatus) {
      partner.verificationStatus = targetStatus as any;
      await partner.save();

      await PartnerVerificationLogModel.create({
        partnerId: partner._id,
        action: targetStatus === 'UNDER_REVIEW' ? 'STATUS_CHANGED' : 'DOCUMENTS_UPLOADED',
        fromStatus,
        toStatus: targetStatus,
        notes: targetStatus === 'UNDER_REVIEW'
          ? `All mandatory Task 3 & Task 4 items completed. Application automatically moved to UNDER_REVIEW.`
          : actionNotes,
        timestamp: new Date(),
        metadata: {
          pendingItemsCount: evalResult.pendingItems.length,
          pendingItems: evalResult.pendingItems,
        },
      });

      try {
        emitToRole('EXECUTIVE', 'partner_status_updated', {
          partnerId: partner._id,
          status: targetStatus,
        });
        emitToRole('SUPER_ADMIN', 'partner_status_updated', {
          partnerId: partner._id,
          status: targetStatus,
        });
      } catch (e) {}
    } else {
      await partner.save();
    }

    return targetStatus;
  }

  public static async submitWorkshopProof(userId: string, data: SubmitWorkshopProofInput): Promise<any> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) throw new NotFoundError('Partner profile not found.');

    // Task 8: Check for re-verification trigger on workshop address / map pin
    await PartnerAntiFakeService.processReVerificationCheck(partner, {
      latitude: data.latitude,
      longitude: data.longitude,
    });

    partner.exteriorPhotoRef = data.exteriorPhotoRef.trim();
    partner.interiorPhotoRef = data.interiorPhotoRef.trim();
    partner.signboardPhotoRef = data.signboardPhotoRef.trim();
    partner.addressProofType = data.addressProofType;
    partner.addressProofRef = data.addressProofRef.trim();
    partner.location = {
      type: 'Point',
      coordinates: [Number(data.longitude), Number(data.latitude)],
    };

    // Task 8: Run duplicate detection on workshop location proximity
    const dupLocationFlags = await PartnerAntiFakeService.runDuplicateDetection(partner._id, {
      location: partner.location,
      businessAddress: partner.businessAddress,
    });
    if (dupLocationFlags.length > 0) {
      partner.duplicateFlags = [...(partner.duplicateFlags || []), ...dupLocationFlags];
    }

    const targetStatus = await KycService.syncStatusOnStepCompletion(
      partner,
      'Workshop physical photos, address proof, and location coordinates submitted.'
    );

    const checklist = KycService.evaluateKycCompletion(partner);

    return {
      partner,
      status: targetStatus,
      checklist,
    };
  }

  public static async submitBankDetails(userId: string, data: SubmitBankDetailsInput): Promise<any> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) throw new NotFoundError('Partner profile not found.');

    const cleanAccNumber = data.accountNumber.trim();
    const cleanIfsc = data.ifsc.trim().toUpperCase();
    const cleanHolderName = data.accountHolderName.trim();
    const fromStatus = partner.verificationStatus || 'REGISTRATION_SUBMITTED';

    // Task 8: Check for re-verification trigger on bank details
    await PartnerAntiFakeService.processReVerificationCheck(partner, {
      accountNumber: cleanAccNumber,
      ifsc: cleanIfsc,
      accountHolderName: cleanHolderName,
    });

    // Task 8: Run duplicate detection on bank account number
    const dupBankFlags = await PartnerAntiFakeService.runDuplicateDetection(partner._id, {
      accountNumber: cleanAccNumber,
    });
    if (dupBankFlags.length > 0) {
      partner.duplicateFlags = [...(partner.duplicateFlags || []), ...dupBankFlags];
    }

    // Verify Holder Name vs Owner Name & Business Name
    const ownerNameMatch = isNameMatching(partner.ownerName || '', cleanHolderName);
    const businessNameMatch = isNameMatching(partner.workshopName || partner.businessName || '', cleanHolderName);

    let nameMismatch = false;
    let mismatchReason = '';

    if (!ownerNameMatch && !businessNameMatch) {
      nameMismatch = true;
      mismatchReason = `Bank account holder name mismatch: "${cleanHolderName}" does not match registered owner ("${partner.ownerName}") or workshop name ("${partner.workshopName || partner.businessName}").`;
      partner.duplicateFlags = partner.duplicateFlags || [];
      partner.duplicateFlags.push({
        field: 'BANK_ACCOUNT',
        severity: 'HIGH',
        reason: mismatchReason,
        flaggedAt: new Date(),
      });
    }

    // Save Top-Level Bank Fields
    partner.accountHolderName = cleanHolderName;
    partner.bankName = data.bankName.trim();
    partner.accountNumber = cleanAccNumber;
    partner.ifsc = cleanIfsc;
    partner.bankProofRef = data.bankProofRef.trim();
    partner.bankVerificationStatus = 'PENDING';

    // Protect active payout destination: do not overwrite existing bankDetails with unverified data
    if (!partner.bankDetails || !partner.bankDetails.accountNumber) {
      partner.bankDetails = {
        accountNumber: cleanAccNumber,
        ifscCode: cleanIfsc,
        accountHolderName: cleanHolderName,
      };
    }

    if (nameMismatch) {
      partner.verificationStatus = 'MANUAL_VERIFICATION_REQUIRED';
      await partner.save();

      await PartnerVerificationLogModel.create({
        partnerId: partner._id,
        action: 'MANUAL_REVIEW_REQUESTED',
        fromStatus,
        toStatus: 'MANUAL_VERIFICATION_REQUIRED',
        notes: `Bank details submitted with name mismatch. Flagged for manual verification. ${mismatchReason}`,
        timestamp: new Date(),
        metadata: {
          accountHolderName: cleanHolderName,
          bankName: data.bankName,
          accountNumberMasked: partner.maskedAccountNumber,
          ifsc: cleanIfsc,
          mismatchReason,
        },
      });
    } else {
      await KycService.syncStatusOnStepCompletion(partner, 'Bank details and cancelled cheque proof submitted.');
    }

    const checklist = KycService.evaluateKycCompletion(partner);

    return {
      partner,
      status: partner.verificationStatus,
      nameMismatch,
      mismatchReason: mismatchReason || undefined,
      checklist,
    };
  }

  public static async submitCapabilities(userId: string, data: SubmitWorkshopCapabilitiesInput): Promise<any> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) throw new NotFoundError('Partner profile not found.');

    partner.services = data.services as any;
    partner.serviceBays = data.serviceBays;
    partner.technicianCount = data.technicianCount;
    partner.workingDays = data.workingDays;
    partner.workingHours = data.workingHours;
    partner.pickupDropAvailable = !!data.pickupDropAvailable;
    partner.insuranceWorkCapable = !!data.insuranceWorkCapable;
    partner.authorizedServiceClaim = !!data.authorizedServiceClaim;
    if (data.authorizedServiceClaim && data.authorizedServiceProofRef) {
      partner.authorizedServiceProofRef = data.authorizedServiceProofRef.trim();
    } else if (!data.authorizedServiceClaim) {
      partner.authorizedServiceProofRef = undefined;
    }

    const targetStatus = await KycService.syncStatusOnStepCompletion(
      partner,
      'Workshop capabilities, service capacity, and operational parameters submitted.'
    );

    const checklist = KycService.evaluateKycCompletion(partner);

    return {
      partner,
      status: targetStatus,
      checklist,
    };
  }

  public static async getKycChecklist(userId: string): Promise<any> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) throw new NotFoundError('Partner profile not found.');

    const checklistResult = KycService.evaluateKycCompletion(partner);
    const verificationLogs = await PartnerVerificationLogModel.find({ partnerId: partner._id })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    return {
      partnerId: partner._id,
      workshopName: partner.workshopName || partner.businessName,
      ownerName: partner.ownerName,
      businessType: partner.businessType || 'Proprietorship',
      verificationStatus: partner.verificationStatus || 'REGISTRATION_SUBMITTED',
      rejectionReason: partner.rejectionReason,
      adminNotes: verificationLogs[0]?.notes,
      isActive: partner.isActive !== false,
      isVerified: !!partner.isVerified,
      isComplete: checklistResult.isComplete,
      pendingItems: checklistResult.pendingItems,
      completedItems: checklistResult.completedItems,
      checklist: checklistResult.checklist,
      bankVerificationStatus: partner.bankVerificationStatus || 'PENDING',
      verificationLogs,
      data: {
        exteriorPhotoRef: partner.exteriorPhotoRef,
        interiorPhotoRef: partner.interiorPhotoRef,
        signboardPhotoRef: partner.signboardPhotoRef,
        addressProofType: partner.addressProofType,
        addressProofRef: partner.addressProofRef,
        latitude: partner.location?.coordinates?.[1] || 28.6139,
        longitude: partner.location?.coordinates?.[0] || 77.2090,
        accountHolderName: partner.accountHolderName || partner.bankDetails?.accountHolderName,
        bankName: partner.bankName,
        accountNumber: partner.accountNumber || partner.bankDetails?.accountNumber,
        ifsc: partner.ifsc || partner.bankDetails?.ifscCode,
        bankProofRef: partner.bankProofRef,
        services: partner.services || [],
        serviceBays: partner.serviceBays || 1,
        technicianCount: partner.technicianCount || 1,
        workingDays: partner.workingDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        workingHours: partner.workingHours || { open: "09:00 AM", close: "08:00 PM" },
        pickupDropAvailable: !!partner.pickupDropAvailable,
        insuranceWorkCapable: !!partner.insuranceWorkCapable,
        authorizedServiceClaim: !!partner.authorizedServiceClaim,
        authorizedServiceProofRef: partner.authorizedServiceProofRef,
      },
    };
  }

}

export default KycService;

