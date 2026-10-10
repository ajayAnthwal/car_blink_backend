/**
 * Verification Adapter Interface and Mock Provider Implementation
 * Provides an extensible plug-and-play architecture for government ID & registry verification.
 */

export interface PanVerificationResult {
  valid: boolean;
  panNumber: string;
  holderName?: string;
  status: "VERIFIED" | "FAILED";
  referenceId: string;
  message?: string;
  rawResponse?: Record<string, any>;
}

export interface GstinVerificationResult {
  valid: boolean;
  gstin: string;
  legalName?: string;
  tradeName?: string;
  registrationStatus?: string;
  status: "VERIFIED" | "FAILED";
  referenceId: string;
  message?: string;
  rawResponse?: Record<string, any>;
}

export interface IVerificationProvider {
  verifyPan(pan: string, expectedName?: string): Promise<PanVerificationResult>;
  verifyGstin(gstin: string, expectedTradeName?: string): Promise<GstinVerificationResult>;
}

/**
 * Mock Verification Provider for development, staging, and automated testing.
 * Validates structural syntax, checksum patterns, and simulates realistic registry lookup.
 */
export class MockVerificationProvider implements IVerificationProvider {
  private static readonly PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  private static readonly GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-Z]{1}Z[0-9A-Z]{1}$/;

  public async verifyPan(pan: string, expectedName?: string): Promise<PanVerificationResult> {
    const cleanPan = (pan || "").trim().toUpperCase();

    if (!MockVerificationProvider.PAN_REGEX.test(cleanPan)) {
      return {
        valid: false,
        panNumber: cleanPan,
        status: "FAILED",
        referenceId: `MOCK-PAN-FAIL-${Date.now()}`,
        message: "Invalid PAN format. PAN must be a 10-character alphanumeric string (e.g., ABCDE1234F).",
      };
    }

    // Determine holder name: simulate registry lookup with expected name or derive a realistic name
    const simulatedHolderName = expectedName ? expectedName.trim().toUpperCase() : "VERIFIED TAXPAYER";

    return {
      valid: true,
      panNumber: cleanPan,
      holderName: simulatedHolderName,
      status: "VERIFIED",
      referenceId: `MOCK-PAN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      message: "PAN successfully verified with Income Tax Department records (MOCK).",
      rawResponse: {
        pan: cleanPan,
        holderName: simulatedHolderName,
        category: cleanPan.charAt(3), // 4th char is entity type (P = Individual, C = Company, etc.)
        status: "Active and in operative state",
      },
    };
  }

  public async verifyGstin(gstin: string, expectedTradeName?: string): Promise<GstinVerificationResult> {
    const cleanGst = (gstin || "").trim().toUpperCase();

    if (!MockVerificationProvider.GSTIN_REGEX.test(cleanGst)) {
      return {
        valid: false,
        gstin: cleanGst,
        status: "FAILED",
        referenceId: `MOCK-GST-FAIL-${Date.now()}`,
        message: "Invalid GSTIN format. GSTIN must be a 15-character alphanumeric string.",
      };
    }

    const stateCode = cleanGst.substring(0, 2);
    const panFromGst = cleanGst.substring(2, 12);
    const simulatedTradeName = expectedTradeName ? expectedTradeName.trim() : "Verified Workshop Garage";

    return {
      valid: true,
      gstin: cleanGst,
      legalName: `${simulatedTradeName} Enterprise`,
      tradeName: simulatedTradeName,
      registrationStatus: "ACTIVE",
      status: "VERIFIED",
      referenceId: `MOCK-GST-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      message: "GSTIN successfully verified with GST Portal records (MOCK).",
      rawResponse: {
        gstin: cleanGst,
        stateCode,
        pan: panFromGst,
        taxpayerType: "Regular",
        status: "Active",
      },
    };
  }
}

// Export singleton instance of current active provider (Mock)
export const verificationProvider: IVerificationProvider = new MockVerificationProvider();
