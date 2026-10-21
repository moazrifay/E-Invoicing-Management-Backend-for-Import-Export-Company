// models/accountingModel.js
const db = require("../config/db"); // PostgreSQL connection pool.

// =========================================================
// 1. Insert invoice, company, and item data in one transaction.
// =========================================================
const insertInvoiceData = async (userId, invoiceData, filePath) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // -------------------------------------------------------------
    // A. Create or retrieve the issuer company.
    // -------------------------------------------------------------
    const issuerTaxId = invoiceData.issuer?.id || invoiceData.issuerId;
    const issuerName = invoiceData.issuer?.name || invoiceData.issuerName;

    const issuerQuery = `
      INSERT INTO companies (user_id, tax_id, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, tax_id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `;
    const issuerRes = await client.query(issuerQuery, [
      userId,
      issuerTaxId,
      issuerName,
    ]);
    const issuerId = issuerRes.rows[0].id;

    // -------------------------------------------------------------
    // B. Create or retrieve the receiver company.
    // -------------------------------------------------------------
    const receiverTaxId = invoiceData.receiver?.id || invoiceData.receiverId;
    const receiverName = invoiceData.receiver?.name || invoiceData.receiverName;

    const receiverQuery = `
      INSERT INTO companies (user_id, tax_id, name)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, tax_id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `;
    const receiverRes = await client.query(receiverQuery, [
      userId,
      receiverTaxId,
      receiverName,
    ]);
    const receiverId = receiverRes.rows[0].id;

    // -------------------------------------------------------------
    // C. Create the invoice header.
    // -------------------------------------------------------------
    const uuid = invoiceData.uuid;
    const internalId = invoiceData.internalID || invoiceData.internalId;
    const dateTimeIssued =
      invoiceData.dateTimeIssued || invoiceData.dateTimeReceived;
    const totalAmount =
      invoiceData.totalAmount ||
      invoiceData.totalSalesAmount ||
      invoiceData.netAmount ||
      0;

    const invoiceQuery = `
      INSERT INTO invoices (
        user_id, uuid, internal_id, issuer_id, receiver_id,
        invoice_date, total_amount, pdf_path
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (uuid) DO NOTHING
      RETURNING id;
    `;
    const invoiceRes = await client.query(invoiceQuery, [
      userId,
      uuid,
      internalId,
      issuerId,
      receiverId,
      dateTimeIssued,
      totalAmount,
      filePath,
    ]);

    if (invoiceRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { isDuplicate: true };
    }

    const invoiceId = invoiceRes.rows[0].id;

    // -------------------------------------------------------------
    // D. Store each invoice item.
    // -------------------------------------------------------------
    if (invoiceData.invoiceLines && invoiceData.invoiceLines.length > 0) {
      for (const line of invoiceData.invoiceLines) {
        const cleanName = line.description;
        const quantity = parseFloat(line.quantity || 0);
        const unitType = line.unitType || "KGM";
        const unitPrice = parseFloat(
          line.unitValue ? line.unitValue.amountEGP : line.unitPrice || 0,
        );
        const totalPrice = parseFloat(
          line.salesTotal ||
            line.total ||
            line.netTotal ||
            quantity * unitPrice,
        );

        const productQuery = `
          INSERT INTO products (clean_name)
          VALUES ($1)
          ON CONFLICT (clean_name) DO UPDATE SET clean_name = EXCLUDED.clean_name
          RETURNING id;
        `;
        const productRes = await client.query(productQuery, [cleanName]);
        const productId = productRes.rows[0].id;

        const itemQuery = `
          INSERT INTO invoice_items (
            invoice_id, product_id, quantity, unit_type, unit_price, total_price
          )
          VALUES ($1, $2, $3, $4, $5, $6);
        `;
        await client.query(itemQuery, [
          invoiceId,
          productId,
          quantity,
          unitType,
          unitPrice,
          totalPrice,
        ]);
      }
    }

    await client.query("COMMIT");
    return { isDuplicate: false, invoiceId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// =========================================================
// 2. Return a complete summary of invoices and products.
// =========================================================
const getUserSummary = async (userId) => {
  // 1. Calculate the active invoice total for the user.
  const totalInvoicesQuery = `
    SELECT COALESCE(SUM(total_amount), 0) AS all_invoices_total
    FROM invoices
    WHERE user_id = $1 AND deleted_at IS NULL;
  `;
  const totalInvoicesRes = await db.query(totalInvoicesQuery, [userId]);

  // 2. Aggregate product sales totals and quantities.
  const productsSummaryQuery = `
    SELECT 
      p.clean_name AS product_name,
      COALESCE(SUM(item.quantity), 0) AS total_quantity_sold,
      COALESCE(SUM(item.total_price), 0) AS total_product_revenue,
      COUNT(DISTINCT inv.id) AS total_invoices_count
    FROM invoice_items item
    JOIN invoices inv ON inv.id = item.invoice_id
    JOIN products p ON p.id = item.product_id
    WHERE inv.user_id = $1 AND inv.deleted_at IS NULL
    GROUP BY p.clean_name
    ORDER BY total_product_revenue DESC;
  `;
  const productsSummaryRes = await db.query(productsSummaryQuery, [userId]);

  return {
    all_invoices_total: parseFloat(totalInvoicesRes.rows[0].all_invoices_total),
    products_count: productsSummaryRes.rows.length,
    products_list: productsSummaryRes.rows,
  };
};

// =========================================================
// 3. Return invoice and product summaries for a date range.
// =========================================================
const getSummaryByDateRange = async (userId, startDate, endDate) => {
  // 1. Calculate the active invoice total and count in the range.
  const totalInvoicesQuery = `
    SELECT 
      COALESCE(SUM(total_amount), 0) AS filtered_invoices_total,
      COUNT(id) AS invoices_count
    FROM invoices
    WHERE user_id = $1 
      AND deleted_at IS NULL
      AND invoice_date >= $2::timestamp 
      AND invoice_date <= $3::timestamp;
  `;
  const totalInvoicesRes = await db.query(totalInvoicesQuery, [
    userId,
    startDate,
    endDate,
  ]);

  // 2. Aggregate product sales statistics for the same range.
  const productsSummaryQuery = `
    SELECT 
      p.clean_name AS product_name,
      COALESCE(SUM(item.quantity), 0) AS total_quantity_sold,
      COALESCE(SUM(item.total_price), 0) AS total_product_revenue,
      COUNT(DISTINCT inv.id) AS total_invoices_count
    FROM invoice_items item
    JOIN invoices inv ON inv.id = item.invoice_id
    JOIN products p ON p.id = item.product_id
    WHERE inv.user_id = $1 
      AND inv.deleted_at IS NULL
      AND inv.invoice_date >= $2::timestamp 
      AND inv.invoice_date <= $3::timestamp
    GROUP BY p.clean_name
    ORDER BY total_product_revenue DESC;
  `;
  const productsSummaryRes = await db.query(productsSummaryQuery, [
    userId,
    startDate,
    endDate,
  ]);

  return {
    start_date: startDate,
    end_date: endDate,
    filtered_invoices_total: parseFloat(
      totalInvoicesRes.rows[0].filtered_invoices_total,
    ),
    invoices_count: parseInt(totalInvoicesRes.rows[0].invoices_count, 10),
    products_count: productsSummaryRes.rows.length,
    products_list: productsSummaryRes.rows,
  };
};

// Return the user's active invoice count and total amount.
const getInvoiceStats = async (userId) => {
  const query = `
    SELECT 
      COUNT(id) AS total_count,
      COALESCE(SUM(total_amount), 0) AS total_sum,
      COALESCE(ARRAY_AGG(internal_id) FILTER (WHERE internal_id IS NOT NULL), '{}') AS invoice_numbers
    FROM invoices
    WHERE user_id = $1 AND deleted_at IS NULL;
  `;

  const result = await db.query(query, [userId]);

  return {
    total_count: parseInt(result.rows[0].total_count, 10),
    total_sum: parseFloat(result.rows[0].total_sum),
    invoice_numbers: result.rows[0].invoice_numbers, // Returns an array of invoice numbers.
  };
};

module.exports = {
  insertInvoiceData,
  getUserSummary,
  getSummaryByDateRange,
  getInvoiceStats,
};
