import database from "../db/db.js";

export async function createVendorSalesTable() {
  try {
    const query = `CREATE TABLE IF NOT EXISTS vendor_sales (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      vendor_id UUID NOT NULL,
      order_id UUID NOT NULL,
      order_item_id UUID NOT NULL,
      product_id UUID NOT NULL,
      quantity INT NOT NULL,
      sale_amount DECIMAL(10,2) NOT NULL,
      commission_rate DECIMAL(5,2) NOT NULL,
      commission_amount DECIMAL(10,2) NOT NULL,
      vendor_earnings DECIMAL(10,2) NOT NULL,
      payout_status VARCHAR(20) DEFAULT 'pending' CHECK (payout_status IN ('pending', 'paid')),
      payout_id UUID,
      sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (payout_id) REFERENCES vendor_payouts(id) ON DELETE SET NULL
    );
    
    CREATE INDEX idx_vendor_sales_vendor_id ON vendor_sales(vendor_id);
    CREATE INDEX idx_vendor_sales_order_id ON vendor_sales(order_id);
    CREATE INDEX idx_vendor_sales_payout_status ON vendor_sales(payout_status);`;
    
    await database.query(query);
    console.log("Vendor Sales Table Created Successfully");
  } catch (error) {
    console.error("Failed To Create Vendor Sales Table.", error);
    process.exit(1);
  }
}