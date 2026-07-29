import mongoose from 'mongoose';
import { PlanModel } from './src/modules/master-data/models/plan.model';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("No MONGODB_URI");
  
  await mongoose.connect(uri);
  
  await PlanModel.deleteMany({});
  
  await PlanModel.create([
    {
      name: "Basic Protection",
      slug: "basic",
      price: 2999,
      durationMonths: 12,
      features: [
        "2 Free Periodic Services",
        "Free 24/7 Roadside Assistance",
        "Basic Interior Cleaning",
        "Priority Customer Support"
      ],
      isPopular: false,
    },
    {
      name: "Pro Care",
      slug: "pro",
      price: 4999,
      originalPrice: 6999,
      durationMonths: 12,
      features: [
        "4 Free Periodic Services",
        "Free 24/7 Roadside Assistance",
        "Deep Interior & Exterior Cleaning",
        "1 Free Wheel Alignment",
        "Priority Customer Support"
      ],
      isPopular: true,
    }
  ]);
  
  console.log("Plans seeded successfully!");
  process.exit(0);
}

seed().catch(console.error);
