const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const API_BASE = 'http://localhost:8000/api';
const SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123';

async function fetchStats() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB.");

  // Get users directly from the DB
  const users = await mongoose.connection.collection('users').find({
    role: { $in: ['CUSTOMER', 'PARTNER', 'EXECUTIVE'] }
  }).toArray();

  const customer = users.find(u => u.role === 'CUSTOMER');
  const partner = users.find(u => u.role === 'PARTNER');
  const executive = users.find(u => u.role === 'EXECUTIVE');

  console.log("Found users:");
  if (customer) console.log("Customer:", customer.email || customer.phone);
  if (partner) console.log("Partner:", partner.email || partner.phone);
  if (executive) console.log("Executive:", executive.email || executive.phone);

  const getHeaders = (user) => {
    const token = jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: '1d' });
    return { Authorization: `Bearer ${token}` };
  };

  // --- CUSTOMER DASHBOARD ---
  if (customer) {
    console.log("\n--- CUSTOMER DASHBOARD ---");
    const headers = getHeaders(customer);
    try {
      const [bookingsRes, paymentsRes, warrantiesRes] = await Promise.all([
        axios.get(`${API_BASE}/bookings`, { headers }).catch(e => { console.log('Bookings err:', e.response?.data || e.message); return { data: { data: [] } } }),
        axios.get(`${API_BASE}/payments`, { headers }).catch(e => { console.log('Payments err:', e.response?.data || e.message); return { data: { data: [] } } }),
        axios.get(`${API_BASE}/warranties`, { headers }).catch(e => { console.log('Warranties err:', e.response?.data || e.message); return { data: { data: [] } } })
      ]);

      const allBookings = bookingsRes.data?.data || bookingsRes.data?.docs || bookingsRes.data || [];
      const allPayments = paymentsRes.data?.data || paymentsRes.data?.docs || paymentsRes.data || [];
      const allWarranties = warrantiesRes.data?.data || warrantiesRes.data?.docs || warrantiesRes.data || [];

      console.log(`Raw Data Count -> Bookings: ${allBookings.length}, Payments: ${allPayments.length}, Warranties: ${allWarranties.length}`);

      const activeBookingsCount = allBookings.filter(b => ['PENDING', 'QUOTED', 'ACCEPTED', 'IN_PROGRESS'].includes(b.status)).length;
      const completedServicesCount = allBookings.filter(b => b.status === 'COMPLETED').length;
      const totalSpentAmount = allPayments.filter(p => p.status === 'SUCCESS').reduce((sum, p) => sum + (p.amount || 0), 0);
      const activeWarrantiesCount = allWarranties.filter(w => w.status === 'ACTIVE').length;

      console.log("STAT CARDS:");
      console.log(`- Active Bookings: ${activeBookingsCount}`);
      console.log(`- Completed Services: ${completedServicesCount}`);
      console.log(`- Total Spent: ₹${totalSpentAmount.toLocaleString('en-IN')}`);
      console.log(`- Active Warranties: ${activeWarrantiesCount}`);

      const statusCounts = allBookings.reduce((acc, booking) => {
        const status = booking.status || 'PENDING';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      console.log("PIE CHART (Bookings by Status):", statusCounts);
      
    } catch (err) {
      console.error("Customer error:", err.message);
    }
  }

  // --- PARTNER DASHBOARD ---
  if (partner) {
    console.log("\n--- PARTNER DASHBOARD ---");
    const headers = getHeaders(partner);
    try {
      const [jobsRes, bidsRes, profileRes, leadsRes] = await Promise.all([
        axios.get(`${API_BASE}/partner/jobs`, { headers }).catch(e => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/partner/bids`, { headers }).catch(e => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/partner/profile`, { headers }).catch(e => ({ data: { data: null } })),
        axios.get(`${API_BASE}/partner/leads`, { headers }).catch(e => ({ data: { data: [] } }))
      ]);

      const allJobs = jobsRes.data?.data || jobsRes.data?.docs || jobsRes.data || [];
      const allBids = bidsRes.data?.data || bidsRes.data?.docs || bidsRes.data || [];
      const profileData = profileRes.data?.data || profileRes.data || null;
      const allLeads = leadsRes.data?.data || leadsRes.data?.docs || leadsRes.data || [];
      
      console.log(`Raw Data Count -> Jobs: ${allJobs.length}, Bids: ${allBids.length}, Leads: ${allLeads.length}`);
      
      const activeJobsCount = allJobs.filter(j => ['NOT_STARTED', 'IN_PROGRESS'].includes(j.status)).length;
      const completedJobsCount = allJobs.filter(j => j.status === 'COMPLETED').length;
      const totalEarned = allJobs.filter(j => j.status === 'COMPLETED').reduce((sum, j) => sum + (j.finalAmount || 0), 0);
      const avgRating = profileData?.rating || 0;

      console.log("STAT CARDS:");
      console.log(`- Active Jobs: ${activeJobsCount}`);
      console.log(`- Completed Jobs: ${completedJobsCount}`);
      console.log(`- Total Earnings: ₹${totalEarned.toLocaleString('en-IN')}`);
      console.log(`- Average Rating: ${avgRating.toFixed(1)}`);

      const statusCounts = allJobs.reduce((acc, job) => {
        const status = job.status || 'NOT_STARTED';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, { NOT_STARTED: 0, IN_PROGRESS: 0, COMPLETED: 0 });
      console.log("BAR CHART (Jobs by Status):", statusCounts);
      
    } catch (err) {
      console.error("Partner error:", err.message);
    }
  }

  // --- EXECUTIVE DASHBOARD ---
  if (executive) {
    console.log("\n--- EXECUTIVE DASHBOARD ---");
    const headers = getHeaders(executive);
    try {
      const [followUpsRes, escalationsRes, leadsRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/followups`, { headers }).catch(e => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/admin/escalations`, { headers }).catch(e => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/admin/leads`, { headers }).catch(e => ({ data: { data: [] } }))
      ]);

      const fUps = followUpsRes.data?.data || followUpsRes.data?.docs || followUpsRes.data || [];
      const esc = escalationsRes.data?.data || escalationsRes.data?.docs || escalationsRes.data || [];
      const lds = leadsRes.data?.data || leadsRes.data?.docs || leadsRes.data || [];

      console.log(`Raw Data Count -> FollowUps: ${fUps.length}, Escalations: ${esc.length}, Leads: ${lds.length}`);

      const todayStr = new Date().toDateString();
      const leadsToday = lds.filter(l => new Date(l.createdAt).toDateString() === todayStr).length;
      const openEsc = esc.filter(e => ['OPEN', 'IN_PROGRESS'].includes(e.status)).length;
      const awaitingAssg = lds.filter(l => ['PENDING', 'QUOTED'].includes(l.status)).length;

      console.log("STAT CARDS:");
      console.log(`- Total Leads Today: ${leadsToday}`);
      console.log(`- Open Escalations: ${openEsc}`);
      console.log(`- Pending Follow-ups: ${fUps.length}`);
      console.log(`- Leads Awaiting Assignment: ${awaitingAssg}`);

      const leadStatusCounts = lds.reduce((acc, lead) => {
        const status = lead.status || 'PENDING';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, { PENDING: 0, QUOTED: 0, ACCEPTED: 0, IN_PROGRESS: 0, COMPLETED: 0, CANCELLED: 0 });
      console.log("BAR CHART (Leads by Status):", leadStatusCounts);
      
      const openEscalationsList = esc.filter(e => ['OPEN', 'IN_PROGRESS'].includes(e.status));
      const sevCounts = openEscalationsList.reduce((acc, e) => {
        const sev = e.severity || 'LOW';
        acc[sev] = (acc[sev] || 0) + 1;
        return acc;
      }, { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 });
      console.log("PIE CHART (Escalations by Severity):", sevCounts);

    } catch (err) {
      console.error("Executive error:", err.message);
    }
  }

  process.exit(0);
}

fetchStats();
