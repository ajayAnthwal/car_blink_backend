import mongoose from 'mongoose';
import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';
import { NotificationModel } from '../../../notification/notification.model';
import { AssignmentModel } from './assignment.model';
import { PartnerModel } from '../../../partner/partner.model';
import { BadRequestError } from '../../../../common/errors/BadRequestError';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { ConflictError } from '../../../../common/errors/ConflictError';
import { ForbiddenError } from '../../../../common/errors/ForbiddenError';
import { env } from '../../../../config/env.config';
import { emitToUser, emitToRole } from '../../../../sockets';
import { sanitizePlainNote } from './notes-workflow.validation';

export class NotesWorkflowService {
  /**
   * Helper to verify if workflow feature flag is active
   */
  public isWorkflowEnabled(): boolean {
    return env.ENABLE_NOTES_APPROVAL_WORKFLOW === true;
  }

  /**
   * Customer-safe response filter (no actor IDs, no internal executive names)
   */
  public filterForCustomer(workflow: any) {
    if (!workflow) return null;
    return {
      status: workflow.status,
      currentNote: workflow.currentNote,
      originalExecutiveNote: workflow.originalExecutiveNote,
      customerEditedNote: workflow.customerEditedNote || undefined,
      customerAction: workflow.customerAction || undefined,
      customerRespondedAt: workflow.customerRespondedAt || undefined,
      verifiedAt: workflow.verifiedAt || undefined,
      forwardedAt: workflow.forwardedAt || undefined,
      version: workflow.version || 1,
      source: 'CarBlink Executive',
    };
  }

  /**
   * 1. EXECUTIVE sends note to customer for review
   */
  async sendNoteToCustomer(
    leadId: string,
    actorId: string,
    actorRole: string,
    noteText: string,
    expectedVersion?: number
  ) {
    if (!this.isWorkflowEnabled()) {
      throw new BadRequestError('Notes Approval Workflow feature is currently disabled.');
    }

    const cleanNote = sanitizePlainNote(noteText);
    if (!cleanNote || cleanNote.length < 3) {
      throw new BadRequestError('Note text must be at least 3 characters.');
    }
    if (cleanNote.length > 1000) {
      throw new BadRequestError('Note text cannot exceed 1000 characters.');
    }

    const existingBooking = await BookingModel.findById(leadId);
    if (!existingBooking) {
      throw new NotFoundError('Booking/lead not found');
    }
    if (['CANCELLED', 'COMPLETED'].includes(existingBooking.status)) {
      throw new BadRequestError(`Cannot send notes for a ${existingBooking.status.toLowerCase()} booking.`);
    }

    const currentVersion = existingBooking.notesWorkflow?.version || 1;
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new ConflictError('The note was modified by another session. Please refresh and try again.');
    }

    const newVersion = existingBooking.notesWorkflow ? currentVersion + 1 : 1;

    // Atomic update
    const updated = await BookingModel.findOneAndUpdate(
      {
        _id: leadId,
        status: { $nin: ['CANCELLED', 'COMPLETED'] },
        ...(existingBooking.notesWorkflow ? { 'notesWorkflow.version': currentVersion } : {}),
      },
      {
        $set: {
          'notesWorkflow.status': 'PENDING_CUSTOMER_REVIEW',
          'notesWorkflow.originalExecutiveNote': cleanNote,
          'notesWorkflow.currentNote': cleanNote,
          'notesWorkflow.customerEditedNote': null,
          'notesWorkflow.customerAction': null,
          'notesWorkflow.version': newVersion,
        },
        $push: {
          'notesWorkflow.history': {
            $each: [
              {
                actorId: new mongoose.Types.ObjectId(actorId),
                actorRole: actorRole || 'EXECUTIVE',
                action: 'SENT_TO_CUSTOMER',
                noteText: cleanNote,
                timestamp: new Date(),
              },
            ],
            $slice: -50,
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new ConflictError('The note was modified by another session concurrently. Please refresh.');
    }

    // In-App Notification & Socket dispatch (Safely in try/catch outside DB write)
    try {
      if (updated.customerId) {
        await NotificationModel.create({
          userId: updated.customerId,
          title: 'Service Instructions Require Review',
          message: `Executive has added specific instructions for your booking #${(updated as any).bookingNumber || updated._id.toString().slice(-6).toUpperCase()}. Please review.`,
          type: 'IN_APP',
          category: 'BOOKING_UPDATE',
          status: 'SENT',
          metadata: { bookingId: updated._id.toString() },
          isRead: false,
        });

        emitToUser(updated.customerId.toString(), 'booking_notes_pending_review', {
          bookingId: updated._id.toString(),
          status: 'PENDING_CUSTOMER_REVIEW',
          currentNote: cleanNote,
          version: newVersion,
        });
      }
    } catch (notifErr) {
      console.warn('[NotesWorkflow] Non-fatal notification error on sendNoteToCustomer:', notifErr);
    }

    return updated;
  }

  /**
   * 2. CUSTOMER accepts or edits and submits note
   */
  async customerRespondToNote(
    bookingId: string,
    customerId: string,
    action: 'ACCEPTED' | 'EDITED',
    editedNote: string | undefined,
    expectedVersion: number
  ) {
    if (!this.isWorkflowEnabled()) {
      throw new BadRequestError('Notes Approval Workflow feature is currently disabled.');
    }

    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Strict IDOR ownership check
    if (!booking.customerId || booking.customerId.toString() !== customerId.toString()) {
      throw new ForbiddenError('You do not have permission to review notes for this booking.');
    }

    if (['CANCELLED', 'COMPLETED'].includes(booking.status)) {
      throw new BadRequestError(`Cannot submit notes for a ${booking.status.toLowerCase()} booking.`);
    }

    if (!booking.notesWorkflow || booking.notesWorkflow.status !== 'PENDING_CUSTOMER_REVIEW') {
      throw new BadRequestError('This booking is not currently awaiting customer review.');
    }

    if (booking.notesWorkflow.version !== expectedVersion) {
      throw new ConflictError('The note was updated by another session. Please refresh and review the latest note.');
    }

    let finalNote = booking.notesWorkflow.originalExecutiveNote;
    if (action === 'EDITED') {
      if (!editedNote) {
        throw new BadRequestError('Edited note text is required when choosing to edit.');
      }
      finalNote = sanitizePlainNote(editedNote);
      if (finalNote.length < 3) {
        throw new BadRequestError('Edited note must be at least 3 characters.');
      }
      if (finalNote.length > 1000) {
        throw new BadRequestError('Edited note cannot exceed 1000 characters.');
      }
    }

    const newVersion = booking.notesWorkflow.version + 1;

    // Single Atomic Concurrency Update
    const updated = await BookingModel.findOneAndUpdate(
      {
        _id: bookingId,
        customerId: new mongoose.Types.ObjectId(customerId),
        status: { $nin: ['CANCELLED', 'COMPLETED'] },
        'notesWorkflow.status': 'PENDING_CUSTOMER_REVIEW',
        'notesWorkflow.version': expectedVersion,
      },
      {
        $set: {
          'notesWorkflow.status': 'CUSTOMER_SUBMITTED',
          'notesWorkflow.customerAction': action,
          'notesWorkflow.currentNote': finalNote,
          ...(action === 'EDITED' ? { 'notesWorkflow.customerEditedNote': finalNote } : {}),
          'notesWorkflow.customerRespondedAt': new Date(),
          'notesWorkflow.version': newVersion,
        },
        $push: {
          'notesWorkflow.history': {
            $each: [
              {
                actorId: new mongoose.Types.ObjectId(customerId),
                actorRole: 'CUSTOMER',
                action: action === 'EDITED' ? 'EDITED_BY_CUSTOMER' : 'ACCEPTED_BY_CUSTOMER',
                noteText: finalNote,
                timestamp: new Date(),
              },
            ],
            $slice: -50,
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new ConflictError('The note was modified by another user concurrently. Please refresh.');
    }

    // In-App Notification & Socket to assigned Executive
    try {
      if (updated.assignedExecutiveId) {
        await NotificationModel.create({
          userId: updated.assignedExecutiveId,
          title: 'Customer Reviewed Service Note',
          message: `Customer ${action === 'EDITED' ? 'edited' : 'accepted'} the instructions for booking #${(updated as any).bookingNumber || updated._id.toString().slice(-6).toUpperCase()}.`,
          type: 'IN_APP',
          category: 'BOOKING_UPDATE',
          status: 'SENT',
          metadata: { bookingId: updated._id.toString() },
          isRead: false,
        });

        emitToUser(updated.assignedExecutiveId.toString(), 'booking_notes_customer_responded', {
          bookingId: updated._id.toString(),
          status: 'CUSTOMER_SUBMITTED',
          customerAction: action,
          currentNote: finalNote,
          version: newVersion,
        });
      }

      // Also emit to executive portal role room for live table refresh
      emitToRole('EXECUTIVE', 'booking_notes_customer_responded', {
        bookingId: updated._id.toString(),
        status: 'CUSTOMER_SUBMITTED',
        customerAction: action,
        version: newVersion,
      });
    } catch (notifErr) {
      console.warn('[NotesWorkflow] Non-fatal notification error on customerRespondToNote:', notifErr);
    }

    return this.filterForCustomer(updated.notesWorkflow);
  }

  /**
   * 3. EXECUTIVE verifies the customer's response
   */
  async verifyNote(leadId: string, actorId: string, actorRole: string, expectedVersion: number) {
    if (!this.isWorkflowEnabled()) {
      throw new BadRequestError('Notes Approval Workflow feature is currently disabled.');
    }

    const booking = await BookingModel.findById(leadId);
    if (!booking) {
      throw new NotFoundError('Booking/lead not found');
    }
    if (['CANCELLED', 'COMPLETED'].includes(booking.status)) {
      throw new BadRequestError(`Cannot verify notes on a ${booking.status.toLowerCase()} booking.`);
    }
    if (!booking.notesWorkflow || booking.notesWorkflow.status !== 'CUSTOMER_SUBMITTED') {
      throw new BadRequestError(`Note cannot be verified in its current status (${booking.notesWorkflow?.status || 'NONE'}).`);
    }
    if (booking.notesWorkflow.version !== expectedVersion) {
      throw new ConflictError('The note was updated by another session. Please refresh.');
    }

    const newVersion = booking.notesWorkflow.version + 1;

    // Single Atomic Concurrency Update
    const updated = await BookingModel.findOneAndUpdate(
      {
        _id: leadId,
        status: { $nin: ['CANCELLED', 'COMPLETED'] },
        'notesWorkflow.status': 'CUSTOMER_SUBMITTED',
        'notesWorkflow.version': expectedVersion,
      },
      {
        $set: {
          'notesWorkflow.status': 'EXECUTIVE_VERIFIED',
          'notesWorkflow.verifiedAt': new Date(),
          'notesWorkflow.version': newVersion,
        },
        $push: {
          'notesWorkflow.history': {
            $each: [
              {
                actorId: new mongoose.Types.ObjectId(actorId),
                actorRole: actorRole || 'EXECUTIVE',
                action: 'VERIFIED_BY_EXECUTIVE',
                noteText: booking.notesWorkflow.currentNote,
                timestamp: new Date(),
              },
            ],
            $slice: -50,
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new ConflictError('The note was modified concurrently. Please refresh.');
    }

    return updated;
  }

  /**
   * 4. EXECUTIVE forwards the verified note to the partner workshop
   */
  async forwardNoteToPartner(leadId: string, actorId: string, actorRole: string, expectedVersion: number) {
    if (!this.isWorkflowEnabled()) {
      throw new BadRequestError('Notes Approval Workflow feature is currently disabled.');
    }

    const booking = await BookingModel.findById(leadId);
    if (!booking) {
      throw new NotFoundError('Booking/lead not found');
    }
    if (['CANCELLED', 'COMPLETED'].includes(booking.status)) {
      throw new BadRequestError(`Cannot forward notes on a ${booking.status.toLowerCase()} booking.`);
    }
    if (!booking.notesWorkflow || booking.notesWorkflow.status !== 'EXECUTIVE_VERIFIED') {
      throw new BadRequestError(`Note must be verified by an executive before forwarding (current: ${booking.notesWorkflow?.status || 'NONE'}).`);
    }
    if (booking.notesWorkflow.version !== expectedVersion) {
      throw new ConflictError('The note was updated by another session. Please refresh.');
    }

    const forwardedText = booking.notesWorkflow.currentNote;
    const newVersion = booking.notesWorkflow.version + 1;

    // Single Atomic Concurrency Update: Persists remarks onto the booking ONLY AT THIS MOMENT
    const updated = await BookingModel.findOneAndUpdate(
      {
        _id: leadId,
        status: { $nin: ['CANCELLED', 'COMPLETED'] },
        'notesWorkflow.status': 'EXECUTIVE_VERIFIED',
        'notesWorkflow.version': expectedVersion,
      },
      {
        $set: {
          'notesWorkflow.status': 'FORWARDED_TO_PARTNER',
          'notesWorkflow.forwardedAt': new Date(),
          'notesWorkflow.version': newVersion,
          remarks: forwardedText, // <--- PERSISTED ONLY ON FORWARD
        },
        $push: {
          'notesWorkflow.history': {
            $each: [
              {
                actorId: new mongoose.Types.ObjectId(actorId),
                actorRole: actorRole || 'EXECUTIVE',
                action: 'FORWARDED_TO_PARTNER',
                noteText: forwardedText,
                timestamp: new Date(),
              },
            ],
            $slice: -50,
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new ConflictError('The note was modified concurrently. Please refresh.');
    }

    // Sync with AssignmentModel notes if assignment exists
    try {
      await AssignmentModel.findOneAndUpdate(
        { bookingId: updated._id },
        { $set: { notes: forwardedText } },
        { upsert: false }
      );
    } catch (e) {
      console.error('Failed to sync assignment notes on forward:', e);
    }

    // REUSE EXISTING PARTNER NOTIFICATION CODE
    try {
      const partnerIdsToNotify = new Set<string>();
      if (updated.assignedPartnerId) {
        partnerIdsToNotify.add(updated.assignedPartnerId.toString());
      }
      const assignment = await AssignmentModel.findOne({ bookingId: updated._id });
      if (assignment && Array.isArray(assignment.assignedPartnerIds)) {
        for (const pId of assignment.assignedPartnerIds) {
          if (pId) partnerIdsToNotify.add(pId.toString());
        }
      }

      if (partnerIdsToNotify.size > 0) {
        const partners = await PartnerModel.find({ _id: { $in: Array.from(partnerIdsToNotify) } });
        for (const partner of partners) {
          if (partner && partner.userId) {
            emitToUser(partner.userId.toString(), 'lead_notes_updated', {
              bookingId: updated._id.toString(),
              notes: forwardedText,
            });
            emitToUser(partner.userId.toString(), 'booking_updated', {
              bookingId: updated._id.toString(),
              remarks: forwardedText,
            });
            await NotificationModel.create({
              userId: partner.userId,
              title: 'Lead Instructions Updated',
              message: `Executive updated instructions for booking #${(updated as any).bookingNumber || updated._id.toString().slice(-6).toUpperCase()}: "${forwardedText}"`,
              type: 'IN_APP',
              category: 'BOOKING_UPDATE',
              status: 'SENT',
              metadata: { bookingId: updated._id.toString() },
              isRead: false,
            });
          }
        }
      }
    } catch (notifErr) {
      console.warn('[NotesWorkflow] Non-fatal notification error on forwardNoteToPartner:', notifErr);
    }

    return updated;
  }

  /**
   * 5. EXECUTIVE resends note back to customer for another revision loop
   */
  async resendNoteToCustomer(
    leadId: string,
    actorId: string,
    actorRole: string,
    newNoteText: string,
    reason: string | undefined,
    expectedVersion: number
  ) {
    if (!this.isWorkflowEnabled()) {
      throw new BadRequestError('Notes Approval Workflow feature is currently disabled.');
    }

    const cleanNote = sanitizePlainNote(newNoteText);
    if (!cleanNote || cleanNote.length < 3) {
      throw new BadRequestError('Note text must be at least 3 characters.');
    }
    if (cleanNote.length > 1000) {
      throw new BadRequestError('Note text cannot exceed 1000 characters.');
    }

    const booking = await BookingModel.findById(leadId);
    if (!booking) {
      throw new NotFoundError('Booking/lead not found');
    }
    if (['CANCELLED', 'COMPLETED'].includes(booking.status)) {
      throw new BadRequestError(`Cannot resend notes on a ${booking.status.toLowerCase()} booking.`);
    }
    if (
      !booking.notesWorkflow ||
      !['PENDING_CUSTOMER_REVIEW', 'CUSTOMER_SUBMITTED', 'EXECUTIVE_VERIFIED', 'FORWARDED_TO_PARTNER'].includes(booking.notesWorkflow.status)
    ) {
      throw new BadRequestError(`Note cannot be resent in current state (${booking.notesWorkflow?.status || 'NONE'}).`);
    }
    if (booking.notesWorkflow.version !== expectedVersion) {
      throw new ConflictError('The note was updated by another session. Please refresh.');
    }

    const newVersion = booking.notesWorkflow.version + 1;

    // Single Atomic Concurrency Update
    const updated = await BookingModel.findOneAndUpdate(
      {
        _id: leadId,
        status: { $nin: ['CANCELLED', 'COMPLETED'] },
        'notesWorkflow.status': booking.notesWorkflow.status,
        'notesWorkflow.version': expectedVersion,
      },
      {
        $set: {
          'notesWorkflow.status': 'PENDING_CUSTOMER_REVIEW',
          'notesWorkflow.currentNote': cleanNote,
          'notesWorkflow.originalExecutiveNote': cleanNote,
          'notesWorkflow.customerEditedNote': null,
          'notesWorkflow.customerAction': null,
          'notesWorkflow.version': newVersion,
        },
        $push: {
          'notesWorkflow.history': {
            $each: [
              {
                actorId: new mongoose.Types.ObjectId(actorId),
                actorRole: actorRole || 'EXECUTIVE',
                action: 'RESENT_TO_CUSTOMER',
                noteText: cleanNote + (reason ? ` (Reason: ${sanitizePlainNote(reason)})` : ''),
                timestamp: new Date(),
              },
            ],
            $slice: -50,
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new ConflictError('The note was modified concurrently. Please refresh.');
    }

    // In-App Notification & Socket to Customer
    try {
      if (updated.customerId) {
        await NotificationModel.create({
          userId: updated.customerId,
          title: 'Revised Service Instructions for Review',
          message: `Executive has updated service instructions for booking #${(updated as any).bookingNumber || updated._id.toString().slice(-6).toUpperCase()}. Please review and confirm.`,
          type: 'IN_APP',
          category: 'BOOKING_UPDATE',
          status: 'SENT',
          metadata: { bookingId: updated._id.toString() },
          isRead: false,
        });

        emitToUser(updated.customerId.toString(), 'booking_notes_pending_review', {
          bookingId: updated._id.toString(),
          status: 'PENDING_CUSTOMER_REVIEW',
          currentNote: cleanNote,
          version: newVersion,
        });
      }
    } catch (notifErr) {
      console.warn('[NotesWorkflow] Non-fatal notification error on resendNoteToCustomer:', notifErr);
    }

    return updated;
  }

  /**
   * 6. EXECUTIVE sends an In-App reminder to customer (Rate limited to once per 6 hours)
   */
  async sendReminderToCustomer(leadId: string, actorId: string, actorRole: string) {
    if (!this.isWorkflowEnabled()) {
      throw new BadRequestError('Notes Approval Workflow feature is currently disabled.');
    }

    const booking = await BookingModel.findById(leadId);
    if (!booking) {
      throw new NotFoundError('Booking/lead not found');
    }
    if (['CANCELLED', 'COMPLETED'].includes(booking.status)) {
      throw new BadRequestError(`Cannot send reminder for a ${booking.status.toLowerCase()} booking.`);
    }
    if (!booking.notesWorkflow || booking.notesWorkflow.status !== 'PENDING_CUSTOMER_REVIEW') {
      throw new BadRequestError('Booking is not awaiting customer review.');
    }

    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    if (booking.notesWorkflow.lastReminderSentAt) {
      const elapsed = Date.now() - new Date(booking.notesWorkflow.lastReminderSentAt).getTime();
      if (elapsed < SIX_HOURS_MS) {
        const remainingHours = Math.ceil((SIX_HOURS_MS - elapsed) / (60 * 60 * 1000));
        throw new BadRequestError(`A reminder was already sent recently. You can send another reminder in ${remainingHours} hour(s).`);
      }
    }

    // Atomic update timestamp
    const updated = await BookingModel.findOneAndUpdate(
      {
        _id: leadId,
        'notesWorkflow.status': 'PENDING_CUSTOMER_REVIEW',
      },
      {
        $set: {
          'notesWorkflow.lastReminderSentAt': new Date(),
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new BadRequestError('Failed to send reminder or status changed.');
    }

    // In-App Notification (In-App only, NO WhatsApp)
    try {
      if (updated.customerId) {
        await NotificationModel.create({
          userId: updated.customerId,
          title: 'Reminder: Review Service Instructions',
          message: `Please review the workshop instructions for booking #${(updated as any).bookingNumber || updated._id.toString().slice(-6).toUpperCase()} to proceed with workshop scheduling.`,
          type: 'IN_APP',
          category: 'BOOKING_UPDATE',
          status: 'SENT',
          metadata: { bookingId: updated._id.toString() },
          isRead: false,
        });

        emitToUser(updated.customerId.toString(), 'booking_notes_reminder', {
          bookingId: updated._id.toString(),
          message: 'Please review your pending service instructions',
        });
      }
    } catch (notifErr) {
      console.warn('[NotesWorkflow] Non-fatal notification error on sendReminderToCustomer:', notifErr);
    }

    return { success: true, message: 'Reminder sent to customer successfully.' };
  }
}

export const notesWorkflowService = new NotesWorkflowService();
