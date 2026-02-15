import database from "../db/db.js";

export async function createVendorsTable() {
  try {
    const query = `CREATE TABLE IF NOT EXISTS vendors (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID UNIQUE NOT NULL,
      store_name VARCHAR(255) NOT NULL,
      store_description TEXT,
      store_logo JSONB,
      business_email VARCHAR(255) NOT NULL,
      business_phone VARCHAR(50),
      business_address TEXT,
      tax_id VARCHAR(100),
      bank_account_number VARCHAR(100),
      bank_name VARCHAR(100),
      commission_rate DECIMAL(5,2) DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
      total_sales DECIMAL(12,2) DEFAULT 0,
      total_commission DECIMAL(12,2) DEFAULT 0,
      pending_balance DECIMAL(12,2) DEFAULT 0,
      paid_balance DECIMAL(12,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
      is_verified BOOLEAN DEFAULT false,
      verification_documents JSONB DEFAULT '[]'::JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      approved_at TIMESTAMP,
      approved_by UUID,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
    );
    
    CREATE INDEX idx_vendors_user_id ON vendors(user_id);
    CREATE INDEX idx_vendors_status ON vendors(status);`;
    
    await database.query(query);
    console.log("Vendors Table Created Successfully");
  } catch (error) {
    console.error("Failed To Create Vendors Table.", error);
    process.exit(1);
  }
}