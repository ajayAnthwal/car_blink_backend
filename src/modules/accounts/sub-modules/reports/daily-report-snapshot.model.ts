import mongoose, { Schema, Document } from 'mongoose';

export enum REPORT_TYPE {
  GST = 'GST',
  INVOICE = 'INVOICE',
}

export interface IDailyReportSnapshot extends Document {
  reportType: REPORT_TYPE;
  reportDate: Date;
  reportData: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const DailyReportSnapshotSchema = new Schema<IDailyReportSnapshot>(
  {
    reportType: {
      type: String,
      enum: Object.values(REPORT_TYPE),
      required: [true, 'Report type is required'],
    },
    reportDate: {
      type: Date,
      required: [true, 'Report date is required'],
    },
    reportData: {
      type: Schema.Types.Mixed,
      required: [true, 'Report data is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate snapshot records
DailyReportSnapshotSchema.index({ reportType: 1, reportDate: 1 }, { unique: true });

export const DailyReportSnapshotModel = mongoose.model<IDailyReportSnapshot>(
  'DailyReportSnapshot',
  DailyReportSnapshotSchema
);
export default DailyReportSnapshotModel;
