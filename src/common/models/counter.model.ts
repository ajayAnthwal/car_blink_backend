import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const CounterModel = mongoose.model<ICounter>('Counter', CounterSchema);

/**
 * Atomically increments and retrieves the next sequential number for a given counter key.
 * 100% race-condition safe across multiple concurrent requests.
 */
export async function getNextSequence(sequenceName: string): Promise<number> {
  const counter = await CounterModel.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}
