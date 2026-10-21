const path = require("path");
const {
  parseXmlContent,
  parseJsonContent,
} = require("../Service/xml&jsonparser");
const {
  insertInvoiceData,
  getUserSummary,
  getSummaryByDateRange,
  getInvoiceStats,
} = require("../model/accountingModel");
const db = require("../config/db");
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/;

const importLocalInvoices = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "برجاء تحديد رفـع ملف XML أو JSON واحد على الأقل.",
      });
    }

    const results = { imported: 0, skipped: 0, errors: 0 };

    for (const file of req.files) {
      const fileContent = file.buffer.toString("utf-8");
      const fileExt = path.extname(file.originalname).toLowerCase();
      let invoiceData = null;

      // Route each uploaded file to the parser that matches its extension.
      if (fileExt === ".xml") {
        invoiceData = parseXmlContent(fileContent);
      } else if (fileExt === ".json") {
        invoiceData = parseJsonContent(fileContent);
      }

      // Validate and persist the parsed invoice.
      if (invoiceData && invoiceData.invoiceLines) {
        const saveResult = await insertInvoiceData(
          userId,
          invoiceData,
          file.originalname,
        );

        if (saveResult.isDuplicate) {
          results.skipped++;
        } else {
          results.imported++;
        }
      } else {
        // Count malformed files without persisting partial invoice data.
        results.errors++;
      }
    }

    res.status(200).json({
      success: true,
      message: `تمت معالجة ${req.files.length} ملف/ملفات بنجاح!`,
      data: results,
    });
  } catch (error) {
    console.error("Import Error:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while importing invoices.",
    });
  }
};

// Soft-delete an invoice by UUID.
const softDeleteInvoice = async (req, res) => {
  try {
    const userId = req.user.id;
    const { uuid } = req.params;

    if (!UUID_PATTERN.test(uuid)) {
      return res.status(400).json({
        success: false,
        message: "The invoice UUID is invalid.",
      });
    }

    const query = `
      UPDATE invoices 
      SET deleted_at = NOW() 
      WHERE uuid = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING id, uuid;
    `;

    const result = await db.query(query, [uuid, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "الفاتورة غير موجودة أو تم حذفها سابقاً",
      });
    }

    res.status(200).json({
      success: true,
      message: "تم حذف الفاتورة (Soft Delete) بنجاح",
      deletedInvoice: result.rows[0],
    });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while deleting the invoice.",
    });
  }
};

// Return a complete summary of the user's invoices and products.
const getSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // Load the summary for the authenticated user.
    const summary = await getUserSummary(userId);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Summary Error:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while loading the summary.",
    });
  }
};

// Return invoice statistics for a requested date range.
const getSummaryByDate = async (req, res) => {
  try {
    const userId = req.user.id;
    // Read the start and end dates from the URL query.
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message:
          "برجاء تحديد تاريخ البداية (startDate) وتاريخ النهاية (endDate)",
      });
    }

    if (
      !DATE_PATTERN.test(startDate) ||
      !DATE_PATTERN.test(endDate) ||
      Number.isNaN(Date.parse(startDate)) ||
      Number.isNaN(Date.parse(endDate)) ||
      new Date(startDate) > new Date(endDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "The date range is invalid.",
      });
    }

    // Query the model for the requested date range.
    const summary = await getSummaryByDateRange(userId, startDate, endDate);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Date Summary Error:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while loading the date summary.",
    });
  }
};

const getInvoiceStats2 = async (req, res) => {
  try {
    const userId = req.user.id; // Read the user ID from the verified token.
    const stats = await getInvoiceStats(userId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get Invoice Stats Error:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while loading invoice statistics.",
    });
  }
};

// Export the controller functions.
module.exports = {
  importLocalInvoices,
  softDeleteInvoice,
  getSummary,
  getSummaryByDate,
  getInvoiceStats2,
};
