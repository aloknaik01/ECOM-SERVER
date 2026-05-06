import database from "./src/db/db.js";

async function check() {
  try {
    const today = new Date();
    const todayDate = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split("T")[0];
  
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    console.log("Q1");
    await database.query(`SELECT SUM(total_price) FROM orders WHERE paid_at IS NOT NULL`);
    
    console.log("Q2");
    await database.query(`SELECT COUNT(*) FROM users WHERE role = 'User'`);
    
    console.log("Q3");
    await database.query(`SELECT order_status, COUNT(*) FROM orders WHERE paid_at IS NOT NULL GROUP BY order_status`);
    
    console.log("Q4");
    await database.query(`SELECT SUM(total_price) FROM orders WHERE created_at::date = $1 AND paid_at IS NOT NULL`, [todayDate]);
    
    console.log("Q5");
    await database.query(`SELECT SUM(total_price) FROM orders WHERE created_at::date = $1 AND paid_at IS NOT NULL`, [yesterdayDate]);
    
    console.log("Q6");
    await database.query(`
      SELECT TO_CHAR(created_at, 'Mon YYYY') AS month,
      DATE_TRUNC('month', created_at) as date,
      SUM(total_price) as totalsales
      FROM orders WHERE paid_at IS NOT NULL
      GROUP BY month, date
      ORDER BY date ASC
    `);

    console.log("Q7");
    await database.query(`
      SELECT p.name,
      p.images->0->>'url' AS image,
      p.category,
      p.ratings,
      SUM(oi.quantity) AS total_sold
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN orders o ON o.id = oi.order_id
      WHERE o.paid_at IS NOT NULL
      GROUP BY p.name, p.images, p.category, p.ratings
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    console.log("Q8");
    await database.query(`SELECT SUM(total_price) AS total FROM orders WHERE paid_at IS NOT NULL AND created_at BETWEEN $1 AND $2`, [currentMonthStart, currentMonthEnd]);

    console.log("Q9");
    await database.query(`SELECT name, stock FROM products WHERE stock <= 5`);

    console.log("Q10");
    await database.query(`SELECT SUM(total_price) AS total FROM orders WHERE paid_at IS NOT NULL AND created_at BETWEEN $1 AND $2`, [previousMonthStart, previousMonthEnd]);

    console.log("Q11");
    await database.query(`SELECT COUNT(*) FROM users WHERE created_at >= $1 AND role = 'User'`, [currentMonthStart]);

    console.log("All queries ran successfully!");
  } catch(e) {
    console.error("ERROR:", e);
  } finally {
    process.exit(0);
  }
}
check();
