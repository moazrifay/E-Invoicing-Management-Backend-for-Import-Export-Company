const { XMLParser } = require("fast-xml-parser");

const xmlOptions = {
  ignoreAttributes: false,
  parseTagValue: true,
};

const parser = new XMLParser(xmlOptions);

/**
 * Parse XML content.
 */
const parseXmlContent = (xmlContent) => {
  try {
    const parsedXml = parser.parse(xmlContent);
    const doc = parsedXml.document;
    if (!doc) return null;

    let invoiceLines = [];
    if (doc.document) {
      let innerDocString = doc.document;

      // Replace encoded quote entities with literal quotes.
      if (typeof innerDocString === "string") {
        innerDocString = innerDocString
          .replace(/&#34;/g, '"')
          .replace(/&quot;/g, '"');
        const innerDoc = JSON.parse(innerDocString);
        invoiceLines = innerDoc.invoiceLines || [];
      } else {
        invoiceLines = innerDocString.invoiceLines || [];
      }
    }

    return {
      uuid: doc.uuid,
      internalId: doc.internalId || doc.internalID,
      dateTimeIssued: doc.dateTimeIssued,
      totalAmount: parseFloat(doc.total || doc.totalSales || 0),
      issuer: {
        name: doc.issuerName,
        id: String(doc.issuerId),
      },
      receiver: {
        name: doc.receiverName,
        id: String(doc.receiverId),
      },
      invoiceLines: invoiceLines.map((line) => ({
        description: line.description,
        quantity: parseFloat(line.quantity || 0),
        unitPrice: parseFloat(
          line.unitValue ? line.unitValue.amountEGP : line.unitPrice || 0,
        ),
        salesTotal: parseFloat(line.salesTotal || line.total || 0),
      })),
    };
  } catch (error) {
    console.error("❌ خطأ في تفكيك الـ XML:", error.message);
    return null;
  }
};

/**
 * Parse and validate normalized JSON content.
 */
const parseJsonContent = (jsonContent) => {
  try {
    const data =
      typeof jsonContent === "string" ? JSON.parse(jsonContent) : jsonContent;

    // Perform the minimum required invoice validation.
    if (!data.uuid || !data.invoiceLines) {
      return null;
    }
    return data;
  } catch (error) {
    console.error("❌ خطأ في قراءة الـ JSON:", error.message);
    return null;
  }
};

module.exports = {
  parseXmlContent,
  parseJsonContent,
};
