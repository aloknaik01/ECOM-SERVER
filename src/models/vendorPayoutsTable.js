import database from "../db/db.js";

export async function createVendorPayoutsTable() {
  try {
    const query = `CREATE TABLE IF NOT EXISTS vendor_payouts (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      vendor_id UUID NOT NULL,
      amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
      payout_method VARCHAR(50) DEFAULT 'bank_transfer',
      transaction_id VARCHAR(255),
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP,
      processed_by UUID,
      notes TEXT,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
      FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_payouts_vendor_id ON vendor_payouts(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_payouts_status ON vendor_payouts(status);`;
    
    await database.query(query);
    console.log("Vendor Payouts Table Created Successfully");
  } catch (error) {
    console.error("Failed To Create Vendor Payouts Table.", error);
    process.exit(1);
  }
}